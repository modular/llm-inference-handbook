---
sidebar_position: 3
description: Select the right NVIDIA or AMD GPUs (e.g., L4, A100, H100, B200, MI250X, MI300X, MI350X) for LLM inference.
keywords:
    - NVIDIA GPUs, AMD GPUs
    - GPU inference
---

import GPUTable from '@site/src/components/GPUTable';

# Choosing the right GPU

For AI teams self-hosting LLMs, selecting the right GPU is one of the most
important early decisions. The choice directly impacts throughput, latency,
memory limits, and overall cost. It’s easy to rely on a GPU benchmark or a GPU
comparison chart to guide that decision. However, those numbers rarely capture
the full story of LLM workloads in a specific use case.

## GPUs vs. Graphics Cards vs. Accelerators

First, let’s clarify a few terms that are often used interchangeably but
actually mean different things.

### GPU (Graphics Processing Unit)

The GPU is the processor chip itself. Originally designed for rendering
graphics, it is capable of running thousands of calculations at once. In modern
AI workloads, the GPU is the "brain" that does the heavy computational work.

### Graphics card

A graphics card is the full hardware package that contains a GPU. It includes
the chip, memory (VRAM), cooling system, power connectors, and output ports. You
might also see terms like “video card” or “graphics adapter.” The GPU is just
one part of the card, but it’s the central component.

### Accelerator

Accelerators are a broader category of specialized hardware built to speed up
certain types of computations. A GPU is one type of accelerator, but there are
others, such as:

- AI/ML accelerators (e.g., Google TPUs, Intel NPUs)
- Cryptographic accelerators
- Physics processing units (PPUs)
- Field-programmable gate arrays (FPGAs) configured for specific tasks

The key difference: all modern graphics cards contain GPUs, and all GPUs are
accelerators, but not all accelerators are GPUs or graphics-focused. Today, many
GPUs are used primarily for non-graphics work like ML/AI training and inference,
rather than image rendering.

If you rent compute from a cloud vendor, you usually just see the cost listed
under **GPUs**. But when reading their marketing materials or blog posts, it’s
important to know exactly what’s being described.

## Why GPU choice matters for inference

Modern AI applications are increasingly powered by Generative AI (GenAI) models
like LLMs. Unlike traditional ML models, these models can reach hundreds of
billions of parameters, like DeepSeek-V3.1 with 671B parameters. To run models
at this scale, you need extremely powerful GPUs such as the NVIDIA H200 or AMD
MI300X. This way, you can fully unlock their inference potential with the latest
optimization techniques.

However, not every workload needs that much horsepower. Smaller open-source
LLMs, such as Llama-3.1-8B, run efficiently on mid-range GPUs like the NVIDIA L4
or AMD MI250. Lightweight models can even run on entry-level cards or commodity
cloud instances.

The key is to find the right GPU for the job to achieve the best
price-performance ratio. The wrong choice can lead to bottlenecks, limiting
throughput, increasing latency, and driving up cost.

## Understanding GPU types

Not all GPUs are built for the same purpose. When you check a GPU benchmark,
you’ll often see a mix of data center cards, consumer graphics cards, and even
mobile chips. It’s important to understand the major categories before selecting
the right one for your inference workload.

### Consumer GPUs

These GPUs are originally made for gaming, but still widely used for smaller
open-source LLMs and experimentation. They usually have less VRAM but are
cost-effective. Examples include NVIDIA RTX 4090 or AMD Radeon RX 7900 XTX.

### Workstation GPUs

Workstation cards sit between consumer and data center hardware. They’re a good
fit for professionals who need strong compute on a single machine, often for 3D
design, visualization, or model prototyping. Cards like NVIDIA RTX A6000 or AMD
Radeon Pro W6800 fall into this category.

### Data center GPUs

Enterprises rely on data center GPUs for large-scale AI inference and
high-performance computing (HPC) workloads. They offer high VRAM (40–192GB),
strong memory bandwidth, and features like multi-instance GPU (MIG) or NVLink
for scaling across clusters. Examples include NVIDIA A100, H100, and B200, as
well as AMD MI300X and MI350X.

For teams renting cloud compute or
[deploying LLM on-prem](/getting-started/on-prem-llms/), data center GPUs are
usually the most practical choice.

## Key considerations for choosing GPUs

When selecting GPUs, remember that raw benchmark numbers don’t tell the whole
story. The best choice depends on a combination of hardware specifications,
workload size, and ecosystem support.

### GPU memory (VRAM)

VRAM sets the ceiling on model size and context length because everything the
GPU touches during inference must live in the memory: the model weights, the
activations, and the KV cache. Weights determine the baseline footprint, so the
model has to fit before you can serve it at all. For example, DeepSeek V3 and
R1, with 671B parameters, require 8 NVIDIA H200 GPUs (141 GB each) to run. In
contrast, smaller models such as Phi-3 can fit within 16–24GB when quantized.
The KV cache then consumes whatever VRAM is left, which limits how long a
context you can support.

In production, the major challenge is often the KV cache. Its size grows
linearly with sequence length, meaning long-context workloads can quickly
exhaust memory. To avoid bottlenecks, you need
[distributed inference](/infrastructure-and-operations/distributed-inference/)
techniques like
[prefill-decode disaggregation](/inference-optimization/prefill-decode-disaggregation/)
and [KV cache offloading](/inference-optimization/kv-cache-offloading/).

For more information, see the
[GPU memory hierarchy](/kernel-optimization/gpu-architecture-fundamentals/gpu-memory/).

### Memory bandwidth

Memory bandwidth is how fast the GPU can move data between its
[HBM](/kernel-optimization/gpu-architecture-fundamentals/gpu-memory/#hbm-high-bandwidth-memory)
and the compute cores, measured in GB/s or TB/s. For LLM inference, it is one of
the most important specifications, because the **decode phase is memory-bound**.
To generate each new token, the GPU must repeatedly stream most or all model
weights (plus the growing KV cache) from HBM, while doing relatively little
computation per byte of data read.

As a result, the theoretical upper bound for single-stream decode speed is
approximately:

```bash
maximum decode tokens/sec ≈ memory bandwidth / bytes read per token
```

For example, a 70B-parameter model in FP16 contains about 140 GB of weights. On
an H100 SXM with roughly 3.35 TB/s of HBM bandwidth, this means a theoretical
ceiling of about 24 tokens/s per sequence before accounting for any other
overhead (e.g., KV cache).

This is why the prefill phase (which processes the prompt in parallel) behaves
very differently from decode. It also explains why
[batching](/inference-optimization/static-dynamic-continuous-batching/) improves
throughput so effectively: the same weight reads can be reused across many
sequences, allowing the GPU to trade memory-bandwidth pressure for additional
compute work.

### Compute throughput

Compute throughput is how many math operations the GPU can perform per second,
measured in FLOPS (floating-point operations per second), and it is what limits
the **compute-bound prefill phase**: encoding a long prompt, processing large
batches, and any workload with high arithmetic intensity. Modern data center
GPUs reach these numbers through dedicated matrix units (NVIDIA Tensor Cores,
AMD Matrix Cores), and lower precisions roughly double the rate (e.g., FP16 →
FP8 → FP4).

When reading specification sheets, keep a few caveats in mind:

- **Watch the asterisks**. Vendors often quote peak FLOPS with sparsity or at
  the lowest supported precision. Compare cards at the same precision and the
  same dense/sparse assumption.
- **FLOPS isn't the user-facing metric**. What you ultimately care about is
  [tokens per second and latency](/llm-inference-basics/llm-inference-metrics/)
  (TTFT and ITL). A GPU can have huge FLOPS yet be bottlenecked by
  [memory bandwidth](#memory-bandwidth) during decode, so the two numbers need
  to be read together.
- **Precision support is a hard gate**. Native FP8 needs NVIDIA H-series or
  newer. Older cards fall back to higher precision, losing the throughput
  advantage.

To push effective throughput further, apply techniques like
[speculative decoding](/inference-optimization/speculative-decoding/),
[prefill-decode disaggregation](/inference-optimization/prefill-decode-disaggregation/),
and
[continuous batching](/inference-optimization/static-dynamic-continuous-batching/).

### GPU interconnect

GPU interconnect determines how quickly you can exchange data (e.g., KV cache)
when your workload spans more than one GPU, both within a single node and across
multiple nodes. This is especially important for large models that use
[tensor parallelism, pipeline parallelism](/inference-optimization/data-tensor-pipeline-expert-hybrid-parallelism/),
or other
[distributed inference techniques](/infrastructure-and-operations/distributed-inference/).
If the interconnect is slow, adding more GPUs may increase memory capacity but
fail to deliver the expected throughput or latency improvements.

- **Intra-node interconnect**. This refers to communication between GPUs inside
  the same server. High-bandwidth fabrics such as NVIDIA NVLink/NVSwitch or AMD
  Infinity Fabric are often much faster than PCIe-only setups for tightly
  coupled multi-GPU inference. On an H100, for example, NVLink delivers 900 GB/s
  of bidirectional GPU-to-GPU bandwidth,
  [about 7 times faster](https://www.nvidia.com/en-us/data-center/h100/) than
  the bidirectional bandwidth of a single PCIe 5.0 link at 128 GB/s.
- **Inter-node interconnect**. This refers to networking between different GPU
  servers. A single node typically contains 4 to 8 GPUs, although larger or
  specialized systems exist. Once a model or workload exceeds what a single node
  can support due to limits like power, cooling, or form factor, communication
  must go over the network. A practical solution is InfiniBand (with GPUDirect
  RDMA) or highly tuned RoCEv2 Ethernet.

As a rule of thumb, keep the most communication-intensive parallelism within a
single node when possible. If you need to scale across nodes, evaluate the full
cluster topology, not just the GPU type.

### Cost and availability

Consumer and workstation GPUs are accessible and cheaper but often limited in
VRAM. Data center GPUs provide the scale and reliability for enterprise AI
deployments, though **at a premium**. This is especially true for
high-performance GPUs like NVIDIA H100 and H200.

For enterprise AI teams, a bigger challenge is the **GPU CAP Theorem**: a GPU
infrastructure cannot guarantee **Control**, on-demand **Availability**, and
**Price** at the same time.

|                            | Hyperscaler | NeoCloud (Serverless) | NeoCloud (Long-term Commitment) | On-prem |
|----------------------------|-------------|-----------------------|---------------------------------|---------|
| **Control**                | High        | Low                   | Medium                          | High    |
| On-demand **Availability** | Medium      | High                  | Low                             | Low     |
| **Price**                  | High        | Medium                | Low                             | Medium  |

### Ecosystem and framework support

A GPU is only as effective as the software that supports it. NVIDIA benefits
from a mature CUDA Toolkit and TensorRT-LLM ecosystem. AMD’s ROCm stack is
improving steadily, with growing support across PyTorch, vLLM, SGLang, and MAX.

## Matching GPUs to open-source LLMs

Different models perform best on different types of GPUs. The table below maps
popular NVIDIA and AMD GPUs to suitable open-source LLMs. Some models require
**multiple GPUs to meet VRAM demands** or you may need optimization techniques
like [quantization](/model-preparation/llm-quantization/).

<GPUTable />

:::note
Use this table as a reference only. For production deployments, always benchmark
your own models against the target hardware.
:::

Things to keep in mind:

- **FP8 support**. If you choose NVIDIA GPUs, note that LLMs that rely on native
  FP8 weights can only run on NVIDIA H-series (or newer) GPUs. This is because
  A-series cards lack FP8 hardware support.
- **Single vs. Multi-GPU**. Some models can run on one card, but usually
  performance improves with multiple GPUs (e.g., for high-concurrency
  scenarios).
- **Hardware flexibility**. Most models can run on different hardware. For
  instance, gpt-oss-20b and gpt-oss-120b can run on NVIDIA A100, H100, H200,
  B200 GPUs, or AMD MI300X, MI325X, MI355X GPUs. The limiting factor is usually
  VRAM and cluster size, not architecture. Learn how to
  [calculate GPU memory for serving LLMs](/getting-started/calculating-gpu-memory-for-llms/).

---

If you're evaluating GPU options for self-hosting LLMs, we support running both
open and custom models across NVIDIA, AMD, Apple Silicon, CPUs, and more with a
single codebase. You can run models locally, deploy in your own cloud (BYOC), or
use shared and dedicated endpoints depending on your needs.

<div style={{ margin: '3rem 0' }}>
<a className="btn-outline" href="https://www.modular.com/request-demo?utm_source=llm_handbook">Talk to us</a>
</div>

## FAQs

### When and how are weights loaded into GPU memory?

Weight loading happens at service startup. Here is the specific pipeline:

1. Model files are read from disk (SSD / network storage)
   - Model checkpoint (e.g., `.safetensors`, `.bin`)
   - Read via CPU
   - Very slow compared to GPU memory
   - Bandwidth: SSD at ~1–10 GB/s
2. CPU RAM staging
   - Weights are temporarily placed in system memory
   - Often deserialized or memory-mapped
   - CPU RAM bandwidth: ~50–200 GB/s for typical configurations
3. Transferred to
   [GPU HBM](/kernel-optimization/gpu-architecture-fundamentals/gpu-memory/#hbm-high-bandwidth-memory)
4. Cached there for the lifetime of the serving process

Once copied, weights are stored in HBM and are ready for repeated reads during
every forward pass. For decoding, weights are NOT reloaded from disk or CPU;
they are reused directly from HBM.

If you are using
[tensor parallelism](/inference-optimization/data-tensor-pipeline-expert-hybrid-parallelism/),
each GPU holds a slice of every layer's weight matrices.

### What is the best GPU comparison tool for AI workloads?

Most generic GPU comparison tools focus on gaming or graphics performance, which
doesn’t reflect real AI inference workloads. For LLMs, you need tools that
measure
[throughput and latency metrics like TTFT and ITL](/llm-inference-basics/llm-inference-metrics/).

You can start by checking benchmark results from frameworks such as vLLM,
SGLang, MAX, and TensorRT-LLM. They provide ready-to-use scripts that help you
compare inference performance across different GPUs.

However, these frameworks usually require manual configuration and tuning, which
can be time-consuming.

### Where can I buy or rent GPU servers?

You can either buy on-premises GPU servers or rent cloud GPUs depending on your
scale, control needs, and budget.

Cloud providers such as AWS, Google Cloud, and Azure let you rent H100, H200, or
MI300X GPUs on demand.

NeoClouds like CoreWeave and Nebius provide lower-cost access and flexible
billing. However, they typically offer less control and fewer compliance
guarantees for regulated or enterprise environments.

If you prefer full ownership, you can purchase GPU servers outright from
original equipment (OE) partners like Dell, GIGABYTE, or HPE, which work
directly with NVIDIA and AMD. This route gives you maximum control, but also
means higher upfront costs and longer procurement cycles.

### How can I check what GPU I have?

On most systems, you can quickly verify your GPU type using command-line tools:

- **Linux**: `nvidia-smi` (for NVIDIA) or `amd-smi` (for AMD).
- **macOS**: `system_profiler SPDisplaysDataType`.
- **Windows**: Open **Device Manager** → **Display Adapters**.

### How important are CUDA and driver versions when choosing a GPU?

Very important. GPU performance isn’t just about the hardware. Your NVIDIA
driver, CUDA version, and framework build (e.g., PyTorch, vLLM, SGLang, MAX,
TensorRT-LLM) all need to line up. When they don’t, you’ll see errors,
slowdowns, or missing features like FP8 or
[FlashAttention](/kernel-optimization/flashattention/). If you want the
lower-level reason these mismatches matter, refer to
[GPU architecture fundamentals](/kernel-optimization/gpu-architecture-fundamentals/).

For NVIDIA GPUs:

- **Driver** contains the
  [CUDA Driver API](https://docs.nvidia.com/cuda/cuda-driver-api/index.html) and
  talks directly to the GPU
- **CUDA toolkit** provides development tools, compilers and libraries
- **cuDNN, cuBLAS and NCCL** power operations inside PyTorch and most inference
  engines
- **Framework builds** are compiled for a specific CUDA toolkit version

If any part of the stack is outdated, you might hit issues like:

- “CUDA driver version is insufficient”
- Kernel failures
- Poor throughput
- Missing FP8, FlashAttention, or device-level optimizations

A simple rule of thumb:

- Your **driver's CUDA version** must be ≥ the **CUDA toolkit version** your
  framework was built with.
- Newer drivers are usually backwards compatible with older CUDA toolkits.
- Older drivers can’t run newer CUDA runtimes.

You can confirm your driver and GPU with:

```bash
nvidia-smi

# Example output:
+---------------------------------------------------------------------------------------+
| NVIDIA-SMI 535.129.03             Driver Version: 535.129.03   CUDA Version: 12.2     |
|-----------------------------------------+----------------------+----------------------+
```

This means your driver supports up to CUDA 12.2 runtime. Your framework can be
built with CUDA 12.2, 12.1, 11.8, etc., but not 12.3 or newer.

To upgrade, download the official
[CUDA toolkit](https://developer.nvidia.com/cuda-downloads) and
[driver](https://www.nvidia.com/en-us/drivers/) packages.
