---
sidebar_position: 4
description: Fast scaling enables AI systems to handle dynamic LLM inference workloads while minimizing latency and cost.
keywords:
    - Scalable LLM inference, fast scaling, scalability, LLM inference scaling, LLM scaling law
    - LLM cold starts, Kubernetes cold starts, LLM container cold starts
    - Concurrency, QPS, CPU and GPU utilization
    - Self-hosted LLM challenges
---

# Fast scaling

Running LLM inference in production is a very different game from training
models. Unlike training, which is batch-based and predictable, inference is
driven by real-time user demand. That demand is often bursty, hard to predict,
and unforgiving of latency or downtime.

This means the system needs to scale up quickly during traffic spikes and scale
down to zero when idle to save costs. This kind of elasticity is fundamental to
efficiency.

However, many organizations treat inference like training: they pre-allocate
fixed GPU capacity through long-term commitments. This often leads to:

- **Over-provisioning**: Wasted GPU capacity, high idle costs.
- **Under-provisioning**: Dropped requests, latency spikes, and poor user
  experience.
- **Inflexible budgets**: Rigid spending that doesn't adapt to real usage
  patterns.

## Why serverless isn’t a silver bullet

The scaling problem seems familiar, one that serverless computing solved years
ago. Platforms like AWS Lambda made it easy to scale to demand, but serverless
doesn’t map well to AI workloads. Here’s why:

- **No GPU support**: Most serverless platforms don’t support GPUs. This isn't
  merely a technical oversight; it's rooted in architectural and practical
  considerations.
- **GPUs can’t be sliced easily**: GPUs are powerful and highly parallel, but
  they aren't as flexible as CPUs for handling many inference tasks across
  different models at the same time.
- **High cost of idle GPUs**: They're the high-performance sports cars of the
  computing world, exceptional for specific tasks but costly to maintain,
  especially if not utilized continuously.

## The cold start problem

Inference workloads need infrastructure that can scale quickly, manage costs,
and stay performant. A fundamental challenge in scaling is the cold start.

In the context of deploying LLMs in containers, a cold start occurs when a
Kubernetes node has never previously run a given deployment. As a result, the
container image is not cached locally, and all image layers must be pulled and
initialized from scratch.

This issue presents itself in three different stages:

1. **Cloud provisioning**: This step involves the time it takes for the cloud
   provider to allocate a new instance and attach it to the Kubernetes cluster.
   Depending on the instance type and availability, this can take anywhere from
   30 seconds to several minutes, or even hours for high-demand GPUs like NVIDIA
   A100 and H100.
2. **Container image pulling**: LLM images are significantly larger and more
   complex than typical Python job images, due to numerous dependencies and
   custom libraries. Despite claims of multi-gigabit bandwidth by cloud
   providers, actual image download speeds are often much slower. As a result,
   pulling images can take three to five minutes.
3. **Model loading**. The time required to load the model depends heavily on its
   size. LLMs introduce significant delays due to their billions of parameters.
   Key bottlenecks include:

   - **Slow downloads from model hubs**: Platforms like Hugging Face aren't
     optimized for high-throughput, multi-part downloads, making the retrieval
     of large model files time-consuming.
   - **Sequential data flow**: Model files are transferred through multiple
     hops: **remote storage → local disk → memory → GPU**. There is little or no
     parallelization between these steps. Each step adds latency, particularly
     for large files that are difficult to cache or stream.
   - **Lack of on-demand streaming**: Model files must be fully downloaded and
     written to disk before inference can begin. This introduces additional I/O
     operations and delays startup.

Each phase of the cold start issue demands specific strategies to minimize
delays.

## Scaling metrics

Scaling infrastructure for LLM inference requires more than simply reacting to
system load. Choosing the right metrics is critical for achieving responsive,
efficient, and cost-effective scaling.

- **CPU utilization**. It’s simple and comes with clear thresholds, but it
  doesn’t reflect real load for Python-based workloads. The Global Interpreter
  Lock (GIL) limits CPU parallelism, especially on multi-core machines, making
  this metric misleading for scaling decisions.
- **GPU utilization**. A more relevant metric in theory, but inaccurate in
  practice. Tools like `nvml` report GPUs as “utilized” if any kernel runs
  during a sample window—even briefly. This doesn’t account for batching or
  actual throughput, leading to premature scale-up or false confidence in
  capacity.
- **QPS (queries per second)**. Widely used in traditional web services, but
  less useful for LLM inference. Generative requests vary greatly in size and
  compute cost, depending on input length and tokens generated. As a result, QPS
  lacks consistency and is hard to tune for auto-scaling.
- **Concurrency**. This metric, which represents the number of active requests
  either queued or being processed, is an ideal measure for reflecting system
  load. Concurrency is easy to configure based on batch size and provides a
  direct correlation with actual system demands, allowing for precise scaling.
  However, for concurrency to work, you need support from a service framework to
  automatically instrument concurrency as a metric and serve it as a scaling
  signal for the deployment platform.
