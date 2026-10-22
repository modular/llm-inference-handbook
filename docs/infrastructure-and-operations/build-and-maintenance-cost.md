---
sidebar_position: 5
description: Self-hosted LLM inference cost goes far beyond GPUs. See what drives inference cost, from GPU compute to engineering, maintenance, and talent.
keywords:
    - Inference cost
    - LLM inference cost, AI inference cost
    - Self-hosted LLM cost, LLM infrastructure cost
---

import LinkList from '@site/src/components/LinkList'; import
InferenceCostCalculator from '@site/src/components/InferenceCostCalculator';

# Inference cost

Inference cost is what you pay to run a trained LLM and serve requests in
production. With a hosted API, that’s mostly a per-token price. With self-hosted
inference, it’s the full cost of owning or renting the infrastructure and
operating the model yourself.

The GPU bill is usually the most visible part. For example, AWS lists an 8×H100
`p5.48xlarge` instance at about \$47.76 per hour as a Capacity Block in US East,
or roughly \$34,900 when extrapolated to 730 hours at that rate. The
engineering, staffing, and maintenance costs around that node are harder to
see, and they often decide whether self-hosting pays off.

## How to measure inference cost

Teams usually compare cost using one of three units:

- **Cost per million tokens**: The standard unit for API pricing. For
  self-hosted models, divide the GPU cost per hour by the millions of tokens the
  deployment processes per hour.
- **Cost per request**: Useful when a single user request triggers multiple
  model calls, such as in agents or
  [multi-model pipelines](/infrastructure-and-operations/multi-model-inference-pipelines/).
- **Cost per GPU-hour**: The raw infrastructure rate. It ignores how well you
  actually use the GPUs, so you can’t compare it directly with API pricing.

A simple starting point is the GPU-only cost per million tokens:

$$
\text{Cost per Million Tokens}
= \frac{\text{GPU Cost per Hour} \times 1{,}000{,}000}
       {\text{Tokens per Second} \times 3{,}600}
$$

Suppose the AWS 8×H100 node above sustains 10,000 tokens per second under real
traffic. It processes 36 million tokens per hour, so the cost is about \$1.33
per million tokens. If it serves requests at that rate for only 30% of the time
(about 3,000 tokens per second averaged over all hours), the same node costs
about \$4.42 per million tokens.

Use sustained
[throughput](/llm-inference-basics/llm-inference-metrics/#throughput) under
production traffic, not peak benchmark numbers. Throughput depends on the model,
hardware, batching strategy, and latency targets, so measure it with your own
workload. See
[LLM performance benchmarks](/inference-optimization/llm-performance-benchmarks/)
for how to do that. Count input and output tokens consistently with the API
prices you compare against.

## Hidden costs of self-hosted inference

The formula above only counts GPUs. The table below lists the main cost
categories for self-hosted LLM inference. Everything beyond GPU compute is easy
to overlook, and with a hosted API, most of these rows collapse into one
per-token price.

| Cost category           | What it includes                                                                 | What drives it                                            |
|-------------------------|----------------------------------------------------------------------------------|-----------------------------------------------------------|
| **GPU compute**         | On-demand, reserved, or spot GPU instances                                       | GPU type, GPU count, pricing model, region                |
| **Idle capacity**       | Paid GPU time spent waiting for requests, already included in GPU compute        | Traffic variability, scaling speed, scale-to-zero support |
| **Storage and network** | Model weight storage, container registries, cross-region data transfer           | Model size, number of replicas and regions                |
| **Engineering build**   | Serving runtime, autoscaling, routing, and observability setup                   | How much of the stack you build yourself                  |
| **Maintenance**         | Framework upgrades, new model support, CUDA and driver updates, security patches | Release pace of models and frameworks                     |
| **Operations**          | On-call, incident response, capacity planning                                    | Uptime targets, number of deployments                     |
| **Talent**              | Hiring, training, and retaining specialized engineers                            | Market rates, team size                                   |

To estimate inference cost more accurately, start from the total cost of
running the deployment:

$$
\text{Total Cost}
= \text{GPU Cost} + \text{Infra Cost} + \text{Ops Cost}
+ \text{Eng and Talent Cost} + \cdots
$$

Then divide by the tokens served over the same period, such as a month:

$$
\text{Cost per Million Tokens}
= \frac{\text{Total Cost} \times 1{,}000{,}000}{\text{Tokens Served}}
$$

The calculator below starts with one GPU at \$2 per hour and a sustained
throughput of 2,500 tokens per second at full load. Change the inputs to match
your deployment.

<InferenceCostCalculator />

The same GPU can have very different economics depending on average throughput.
At low throughput, you pay for idle capacity. At high throughput, the GPU bill
and other fixed costs spread across many more tokens.

The following sections take a closer look at what makes up inference cost.

## GPU compute cost

GPU compute is often the largest line item in self-hosted inference cost. The
hourly price depends on GPU type, cloud provider, region, and commitment level
(on-demand, reserved, or spot).

The following AWS Capacity Block prices for US East show how much the rate
changes across GPU generations:

| Instance           | GPUs   | Price per instance-hour | Price per GPU-hour |
|--------------------|--------|-------------------------|--------------------|
| `p5.48xlarge`      | 8×H100 | \$47.76                 | \$5.97             |
| `p5en.48xlarge`    | 8×H200 | \$63.16                 | \$7.90             |
| `p6-b200.48xlarge` | 8×B200 | \$113.67                | \$14.21            |

*Source: [AWS EC2 Capacity Blocks
pricing](https://aws.amazon.com/ec2/capacityblocks/pricing/), October 2026.
Prices can change, so check the provider before you plan a budget.*

A newer GPU costs more per hour but may cost less per token if it delivers
enough extra throughput. See
[choosing the right GPU](/getting-started/choosing-the-right-gpu/) and
[calculating GPU memory for LLMs](/getting-started/calculating-gpu-memory-for-llms/)
to size hardware for your model.

### Why GPU capacity use matters

You pay for a GPU whether it’s serving requests or sitting idle. In this simple
example, capacity use means the share of paid hours spent serving at the assumed
full-load throughput. Using the \$5.97 H100 rate above:

| Share of paid hours serving | Effective cost per busy GPU-hour |
|-----------------------------|----------------------------------|
| 100%                        | \$5.97                           |
| 70%                         | \$8.53                           |
| 30%                         | \$19.90                          |
| 5%                          | \$119.40                         |

Most teams provision for peak traffic, so GPUs sit idle during quieter hours.
[Fast scaling](/infrastructure-and-operations/fast-scaling/) and scale-to-zero
reduce that waste, and some inference optimization techniques like
[continuous batching](/inference-optimization/static-dynamic-continuous-batching/)
get more work out of each GPU while it’s running.

## Storage and network cost

Storage and network costs are usually smaller than the GPU bill, but they grow
with model size and the number of places you serve from. LLM weights are large.
For example, a 70B-parameter model in FP16 takes about 140 GB, before you add
container images that bundle CUDA libraries and the serving runtime.

These costs typically come from:

- **Model storage**: Keeping weights, fine-tuned variants, and older versions in
  object storage or a model registry.
- **Container registries**: Storing and pulling large images that include CUDA
  libraries and the serving runtime.
- **Data transfer**: Copying weights to every new replica, and moving data
  between regions or clouds. Cloud providers usually charge for cross-region and
  internet egress traffic.
- **Fast local storage**: Provisioning high-throughput disks or caches so new
  replicas load weights quickly.

Storage and network performance also affect GPU cost. If a new replica takes
minutes to download weights, you either wait through a
[cold start](/infrastructure-and-operations/fast-scaling/#the-cold-start-problem)
or keep extra GPUs running as a buffer. Each region you add in a
[multi-cloud or cross-region setup](/infrastructure-and-operations/multi-cloud-and-cross-region-inference/#what-data-transfer-costs-come-with-multi-cloud-inference)
needs another copy of the weights and more data transfer.
[Quantization](/model-preparation/llm-quantization/) reduces both by shrinking
the weights.

## Engineering cost

Building self-hosted LLM inference infrastructure takes significant engineering
work before the first production request, and most of it has nothing to do with
the model itself. A production setup typically involves:

- Provisioning high-performance GPUs, which are often scarce and limited to
  certain regions
- Managing CUDA version compatibility and driver dependencies
- Configuring [autoscaling](/infrastructure-and-operations/fast-scaling/),
  concurrency control, and scale-to-zero behavior
- Applying inference optimization techniques such as
  [prefix caching](/inference-optimization/prefix-caching/) and
  [prefill-decode disaggregation](/inference-optimization/prefill-decode-disaggregation/)
- Integrating LLMs into complex AI systems, such as pre-processing,
  post-processing, and custom APIs
- Setting up
  [observability](/infrastructure-and-operations/comprehensive-observability/)
  for GPU monitoring, request tracing, and failure detection
- Handling model-specific behaviors like streaming, caching, and
  [routing](/inference-optimization/inference-routing/)
- Running
  [distributed inference](/infrastructure-and-operations/distributed-inference/)
  when a model is too large for a single GPU

[General-purpose cloud-native stacks](/infrastructure-and-operations/what-is-llm-inference-infrastructure/#why-general-purpose-cloud-stacks-fall-short)
weren’t designed for these needs. Force-fitting LLM workloads onto them often
leads to lower performance and longer lead times.

Even when a team pulls it off, there’s an opportunity cost. Every week spent
setting up infrastructure is a week not spent improving models or shipping
product features. For AI teams, this cost is just as real as the GPU bill.

## Maintenance cost

Maintenance cost grows with the release pace of models and frameworks, and in
LLM inference that pace is very fast. New model architectures and runtime
versions arrive every few months, and new GPU generations roughly every year.

Many AI stacks pin model runtimes such as PyTorch, vLLM, or Transformers to
fixed versions. This helps make deployments reproducible and keeps the runtime
compatible with other infrastructure components. It simplifies deployment, but
creates ongoing costs:

- **Slower model adoption**: New models or framework versions outside the
  supported list need testing, image rebuilds, and compatibility checks before
  you can deploy them.
- **Growing tech debt**: Each skipped upgrade widens the gap between your stack
  and community or vendor updates, which makes the next upgrade harder.
- **Competitive lag**: Slower LLM deployment means your team falls behind teams
  that can try the latest models right away.

On top of framework upgrades, teams also handle CUDA and driver updates,
security patches, and migrations to new GPU types. Consistent
[InferenceOps practices](/infrastructure-and-operations/inferenceops-and-management/)
reduce this work, but someone still has to own it.

## Talent cost

Specialized talent is often the most underestimated part of inference cost.
Running LLM infrastructure requires engineers who understand GPUs, Kubernetes,
ML frameworks, and distributed systems. These skills rarely come together in
one person, and they’re in high demand.

Hiring is only the start. A production service with 24/7 uptime targets needs an
on-call rotation, which means more than one engineer must understand the full
stack. Training them and keeping that knowledge current as the stack changes is
an ongoing investment.

## How to reduce inference cost

Most inference cost savings come from using GPUs more efficiently and paying
only for the capacity you need. Common levers include:

- **Right-size hardware**: Match GPU type and count to the model and traffic.
  See [choosing the right GPU](/getting-started/choosing-the-right-gpu/).
- **Quantize the model**:
  [LLM quantization](/model-preparation/llm-quantization/) reduces memory use,
  which may let you serve a model on fewer or smaller GPUs.
- **Batch requests**:
  [Continuous batching](/inference-optimization/static-dynamic-continuous-batching/)
  can raise throughput per GPU.
- **Reuse computation**:
  [Prefix caching](/inference-optimization/prefix-caching/) avoids recomputing
  shared context.
  [KV cache offloading](/inference-optimization/kv-cache-offloading/) can retain
  reusable cache blocks outside GPU memory.
- **Speed up decoding**:
  [Speculative decoding](/inference-optimization/speculative-decoding/)
  can reduce target-model decoding steps by verifying multiple draft tokens in
  one pass.
- **Scale with demand**:
  [Fast scaling](/infrastructure-and-operations/fast-scaling/) and scale-to-zero
  cut idle GPU time.
- **Use cheaper capacity**:
  [Multi-cloud and cross-region inference](/infrastructure-and-operations/multi-cloud-and-cross-region-inference/)
  lets you run workloads wherever GPUs are available and cost-effective.
- **Move non-urgent work offline**:
  [Offline batch inference](/inference-optimization/offline-batch-inference/)
  runs large jobs on cheaper or idle capacity.
- **Track cost per feature**:
  [Observability](/infrastructure-and-operations/comprehensive-observability/)
  shows which models, tenants, or features drive spend.

<ContactCallout>

If you’d rather not build and staff every layer yourself, we’re happy to talk
through your deployment. We’ve built an inference platform that handles
scaling, optimization, and observability, so you can run open models on your
own GPUs and keep inference cost under control.

</ContactCallout>

## FAQs

### Is self-hosting an LLM cheaper than using an API?

Self-hosting an LLM can be cheaper than an API at high, steady volume, because
the fixed GPU cost spreads across many tokens. At low or spiky volume, idle GPUs
and engineering overhead usually make APIs cheaper. Calculate your cost per
million tokens at realistic utilization, add engineering and talent costs, and
compare that total against API pricing. For a full comparison, see
[serverless vs. self-hosted LLM inference](/getting-started/serverless-vs-self-hosted-llm-inference/).
Use similar model quality and latency, with the same input and output token mix.

### Are LLM inference costs falling and why?

Yes. In September 2026,
[Epoch AI](https://epoch.ai/publications/the-plunging-price-of-thought)
estimated that the cost of reaching a fixed level of AI performance on the
benchmarks they studied has fallen about 13x per year since 2023. For context,
[the Silicon Data LLM Token Expenditure Index](https://www.silicondata.com/products/silicon-index/llm-token-expenditure-index),
which tracks usage-weighted spending per million tokens across models, was
\$0.96 on October 20, 2026. Changes in provider prices and model mix can both
move the index.

The main drivers are cheaper and more efficient hardware, better serving
runtimes, competition from lower-cost open models, and smaller models that
match the quality of older, larger ones.

<LinkList>

## Additional resources

- [Epoch AI: The plunging price of thought](https://epoch.ai/publications/the-plunging-price-of-thought)
- [Silicon Data: LLM Token Expenditure Index](https://www.silicondata.com/products/silicon-index/llm-token-expenditure-index)
</LinkList>
