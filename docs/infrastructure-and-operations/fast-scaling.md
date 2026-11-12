---
sidebar_position: 5
description: Learn how LLM autoscaling works, what causes LLM cold starts, how to reduce them, and which metrics to scale on.
keywords:
    - Scalable LLM inference, fast scaling, scalability, LLM inference scaling, LLM autoscaling
    - LLM cold starts, Kubernetes cold starts, LLM container cold starts
    - Concurrency, QPS, CPU and GPU utilization
    - Self-hosted LLM challenges
---

import LinkList from '@site/src/components/LinkList';

# LLM autoscaling and cold starts

LLM autoscaling is the ability of an LLM inference system to add or remove
replicas as demand changes. Ideally, this should be done without long cold
starts or paying for idle capacity. It mainly depends on two things: how
quickly a new replica can start serving requests, and how accurately the
autoscaler knows when to add or remove one.

## Why fast autoscaling is important

Running LLM inference in production is a very different game from training
models. Training jobs are usually planned in advance. Inference is driven by
real-time user demand, which is often bursty, hard to predict, and unforgiving
of latency or downtime.

This means the system needs to scale up quickly during traffic spikes and scale
down, sometimes to zero, when idle to save costs. This kind of elasticity is
fundamental to efficiency.

However, many organizations treat inference like training: they pre-allocate
fixed GPU capacity through long-term commitments. This often leads to:

- **Over-provisioning**: Wasted GPU capacity, high idle costs.
- **Under-provisioning**: Dropped requests, latency spikes, and poor user
  experience.
- **Inflexible budgets**: Rigid spending that doesn't adapt to real usage
  patterns.

## The cold start problem

A cold start is the delay between the moment an autoscaler decides to add a
replica and the moment that replica can serve the first request. For LLMs, this
delay can range from tens of seconds to many minutes. It's the main reason LLM
inference is hard to scale quickly.

The worst case is when a new replica lands on a fresh Kubernetes node. Nothing
is cached locally, neither the container image nor the model, so everything must
be provisioned, pulled, loaded, and initialized from scratch. This process
includes four main stages:

1. **Cloud provisioning**. The cloud provider allocates a new instance and
   attaches it to the cluster. GPU drivers and a running device plugin, often
   managed by GPU Operator, must make the GPUs available to the scheduler before
   it can place GPU Pods. For GPU nodes this commonly takes several minutes.
   For high-demand GPUs like the NVIDIA H200 or B200, it can take much longer,
   or fail entirely when capacity is scarce.
2. **Container image pulling**. LLM serving images are much larger than typical
   Python service images. They bundle CUDA libraries, an inference engine,
   PyTorch, NCCL, and many other dependencies. Such images can reach 10–20 GB.
   Real download speeds are usually well below the advertised network bandwidth,
   and layers must also be decompressed and extracted. Pulling an uncached image
   can take several minutes.
3. **Model loading**. Load time depends heavily on model size, storage location,
   and loading strategy. For example, a 70B model in BF16 has approximately 140
   GB of raw weights. Even at a sustained throughput of 1 GB/s, reading 140 GB
   takes over two minutes. Key bottlenecks in the default setup include:
    - **Slow model downloads**. When model weights are stored remotely,
      downloading them can be a significant bottleneck. Model hubs like
      [Hugging Face](https://huggingface.co/docs/hub/models-downloading) now
      support chunked, parallel downloads, but fetching 100+ GB over the
      network is still slow. It also makes an external service a dependency
      at exactly the moment you need capacity. If multiple replicas download the
      same weights simultaneously, they can also compete for network and storage
      bandwidth.
    - **Sequential data flow**. In a basic loading setup, model files pass
      through several hops: remote storage → local disk → CPU memory → GPU.
      Downloading all files before loading begins leaves little overlap between
      network, disk, and GPU transfers. Writing every file to disk and reading
      it back also adds an extra round of disk I/O.
4. **Engine initialization**. In addition to loading weights into GPU memory,
   the inference engine may need to allocate KV cache memory, initialize GPU
   communication, compile or select optimized kernels, run warm-up operations,
   and capture CUDA graphs before it can serve requests efficiently. On a fresh
   node with no cache it can take minutes, sometimes longer than loading the
   weights themselves. This is why faster weight loading alone often improves
   end-to-end startup less than expected.

When these stages run largely in sequence, the total cold start is roughly
their sum.

## How to reduce LLM cold starts

Each stage of a cold start has different fixes. The table below summarizes the
most common ones.

| **Stage**               | **Main cause of delay**                               | **How to reduce it**                                                                                   |
|-------------------------|-------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| Cloud provisioning      | Waiting for the cloud provider to allocate a GPU node | Keep warm standby nodes, mix reserved and on-demand capacity, and source GPUs across clouds or regions |
| Container image pulling | Large images with many layers                         | Slim images, keep weights out of the image, pre-pull or cache images, lazy-load image layers           |
| Model loading           | Large weights moved through slow, sequential hops     | Cache weights close to the GPU, use parallel downloads, and stream weights directly to GPU memory      |
| Engine initialization   | CUDA graph capture, kernel compilation, warm-up       | Cache compiled artifacts, tune warm-up work, and keep a small pool of warm replicas                    |

The following sections explain each in more detail.

### Cloud provisioning

You can't make a cloud provider allocate GPUs faster, but you can avoid waiting
for allocation on the critical path:

- **Keep warm capacity**: Keep a small buffer of idle GPU nodes to avoid
  provisioning or loaded replicas that only need traffic routed to them.
  This costs some idle spend but removes a slow stage.
- **Mix reserved and on-demand capacity**: Use reserved GPUs for baseline
  traffic and on-demand or spot GPUs for bursts.
- **Source GPUs from multiple pools**: If one region or cloud is out of
  capacity, another may not be. See
  [multi-cloud and cross-region inference](/infrastructure-and-operations/multi-cloud-and-cross-region-inference/).

### Container image pulling

- **Keep images lean**: Remove build tools, unused libraries, and test files.
  Order layers so that rarely changing dependencies are cached.
- **Keep model weights out of the image**: Baking weights into an image makes
  every pull huge and ties model updates to image rebuilds. Store weights
  separately and load them at startup.
- **Pre-pull or cache images**: Pre-pull images onto GPU nodes ahead of time,
  for example with a DaemonSet or a node image that already contains them, or
  use a registry mirror inside the cluster.
- **Lazy-load image layers**: Snapshotters such as
  [stargz-snapshotter](https://github.com/containerd/stargz-snapshotter) and
  [SOCI](https://github.com/awslabs/soci-snapshotter) let a container start
  before the full image is downloaded, fetching files as they are needed.

### Model loading

- **Place or cache weights near the GPU**: Store weights in object storage in
  the same region or on a shared high-throughput file system. A local NVMe cache
  lets later replicas on the same node skip a remote download.
- **Download in parallel**: Split large weight files into chunks and fetch them
  concurrently to use the full network bandwidth.
- **Stream weights to the GPU**: Instead of writing to disk first, stream
  tensors from storage into GPU memory while the download is still in progress.
- **Use fast-loading formats**: Formats like `safetensors` support memory
  mapping and avoid the slow deserialization of older pickle-based checkpoints.
- **Load fewer bytes**: Use the smallest model that meets your quality bar, and
  consider [quantization](/model-preparation/llm-quantization/). Smaller
  weights load faster and use less GPU memory.

### Engine initialization

Some initialization work, especially kernel compilation, can be reused when
the model, software, and hardware match. Other steps can be tuned for faster
startup:

- **Cache compiled artifacts**: Some engines compile parts of the model
  with `torch.compile` and save the results to a local cache directory. On a
  fresh node these caches are empty, so the work runs again. Persist the cache
  directories on a shared volume, or bake them into the node image, so new
  replicas can reuse them. Reuse requires compatible model and engine versions,
  compilation settings, GPU type, and software stack.
- **Tune CUDA graph capture**: Engines record CUDA graphs at startup to speed
  up decoding later. Recording fewer of them shortens startup but can make
  decoding a bit slower. Disabling CUDA graphs entirely can shorten startup
  but may lower decode throughput, so benchmark the tradeoff for your workload.
- **Keep replicas warm instead of restarting them**: Engine features such as
  vLLM sleep mode can release most GPU memory while keeping the process
  alive. With weights backed up in CPU memory, waking can be faster than a
  full cold start when you park idle replicas.

To see where startup time goes, check the engine startup logs.

## Scaling metrics

The scaling metric decides when the autoscaler adds or removes replicas. Generic
metrics like CPU utilization, GPU utilization, and QPS often misread LLM load.
Concurrency and engine-level signals, such as queue depth and KV cache usage,
track real demand much more closely.

| **Metric**                     | **What it measures**                              | **Note**                                                           |
|--------------------------------|---------------------------------------------------|--------------------------------------------------------------------|
| CPU utilization                | How busy the CPU is                               | Inference runs on the GPU, and the Python GIL caps CPU parallelism |
| GPU utilization                | Whether any GPU kernel ran during a sample window | Reports "busy" even when the GPU has plenty of spare capacity      |
| QPS (queries per second)       | Request rate                                      | Requests vary widely in input and output length                    |
| Concurrency                    | Requests queued or being processed                | Needs the serving framework to expose it as a metric               |
| Queue depth (waiting requests) | Requests the engine can't schedule yet            | Reacts after saturation starts, so pair it with concurrency        |
| KV cache usage                 | How full the KV cache is                          | Depends on sequence lengths; best as a secondary signal            |

- **CPU utilization**: It's simple and comes with clear thresholds, but it
  doesn't reflect real load for LLM workloads. The heavy work happens on the
  GPU, and the Python Global Interpreter Lock (GIL) limits CPU parallelism,
  making this metric misleading for scaling decisions.
- **GPU utilization**: A more relevant metric in theory, but inaccurate in
  practice. Tools based on NVML report a GPU as "utilized" if any kernel runs
  during a sample window, even briefly. This doesn't account for batching or
  actual throughput, leading to premature scale-up or false confidence in
  capacity.
- **QPS (queries per second)**: Widely used in traditional web services, but
  less useful for LLM inference. Generative requests vary greatly in size and
  compute cost, depending on input length and tokens generated. As a result, QPS
  lacks consistency and is hard to tune for autoscaling.
- **Concurrency**: This metric, which represents the number of active requests
  either queued or being processed, is one of the best measures of system load.
  You can set the target based on the batch size a replica handles well, and it
  correlates directly with actual demand. However, the serving framework must
  expose concurrency as a metric so the deployment platform can use it as a
  scaling signal.
- Engine-level signals: Many inference engines expose metrics such as the
  **queue depth** and **KV cache usage**. A growing queue or a nearly
  full KV cache means the replica is saturated and new requests will see higher
  [TTFT](/llm-inference-basics/llm-inference-metrics/). See
  [LLM observability](/infrastructure-and-operations/comprehensive-observability/)
  for how to collect these metrics.

## Scaling policies

The scaling metric tells the autoscaler how loaded the system is. Scaling
policies decide how quickly and how far it reacts. For LLM inference, they need
to account for cold starts.

### Scaling up

A new replica only adds capacity after startup finishes. If a cold start
takes five minutes, the replicas you already have must absorb any traffic growth
during those five minutes. The longer your cold start, the earlier you need to
scale:

- **Leave headroom**: Set the scaling target below a replica's real capacity.
  For example, if a replica handles 32 concurrent requests well, target 20–24.
  The gap should cover the traffic growth you expect during one cold start.
- **Scale up quickly**: By default, the Kubernetes Horizontal Pod Autoscaler
  (HPA) applies no stabilization window to scale-up, so it adds replicas as soon
  as the metric crosses the target. Keep it that way, and make scale-down the
  cautious direction.
- **Scale ahead of known traffic**: If traffic follows a daily or weekly
  pattern, raise the minimum replica count before the expected peak, for
  example with a scheduled job, instead of waiting for the metric to react.

### Scaling down

- **Use a cooldown period**: Wait before removing replicas so a short dip in
  traffic doesn't trigger a scale-down followed by another cold start. In
  Kubernetes, the
  [HPA scale-down stabilization window](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/#stabilization-window)
  (5 minutes by default) serves this purpose.
- **Drain in-flight requests**: LLM responses can stream for many seconds or
  minutes. Stop sending new requests to a replica and let existing streams
  finish before you shut it down. In Kubernetes,
  [the default termination grace period](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination-flow)
  is 30 seconds, so raise `terminationGracePeriodSeconds` to cover your longest
  responses.

### Scaling to zero

Scaling to zero helps remove idle GPU costs, but the next request may pay the
full cold-start penalty. It works well for internal tools, batch jobs, and
models with occasional traffic. For user-facing applications with latency SLOs,
keep at least one warm replica, or accept slow first responses after idle
periods.

Historically, the standard Kubernetes HPA couldn't
scale a Deployment to zero on its own. Starting with Kubernetes 1.37,
HPA supports `minReplicas: 0` as a beta feature that's enabled by default. Two
limitations matter for LLM inference:

- **It needs an object or external metric**: Once no Pods are running, there
  are no Pod metrics to read, so the HPA can't scale back up based on resource
  metrics like CPU or memory. The API server rejects a scale-to-zero HPA that
  only uses resource metrics. Use a signal that exists outside the replicas,
  such as the length of a request queue.
- **It doesn't hold requests**: Kubernetes Services don't buffer requests while
  no Pods are ready. Queue-based workloads, like batch inference, work well
  because jobs wait in the queue. For HTTP inference endpoints, you still need a
  component that accepts and holds incoming requests while the first replica
  starts, such as the Knative activator or the KEDA HTTP add-on.

<LinkList>

## Additional resources

- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
- [Agentic Autoscaling through Worker-Pool Orchestration for LLM-driven Text Classification in Cloud Computing Environments](https://arxiv.org/abs/2609.14898)
- [Decomposing Predictive Kubernetes Autoscaling for Large Language Model Serving Under Long Startup Delays](https://arxiv.org/abs/2609.20874)
</LinkList>
