---
sidebar_position: 8
description: Learn how KV cache offloading improves LLM inference by reducing GPU memory usage, lowering latency, and cutting compute costs.
keywords:
    - KV cache offloading, KV cache, KV caching, LMCache
    - Distributed inference, distributed LLM inference
    - Inference optimization
    - LLM inference optimization, LLM inference optimization techniques
    - Speed up LLM inference
---

import LinkList from '@site/src/components/LinkList';
import KVCacheCalculator from '@site/src/components/Calculator/KVCache';

# KV cache offloading

KV cache offloading is the process of moving attention key/value data from GPU
memory to lower-cost storage like CPU memory or disk. It frees up GPU resources
while preserving the ability to resume inference without recomputation. This
helps scale LLM workloads efficiently by balancing performance and memory usage.

## Why does KV cache become a bottleneck in LLM inference?

LLMs rely heavily on the KV cache to speed up inference. The cache stores
attention keys and values for every token in the input sequence, allowing the
model to reuse them in future steps instead of recalculating them. Although this
saves a significant amount of compute resources and delivers faster inference,
it comes with a steep memory cost.

As context windows increase,
**the KV cache size grows linearly with sequence length**. This can quickly
exhaust available GPU memory, especially in long-context scenarios. Since GPU
memory is limited, the KV cache often becomes a bottleneck for running
applications that require extended context.

In fact, **not all KV cache data needs to stay in GPU memory at all times**. In
many real-world applications, users may not interact with the LLM continuously.
For example, a user might pause while typing or leave and return hours later. In
such cases, their KV cache remains in GPU memory, even though it’s not actively
being used. Similarly, when multiple users/agents access the same conversation,
document, or session at different times, the same KV cache might sit idle on the
GPU between interactions (and you don't want to waste GPU resources just for
recalculation of the same content).

This results in inefficient memory usage, as valuable GPU memory is tied up by
inactive sessions instead of being used to serve new requests. Over time, this
limits how many concurrent users the system can support and reduces overall
throughput.

To solve these problems, KV cache offloading moves inactive or less frequently
accessed cache data from GPU memory to lower-cost, higher-capacity storage such
as CPU RAM, local SSDs, or remote object storage. When a user resumes
interaction or another user accesses the same content, the cache can be reloaded
into GPU memory on demand. This avoids costly recomputation while freeing up GPU
resources for active workloads.

## How to calculate the KV cache size

When offloading the KV cache, it’s useful to understand how much memory it
actually consumes.

In transformer-based LLMs, each attention layer needs to store two vectors (a
key and a value) for every token in the input sequence. Each layer contains
multiple attention heads, and all heads typically have the same dimension.

To estimate how much memory the KV cache consumes, use the following calculator:

<KVCacheCalculator />

:::info
You can often find the architecture details of an LLM in the `config.json` file
of its Hugging Face repository, including the model architecture (e.g., a
Transformer decoder), the number of layers, hidden size, number of attention
heads, vocabulary size, and other architectural hyperparameters. If you already
know the model’s dimension, you can simplify the formula by replacing `H × D`
with it (Simplified Calculation above).
:::

## When should you offload the KV cache for LLMs?

KV cache offloading is especially useful when:

- You’re deploying LLMs with long context windows, which can cause the KV cache
  to quickly exceed GPU memory.
- Multiple users or agents need to interact with the same underlying content or
  context across sessions. For example, developers working in an IDE with LLM
  integration often interact with the same code snippet repeatedly.
- Your deployment is memory-constrained or you need to optimize for
  infrastructure cost.
- You’re scaling inference across many distributed workers where GPU resources
  are limited.
- Your workloads include intermittent or idle user sessions, where keeping the
  KV cache in GPU memory would be wasteful.

## Benefits of KV cache offloading

Offloading the KV cache offers several important advantages for scaling and
optimizing LLM inference:

- **Better resource utilization.** By moving inactive or shared KV data out of
  GPU memory, you can free up space for new requests. This allows the same GPU
  to serve more concurrent users or longer input sequences without hitting
  memory limits.
- **Lower compute costs.** GPU memory is expensive and limited. Offloading
  allows workloads to take advantage of cheaper storage (e.g., CPU RAM or disk),
  reducing the need to over-provision high-end GPUs just to manage cache.
- **Reduced latency**: Offloading allows the model to skip redundant KV
  computations during inference, especially for overlapping context in
  multi-turn interactions. This significantly reduces TTFT and overall latency.
  NVIDIA reports that KV cache offloading can
  [deliver up to 14× faster TTFT](https://developer.nvidia.com/blog/nvidia-gh200-superchip-accelerates-inference-by-2x-in-multiturn-interactions-with-llama-models/)
  for large input sequences compared to recalculating the KV cache from scratch.

## Trade-offs in KV cache offloading

While KV cache offloading can significantly improve memory efficiency and
throughput, the speed of the offloading target is critical. If the storage tier
(e.g., CPU RAM or disk) is too slow, the overhead of transferring KV data back
to the GPU may negate the benefits, especially in latency-sensitive
applications.

Make sure the cost of transferring data is lower than recomputing the cache from
scratch. This is often the case in long, multi-turn conversations, where reusing
previous context is crucial and recomputation would be expensive.

There is also a quality trade-off when the system uses selective KV offloading.
During decoding, the runtime may need to decide which keys and values should
return to the GPU. If it misses important context tokens, the model can produce
worse answers. This risk is high in context-intensive workloads such as
multi-document QA, legal review, and codebase reasoning, where many details from
the prompt may matter.

[This paper](https://arxiv.org/abs/2604.08426) highlights the problem: some KV
offloading methods perform well on common long-context benchmarks but degrade on
tasks that require retrieving many facts from the prompt. The practical lesson
is that long context length and context intensity are different things. Before
enabling selective KV offloading in production, compare it with a full-attention
baseline on tasks that match your workload. Track answer quality alongside TTFT,
TPOT, throughput, GPU memory usage, and host-to-device transfer.

## Offloading the KV cache with LMCache

[LMCache](https://github.com/LMCache/LMCache) is an LLM serving engine extension
designed to optimize LLM inference by reducing TTFT and increasing throughput,
especially for long-context workloads. It supports the reuse of KV caches for
repeated input content (not just prefixes) across different engine instances.

By storing KV caches in multiple tiers of memory, including GPU, CPU DRAM, and
local disk, LMCache significantly reduces redundant computation. This improves
response time and saves GPU cycles, making it ideal for workloads like
multi-turn QA, RAG, and document-level reasoning.

In benchmarks, combining LMCache with vLLM has resulted in 3×–10× reductions in
latency across various use cases.

Several open-source projects have already integrated LMCache to support
efficient KV cache offloading and reuse:

- [llm-d](https://www.redhat.com/en/about/press-releases/red-hat-launches-llm-d-community-powering-distributed-gen-ai-inference-scale)
  offloads KV cache data with LMCache from GPU memory to more cost-effective and
  abundant storage such as CPU memory and network disks.
- [KServe](https://kserve.github.io/website/docs/next/model-serving/generative-inference/kvcache-offloading)
  integrates LMCache to reduce inference costs and ensure SLOs for both latency
  and throughput at scale.
- [vLLM](https://docs.vllm.ai/en/latest/examples/disaggregated/lmcache/) uses
  LMCache for CPU offloading, cache sharing between requests, and disaggregated
  prefilling. This enables better memory management and improves resource
  efficiency.

LMCache currently supports offloading KV cache data to a variety of storage
backends, ranging from local options like CPU memory and the file system, to
distributed systems such as Mooncake and ValKey.

<LinkList>

## Additional resources

- [LMCache Documentation](https://docs.lmcache.ai/)
- [NVIDIA GH200 Superchip Accelerates Inference by 2x in Multiturn Interactions with Llama Models](https://developer.nvidia.com/blog/nvidia-gh200-superchip-accelerates-inference-by-2x-in-multiturn-interactions-with-llama-models/)
- [5x Faster Time to First Token with NVIDIA TensorRT LLM KV Cache Early Reuse](https://developer.nvidia.com/blog/5x-faster-time-to-first-token-with-nvidia-tensorrt-llm-kv-cache-early-reuse/)
- [KV Cache Offloading for Context-Intensive Tasks](https://arxiv.org/abs/2604.08426)
</LinkList>
