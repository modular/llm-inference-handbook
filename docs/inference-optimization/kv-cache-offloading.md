---
sidebar_position: 8
description: Learn how KV cache offloading improves LLM inference by reducing GPU memory usage, lowering latency, and cutting compute costs.
keywords:
    - KV cache offloading, KV cache, KV caching
    - LMCache, Mooncake, KVBM, HiCache, KV connector
    - vLLM, SGLang, MAX
    - Distributed inference, distributed LLM inference
    - Inference optimization
    - LLM inference optimization, LLM inference optimization techniques
    - Speed up LLM inference
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
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

## How to offload the KV cache

You almost certainly don't need to build the implementation yourself. Every
major inference framework now supports KV cache offloading as a built-in
feature, and a second layer of dedicated KV cache systems exists for the cases
the framework can't cover on its own.

### Built-in offloading in your inference framework

vLLM, SGLang, and MAX all support offloading to host memory and disk with no
extra infrastructure. The mechanism is similar: they extend the existing
[prefix cache](/inference-optimization/prefix-caching/) so that completed blocks
are demoted to a larger, slower tier, then promoted back to the GPU when a later
request hits them. Transfers can run asynchronously on DMA (Direct Memory
Access) copy engines, so they overlap with model execution rather than stalling
it.

Here are some examples:

<Tabs groupId="inference-framework">
<TabItem value="max" label="MAX">

```bash
max serve --model meta-llama/Llama-3.1-8B-Instruct \
  --kv-connector-config '{"type": "rust_tiered"}'
```

MAX calls this layer
[a KV connector](https://max.modular.com/api/python/generated/max.pipelines.lib.KVConnectorConfig/).
The `rust_tiered` connector tiers evicted blocks across your host memory and
local disk. Override the budgets explicitly when you want to:

```bash
max serve --model meta-llama/Llama-3.1-8B-Instruct \
  --kv-connector-config '{
    "type": "rust_tiered",
    "host_offload_max_gb": 128,
    "disk_offload_dir": "/mnt/kv_cache",
    "disk_offload_max_gb": 512
  }'
```

</TabItem>
<TabItem value="vllm" label="vLLM">

```bash
vllm serve --model meta-llama/Llama-3.1-8B-Instruct \
  --kv-offloading-backend native \
  --kv-offloading-size 100 # the buffer size in GiB
```

Recent vLLM versions expose offloading through these two top-level flags. The
underlying mechanism is the
[OffloadingConnector](https://docs.vllm.ai/en/stable/features/kv_offloading_usage/),
which you can configure directly for multi-tier setups:

```bash
vllm serve --model meta-llama/Llama-3.1-8B-Instruct \
  --kv-transfer-config '{
    "kv_connector": "OffloadingConnector",
    "kv_role": "kv_both",
    "kv_connector_extra_config": {
      "cpu_bytes_to_use": 100000000000,
      "spec_name": "TieringOffloadingSpec",
      "secondary_tiers": [{"type": "fs", "root_dir": "/mnt/kv_cache"}]
    }
  }'
```

</TabItem>
<TabItem value="sglang" label="SGLang">

```bash
sglang serve --model-path meta-llama/Llama-3.1-8B-Instruct \
  --enable-hierarchical-cache \
  --hicache-ratio 2 \                     # Host memory ratio (2x GPU memory)
  --hicache-size 100 \                    # Host memory size in GBs, will override the above ratio
  --hicache-write-policy write_through \  # Cache write policy from GPU to CPU
  --hicache-storage-backend               # Optional storage backend
```

SGLang's offloading layer is called
[HiCache](https://docs.sglang.io/docs/advanced_features/hicache), which extends
RadixAttention with a three-tier hierarchical KV caching system.

</TabItem>
</Tabs>

:::note
These flag names might be outdated, because KV cache offloading is under active
development across all three frameworks. Check their documentation for the
version you're running.
:::

### Dedicated KV cache systems

In addition to framework-native offloading implementations, you can add a
dedicated KV cache layer for extended features:

- [LMCache](https://github.com/LMCache/LMCache) is a vendor-neutral KV cache
  management layer designed to optimize LLM inference by reducing TTFT and
  increasing throughput, especially for long-context workloads. It supports
  persistent, tiered KV cache offloading to various storage backends including
  CPU RAM, local disk, Redis, Valkey, Mooncake, and InfiniStore.
- [Mooncake Store](https://kvcache-ai.github.io/Mooncake/design/store/mooncake-store.html)
  is a distributed KV cache storage engine designed specifically for LLM
  inference. It enables inference engines to store, retrieve, and transfer KV
  caches across GPUs, nodes, and instances, supporting prefill-decode
  disaggregation and improving cache reuse. It is widely integrated with systems
  such as vLLM, SGLang, and LMCache.
- [NVIDIA Dynamo KVBM](https://docs.nvidia.com/dynamo/knowledge-base/modular-components/kvbm/overview)
  (KV Block Manager) is a unified memory layer to handle memory allocation,
  management, and remote sharing of KV blocks for inference tasks across
  heterogeneous and distributed environments.

---

Whichever tool you choose, benchmark it with your workloads and measure cache
hit rate per tier alongside TTFT and throughput. A correctly configured host
tier should show a high hit rate and improved TTFT, while a disk tier that hits
rarely is mostly paying transfer cost for nothing.

<LinkList>

## Additional resources

- [NVIDIA GH200 Superchip Accelerates Inference by 2x in Multiturn Interactions with Llama Models](https://developer.nvidia.com/blog/nvidia-gh200-superchip-accelerates-inference-by-2x-in-multiturn-interactions-with-llama-models/)
- [5x Faster Time to First Token with NVIDIA TensorRT LLM KV Cache Early Reuse](https://developer.nvidia.com/blog/5x-faster-time-to-first-token-with-nvidia-tensorrt-llm-kv-cache-early-reuse/)
- [KV Cache Offloading for Context-Intensive Tasks](https://arxiv.org/abs/2604.08426)
</LinkList>
