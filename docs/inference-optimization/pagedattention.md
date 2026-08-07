---
sidebar_position: 3
description: Improve LLM memory usage with block-based KV cache storage via PagedAttention.
keywords:
    - vLLM, Hugging Face TGI, TensorRT-LLM
    - PagedAttention
    - KV cache, KV cache optimization, KV caching
    - LLM inference optimization, LLM inference optimization techniques
    - Speed up LLM inference
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import LinkList from '@site/src/components/LinkList';

# PagedAttention

PagedAttention is a memory-efficient approach to managing the KV cache in LLM
inference. The primary serving benefit does not come from a faster attention
kernel. It comes from how the serving engine allocates and manages KV cache
memory. Attention kernels implement part of the mechanism (they read KV blocks
through a lookup table), but the win is at the serving layer, which is why this
page sits in the Inference Optimization chapter. For attention efficiency at the
kernel level, see
[FlashAttention](/kernel-optimization/flashattention/).

## Attention and the KV cache

Attention is the mechanism that lets a Transformer evaluate how strongly tokens
relate to one another. For each token, the model computes three vectors:

- **Query (Q)**: what the current token is looking for
- **Key (K)**: what each token offers for matching
- **Value (V)**: the content each token contributes

The model compares queries against keys to produce attention scores, normalizes
them with softmax, and uses the resulting weights to take a weighted sum of the
values.

During autoregressive generation, each new token needs the keys and values of
all previous tokens. Instead of recomputing them at every step, the serving
engine
[stores them in the KV cache](/llm-inference-basics/how-does-llm-inference-work/#what-is-kv-cache).
That cache grows with sequence length and can consume a substantial amount of
GPU memory across concurrent requests. How the engine allocates that memory is
the problem PagedAttention solves.

For more information, see
[the attention mechanism](/llm-inference-basics/how-does-llm-inference-work/#the-attention-mechanism).

## Why contiguous KV cache allocation wastes memory

Normally, the KV cache takes up a big chunk of memory because it’s stored as
one giant contiguous block. This can lead to memory fragmentation or wasted
space because you need to reserve a big block even if you don’t fill it fully.

Specifically, early serving engines often allocated KV cache as a contiguous
tensor sized for the worst case.
[A simplified shape](/inference-optimization/kv-cache-offloading/#how-to-calculate-the-kv-cache-size)
is:

```bash
2 × num_layers × num_heads × head_dim × max_seq_len
```

That allocation happens per active request, before accounting for batch size and
the number of bytes per element. It is simple, but it assumes every request will
use the maximum sequence length. Real traffic is variable: one request may
generate a short answer, another may keep a long conversation alive, and another
may stop early. If each request reserves memory for `max_seq_len`, much of the
reserved GPU memory can sit unused.

The result is lower effective batch size, more memory fragmentation, and fewer
concurrent requests.

For more information, see the
[PagedAttention blog post](https://blog.vllm.ai/2023/06/20/vllm.html).

## How does PagedAttention work?

PagedAttention breaks this big chunk into smaller blocks, kind of like pages in
a book. In other words, the KV cache is stored in non-contiguous blocks. It then
uses a lookup table to keep track of these blocks. The LLM only loads the blocks
it needs, instead of loading everything at once.

This saves memory and makes the whole process more efficient. It even allows the
same blocks to be shared across different outputs if needed.

The original PagedAttention paper reports that, without PagedAttention, only
20.4%-38.2% of allocated KV cache memory is used to store actual token states,
with the remainder wasted due to fragmentation. By contrast, PagedAttention
reduces KV cache memory waste to nearly zero.

This is why PagedAttention matters beyond a single attention kernel. It gives
the serving engine a better memory allocator for KV cache, which then makes
techniques like
[continuous batching](/inference-optimization/static-dynamic-continuous-batching/),
[prefix caching](/inference-optimization/prefix-caching/), and
[KV cache offloading](/inference-optimization/kv-cache-offloading/) easier to
combine.

PagedAttention was first implemented by vLLM. Since then, other projects like
MAX have also adopted and implemented it. They expose the block size as a
serving flag, though the name may be different:

<Tabs groupId="inference-framework">
<TabItem value="max" label="MAX">

```bash
max serve --model meta-llama/Llama-3.1-8B-Instruct \
  --kv-cache-page-size 256
```

</TabItem>
<TabItem value="vllm" label="vLLM">

```bash
vllm serve --model meta-llama/Llama-3.1-8B-Instruct \
  --block-size 16
```

</TabItem>
</Tabs>

<LinkList>

## Additional resources

- [Efficient Memory Management for Large Language Model Serving with PagedAttention](https://arxiv.org/abs/2309.06180)
</LinkList>
