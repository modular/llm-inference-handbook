---
sidebar_position: 1
description: Explore the LLM inference infrastructure stack, from GPUs and serving runtimes to scaling, routing, observability, and the choice to build or buy.
keywords:
    - LLM infrastructure
    - LLM inference infrastructure
    - LLM inference stack
    - LLM infrastructure solutions
    - Inference platforms
    - Self-hosted LLM inference
---

import LinkList from '@site/src/components/LinkList';

# What is LLM inference infrastructure?

LLM infrastructure is the set of hardware, software, and operational practices
used to train, fine-tune, evaluate, and serve LLMs.

This page focuses on **LLM inference infrastructure**: the part that runs
trained models in production. It includes the GPUs that execute the model, the
runtime that generates tokens, and the systems for deployment, scaling,
routing, and monitoring. Together, they keep models available as traffic
changes and help you meet your latency, throughput, and cost targets.

## Why general-purpose cloud stacks fall short

Standard cloud-native infrastructure was designed for stateless CPU services.
Serving LLMs breaks that model in several ways:

- **GPUs can’t be shared the way CPUs can.** A container can’t take "half a
  GPU" for a burst. A model with multi-gigabyte weights either fits on the
  device or it doesn’t. Idle GPUs are expensive, so over-provisioning to avoid
  cold starts raises costs.
- **Replicas are stateful.** Each replica holds a memory-heavy
  [KV cache](/llm-inference-basics/how-does-llm-inference-work/#what-is-kv-cache)
  for active requests. With prefix caching, replicas can retain cache for
  reuse across requests, so which replica handles a request affects latency.
  Round-robin load balancing can miss reusable prefixes on other replicas.
- **Requests aren’t uniform.** Work depends on prompt and output length, and
  one request may generate 20 tokens while another generates 4,000. Counting
  requests per second tells you little about actual GPU load.
- **Startup is slow.** LLM containers are large. Image pulls and weight loading
  make reactive autoscaling arrive after the traffic spike has already caused
  timeouts, and users notice because they’re waiting on a response in real
  time.

These gaps are why LLM inference needs a purpose-built stack.

## The LLM inference stack

The requirements above determine how the layers of the inference stack work
together. The sections below cover each part of the stack at a high level, with
links to related handbook pages.

### Compute hardware

The hardware layer mainly includes GPUs and other accelerators, memory,
interconnects, and storage. LLM inference, especially the decode phase, is
bound by memory capacity and bandwidth more than raw FLOPS. The key hardware
questions are how much
high-bandwidth memory (HBM) each device has and how fast devices can talk to
each other.

Here are two examples to show why memory is the limiting factor:

- Llama 3.1 70B in BF16 needs about **140 GB** just for weights. A
  single NVIDIA H100 has **80 GB** of HBM, so the model must be split across at
  least two H100 GPUs before any request is served.
- The KV cache for the same 70B model uses roughly **320 KB per token**. At a
  128K-token context, one request can hold about **40 GB** of cache on top of
  the weights.

Because models are split across GPUs, interconnect bandwidth also becomes a
serving bottleneck.

When [choosing GPUs](/getting-started/choosing-the-right-gpu/) for your model
size and latency target, consider:

- Whether to run [on-prem](/getting-started/on-prem-llms/), in your own cloud
  account with [BYOC](/getting-started/bring-your-own-cloud/), or on a
  managed platform.
- How to source GPUs across
  [regions and providers](/infrastructure-and-operations/multi-cloud-and-cross-region-inference/)
  when a single region can’t meet demand, especially during traffic peaks.

### Serving runtime

The serving runtime, also called the inference engine or inference framework, is
the software that loads model weights onto GPUs, accepts requests, and generates
tokens. Examples include vLLM, SGLang, and MAX.

The runtime determines how efficiently each GPU serves requests. Runtimes
differ in which
[optimization techniques](/inference-optimization/) they support and how well
they implement them, such as
[continuous batching](/inference-optimization/static-dynamic-continuous-batching/),
[PagedAttention](/inference-optimization/pagedattention/),
[prefix caching](/inference-optimization/prefix-caching/),
[quantization](/model-preparation/llm-quantization/),
[speculative decoding](/inference-optimization/speculative-decoding/), and
[parallelism](/inference-optimization/data-tensor-pipeline-expert-hybrid-parallelism/).

For more information, see
[choosing the right inference framework](/getting-started/choosing-the-right-inference-framework/).

### Model packaging and deployment

This layer turns model weights into a deployable artifact. It includes the
container image, the model files, any
[fine-tuned](/model-preparation/llm-fine-tuning/) adapters, the runtime
configuration, and the serving code that wraps the model in an API.

Packaging choices affect cold-start time. LLM container images are large, and
model weights can run from tens of gigabytes to over a terabyte for
trillion-parameter models. This means pulling an image and loading weights onto
a fresh node can take a long time before the first request is served. Decisions
made here (e.g., whether weights ship inside the image or stream from object
storage) determine how quickly the orchestration layer can add capacity.

### Orchestration and scaling

The orchestration layer decides how many replicas run, where they run, and when
to add or remove them. In most production deployments this is Kubernetes plus
a GPU-aware autoscaler.

LLM workloads don’t fit the assumptions behind standard autoscaling. Cold
starts are a good example: provisioning a GPU node, pulling the image, and
loading weights can take a long time. Capacity added in reaction to a
traffic spike often arrives after the spike has already caused timeouts. The
usual scaling signals don’t help either: CPU utilization says little about a
GPU-bound workload, and GPU utilization reports a device as busy even when it
has room for a larger batch. Neither reliably tells the autoscaler when to
add capacity.

Placement is another example. A single replica may span several GPUs or nodes,
and with
[prefill-decode disaggregation](/inference-optimization/prefill-decode-disaggregation/)
the prefill and decode phases of a request run on separate GPU pools that scale
independently. The orchestrator has to place these pools with the right
interconnect between them, keep KV cache transfer fast, and scale each pool on
the right signal.

For more information, see the following sections:

- [Fast scaling](/infrastructure-and-operations/fast-scaling/) explains the
  cold-start problem and which metrics to scale on.
- [Distributed inference](/infrastructure-and-operations/distributed-inference/)
  covers running one model across multiple GPUs, nodes, and regions.
- [Multi-cloud and cross-region inference](/infrastructure-and-operations/multi-cloud-and-cross-region-inference/)
  covers placing capacity across providers for availability, compliance, and
  cost.

### Gateway and routing

The gateway is the entry point for application traffic. It exposes an API
(usually an [OpenAI-compatible](/model-interaction/openai-compatible-api/) or
[Anthropic-compatible](/model-interaction/anthropic-compatible-api/) endpoint),
enforces authentication and rate limits, and decides which replica should
handle each request.

Routing decisions can affect how much work the model needs to do. Because each
replica holds KV cache state, sending a request to a replica with a matching
prompt prefix in cache can avoid recomputing thousands of prompt tokens.
[Inference routing](/inference-optimization/inference-routing/) covers
prefix-aware, cache-aware, and prefill/decode-aware routing strategies. When an
application chains several models together, the gateway may also coordinate
[multi-model inference pipelines](/infrastructure-and-operations/multi-model-inference-pipelines/).

### Observability

Observability collects metrics, logs, traces, and events across the stack so you
can see what the system is doing and why. General application metrics such as
request rate and error rate still matter, but LLM inference requires metrics
that standard dashboards don’t track:

- Time to first token (TTFT) and inter-token latency (ITL)
- Tokens per second, per replica and per request
- Queue wait time and in-flight request count
- KV cache utilization and prefix-cache hit rate
- GPU memory usage and out-of-memory events

Without these measurements, diagnosing low GPU utilization or rising TTFT
becomes guesswork. See
[LLM inference metrics](/llm-inference-basics/llm-inference-metrics/) for more
information about the key latency and throughput metrics.

The observability layer should also support **cost-to-serve management**, which
teams often overlook until the GPU bill arrives. It means tracking the cost of
each workload and tuning model choice, hardware, batching, routing, and scaling
policies to meet cost targets. This is important because inference cost is
ongoing and grows with token usage or provisioned GPU capacity. A model that’s
affordable at launch can become the largest line item once traffic grows.
Without per-workload cost data, you can’t tell which model, tenant, or scaling
policy is responsible.

For more information, see
[LLM observability](/infrastructure-and-operations/comprehensive-observability/).

### Inference operations

Inference operations keep the stack running as models, traffic, and teams
change. These practices include CI/CD for model releases, canary and blue-green
rollouts, automatic rollback, access control, cost attribution, and cleanup of
idle GPUs.

These workflows help a deployment remain reliable through repeated model
updates.
[InferenceOps and management](/infrastructure-and-operations/inferenceops-and-management/)
describes the workflows, and
[build and maintenance cost](/infrastructure-and-operations/build-and-maintenance-cost/)
covers what it takes to staff and sustain them.

### Security and compliance

Security and compliance apply across the stack. Alongside standard application
controls, each layer has LLM-specific responsibilities:

- **Gateway**: authentication, per-tenant rate limits, and input and output
  filtering for prompt injection, jailbreaks, and leaked secrets.
- **Orchestration**: placing replicas in regions that satisfy data residency and
  cross-border transfer rules such as GDPR, and isolating tenants at the cluster
  or node level.
- **Packaging and runtime**: controlling who can access model weights, adapters,
  and fine-tuning data, and verifying artifact provenance before deployment.
- **Observability**: logging prompts and outputs for debugging without storing
  sensitive data longer than policy allows.
- **Operations**: role-based access control for production models, audit logs
  for every deployment, and approval workflows for model changes.

Teams often choose self-hosting to keep prompts and data inside their own
environment. Every layer needs controls that maintain that boundary.

## Inference infrastructure solutions: build, buy, or both

There are three common ways to provision inference infrastructure.

| Approach                       | What you manage                                      | Best for                                                                    | Trade-off                                                            |
|--------------------------------|------------------------------------------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------------|
| **Serverless LLM APIs**        | Nothing below the API call                           | Prototypes, low or spiky volume, proprietary frontier models                | Per-token cost at scale, limited control, data leaves your VPC       |
| **Managed inference platform** | Models and application code; platform runs the stack | Teams that self-host open models but don’t want to staff every layer        | Platform fit and pricing; some layers are opinionated                |
| **Self-built on Kubernetes**   | Every layer                                          | Teams with strong infrastructure engineering and strict customization needs | Highest engineering and maintenance cost, slowest time to production |

Another way to see the difference is to map each approach onto the inference
stack. The more layers you manage yourself, the more control you get and the
more engineering you take on.

<figure>
  <img className="theme-logo-light" src={require('./img/inference-solutions-stack.png').default} alt="" />
  <img className="theme-logo-dark" src={require('./img/inference-solutions-stack-dark.png').default} alt="" />
  <figcaption>
    <b>Figure 1.</b> Which layers of the inference stack you manage under each
    approach.
  </figcaption>
</figure>

The decision usually comes down to volume, control, and staffing. The sections
below describe what each approach looks like in practice.

### Serverless LLM APIs

You send requests to a hosted endpoint and pay per token. The provider picks
the hardware, runs the serving runtime, and scales capacity, so you never see
the stack. This category includes proprietary model APIs such as OpenAI and
Anthropic, as well as serverless endpoints for open models from providers such
as Together AI and Fireworks AI. It’s often the fastest way to start, but can
cost more than a well-utilized dedicated deployment at high, steady volume.

For a full comparison, see
[serverless vs. self-hosted LLM inference](/getting-started/serverless-vs-self-hosted-llm-inference/).

### Managed inference platforms

You bring your own model weights and application code, and the platform runs the
serving runtime, routing, scaling, and observability for you. Note that a
platform isn’t the same as a serving runtime such as vLLM or MAX. The platform
runs a runtime on your behalf, along with the layers around it.

Managed inference platforms usually come in two forms.

- With a hosted platform, the provider supplies
the GPUs and your requests and data go to them, as with dedicated deployments
from Fireworks AI or Together AI.
- With a [BYOC](/getting-started/bring-your-own-cloud/) platform, the provider
  manages
GPUs inside your own cloud account, so cloud infrastructure stays with you while
the platform still handles the stack.

---

If you’re weighing these options for your own deployment, we’re happy to talk
it through. We've built an inference platform that covers the runtime,
routing, scaling, and observability layers described above, so you can run
open models on your own GPUs without staffing every layer yourself.

<div style={{ margin: '3rem 0' }}>
<a className="btn-outline" href="https://www.modular.com/request-demo?utm_source=llm_handbook">Talk to us</a>
</div>

### Self-built on Kubernetes

You assemble every layer yourself: GPU nodes, an open serving runtime such as
vLLM, SGLang, or MAX, an autoscaler, a router, observability, and release
tooling. This gives you maximum control and is the usual choice for
teams with customization needs that no platform meets. It also carries the
most engineering and ongoing maintenance work.
[Build and maintenance cost](/infrastructure-and-operations/build-and-maintenance-cost/)
covers what that work involves.

## FAQs

### Do I need my own LLM infrastructure, or can I just use an API?

Start with an API if your volume is low and your data can leave your
environment. Move to your own infrastructure when token costs at scale exceed
the cost of running open models, when compliance rules apply, or when you need
control over latency and customization. Many teams run both: APIs for some
workloads and self-hosted models for others.

### Can I run LLM inference on my existing Kubernetes cluster?

Yes, and most self-hosted deployments do. Kubernetes handles the generic parts
well: scheduling Pods onto GPU nodes, rolling out new versions, and restarting
failed replicas. What it doesn’t provide is anything LLM-aware. You still need
to add an autoscaler that scales on request concurrency rather than CPU, a
router that understands KV cache locality instead of simply balancing
round-robin, and a fast path for loading model weights onto new nodes. Those
pieces are where most of the engineering effort goes.

<LinkList>

## Additional resources

- [Deploying Disaggregated LLM Inference Workloads on Kubernetes](https://developer.nvidia.com/blog/deploying-disaggregated-llm-inference-workloads-on-kubernetes/)
- [Why LLM Inference Needs a New Kind of Router - Part 1](https://www.modular.com/blog/why-llm-inference-needs-a-new-kind-of-router-part-1)
</LinkList>
