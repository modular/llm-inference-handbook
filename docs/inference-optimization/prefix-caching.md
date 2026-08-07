---
sidebar_position: 6
description: Prefix caching speeds up LLM inference by reusing shared prompt KV cache across requests.
keywords:
    - Prefix caching, prompt caching, context caching
    - KV cache, KV caching
    - Distributed inference, distributed LLM inference
    - Inference optimization
    - Dynamo, SGLang, vLLM, llm-d
    - LLM inference optimization, LLM inference optimization techniques
    - Speed up LLM inference
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import LinkList from '@site/src/components/LinkList';

# Prefix caching

Prefix caching (also known as prompt caching or context caching) is one of the
most effective techniques to reduce latency and cost in LLM inference. It's
especially useful in production workloads with repeated prompt structures, such
as chat systems, AI agents, and RAG pipelines.

The idea is simple: By caching the KV cache of an existing query, a new query
that shares the same prefix can skip recomputing that part of the prompt.
Instead, it directly reuses the cached results.

Prefix caching is different from simple semantic caching, where the full input
and output text are stored in a database and only exact match (or similar
queries) can hit the cache and return immediately.

## How does prefix caching work?

Prefix caching reuses attention states that the model has already computed.

1. During prefill, the model performs a forward pass over the input tokens and
   builds up a key-value (KV) cache.
2. During decode, the model generates output tokens one by one, using the cached
   states from the prefill stage. The attention mechanism computes a matrix of
   token interactions. The resulting KV pairs for each token are stored in GPU
   memory.
3. When a new request arrives, the model finds the longest cached token sequence
   that matches the request from the beginning. It loads those KV states and
   runs prefill only for the remaining tokens.

This works only when the prefix is exactly identical, including whitespace and
formatting. Even a single character difference breaks the cache. Consider these
three prompts:

```bash
Prompt 1: Summarize this incident report in one paragraph.
Prompt 2: Summarize this incident report in three bullet points.
Prompt 3: Write a one-paragraph summary of this incident report.
```

Prompt 2 can reuse the KV states for the shared beginning
`Summarize this incident report in`. The model only needs to process the suffix
where the two prompts diverge. Prompt 3 asks for a similar result and contains
many of the same words as Prompt 1, but it doesn't start with the same token
sequence. Therefore, it cannot reuse the cache of Prompt 1 from the beginning.

This is why prefix caching is different from semantic caching. Two prompts can
have the same meaning and still miss the prefix cache, while two requests with
different final questions can share most of their cached computation.

Here are two common use cases of prefix caching:

### Reusing a static system prompt

A common cacheable prefix is a system prompt shared by many requests:

```bash
You are a helpful AI writer. Please write in a professional manner.
```

If this prompt and the serialization remain unchanged, the model can compute the
KV states once and reuse them across conversations. Each request then runs
prefill only for the user-specific content that follows it.

### Reusing a growing chat history

Multi-turn chat is where the benefit becomes more noticeable. Suppose the first
turn is:

```bash
User: Why did the checkout API slow down after deployment?
Assistant: Trace data shows that repeated inventory database lookups added most of the latency.
```

The user then asks:

```bash
User: Which lookup should we optimize first?
```

The model isn't given only the latest question. The application resends the
previous messages as part of the
[context window](/llm-inference-basics/how-does-llm-inference-work/#what-is-a-context-window-and-how-does-it-work-in-llm-inference),
so the model knows which lookups the user means. The serialized second request
therefore looks roughly like this:

```bash
User: Why did the checkout API slow down after deployment?
Assistant: Trace data shows that repeated inventory database lookups added most of the latency.
User: Which lookup should we optimize first?
```

The first two messages are an exact prefix that the model has already processed.
If their KV states are still available, the model can reuse them and prefill
only the new user message. Without prefix caching, it must process the entire
conversation again.

As the conversation grows, the reusable prefix grows with it. Avoiding repeated
prefill reduces GPU compute and keeps TTFT from rising as quickly across turns.
Note that a cache hit still depends on the serving engine retaining the entry,
[routing the request to a worker that can access the cache](/inference-optimization/inference-routing/),
and serializing the previous messages identically.

## What is the difference between KV caching and prefix caching?

KV caching is used to store the intermediate attention states of each token in
GPU memory. It was originally used to describe caching within a
**single inference request**, especially critical for speeding up the decoding
stage.

LLMs work autoregressively during decode as they output the next new token based
on the previously generated tokens (i.e. reusing their KV cache). Without the KV
cache, the model needs to recompute everything for the previous tokens in each
decode step (and the context grows with every step), which would be a huge waste
of resources.

When extending this caching concept across **multiple requests**, it’s more
accurate to call it prefix caching. Since the computation of the KV cache only
depends on all previous tokens, different requests with identical prefixes can
reuse the same cache of the prefix tokens and avoid recomputing them.

## How to structure prompts for maximum cache hits

Prefix caching only helps when prompts are consistent. Here are some best
practices to maximize cache hit rates:

- **Front-load static content**: Place any constant or rarely changing
  information at the beginning of your prompt. This could include system
  messages, context, or instructions that remain the same across multiple
  queries. Move dynamic or user-specific content to the end of your prompt.
- **Batch similar requests**: Group together queries (especially when serving
  multiple users or agents) that share the same prefix so that cached results
  can be reused efficiently.
- **Avoid dynamic elements in the prefix**: Don’t insert timestamps, request
  IDs, or any other per-request variables early in the prompt. These lower your
  cache hit rate.
- **Use deterministic serialization**: Make sure your context or memory
  serialization (e.g., JSON) is stable in key ordering and structure.
  Non-deterministic serialization leads to cache misses even if the content is
  logically the same.
- **Monitor and analyze cache hit rates**: Regularly review your cache
  performance to identify opportunities for optimization.

## Adoption and performance gains

Prefix caching can reduce compute and latency by an order of magnitude in some
use cases.

- Anthropic Claude Sonnet offers
  [prompt caching](https://www.anthropic.com/news/prompt-caching) with up to 90%
  cost savings and 85% latency reduction for long prompts.
- Google Gemini
  [discounts cached tokens](https://ai.google.dev/gemini-api/docs/caching?lang=python)
  and charges for storage separately.

Frameworks like vLLM, SGLang, and MAX support prefix caching for different
open-source LLMs. In these engines, prefix caching is tied to how the KV cache
is allocated and is usually on by default. What you actually control is whether
to disable it and the granularity at which cached tokens are matched:

<Tabs groupId="inference-framework">
<TabItem value="max" label="MAX">

```bash
max serve --model google/gemma-3-27b-it \
  --enable-prefix-caching \
  --kv-cache-page-size 256
```

Prefix caching is on by default in MAX. Disable it with
`--no-enable-prefix-caching`. The page size must be a multiple of 128.

</TabItem>
<TabItem value="vllm" label="vLLM">

```bash
vllm serve --model google/gemma-3-27b-it \
  --enable-prefix-caching \
  --block-size 16
```

Disable it in vLLM with `--no-enable-prefix-caching`.

</TabItem>
<TabItem value="sglang" label="SGLang">

```bash
sglang serve --model-path google/gemma-3-27b-it
```

SGLang implements prefix caching as
[RadixAttention](https://arxiv.org/pdf/2312.07104), a radix tree over the KV
cache, and enables it by default. It matches at token granularity rather than in
fixed blocks (`--page-size` defaults to `1`). Disable it with
`--disable-radix-cache`.

</TabItem>
</Tabs>

:::note
Disabling prefix caching is usually not a performance optimization. It is
primarily useful for establishing a no-cache baseline.
:::

In agent workflows, the benefit is even more pronounced. Some use cases have
input-to-output token ratios of 100:1, making the cost of reprocessing large
prompts disproportionately high.

## Limitations

For applications with long, repetitive prompts, prefix caching can significantly
reduce both latency and cost. Over time, however, your KV cache size can be
quite large. GPU memory is finite, and storing long prefixes across many users
can eat up space quickly. You’ll need cache eviction strategies or memory
tiering.

The open-source community is actively working on distributed serving strategies.
See [inference routing](/inference-optimization/inference-routing/) for details.

Another practical limitation is feature composition. Prefix caching is easy to
reason about when the model has one standard full-attention KV cache. Newer
serving stacks may need to manage several cache-like states at once: draft and
target model caches for
[speculative decoding](/inference-optimization/speculative-decoding/), image
encoder states for VLMs, scaling metadata for quantized KV cache, or separate
caches for hybrid attention layers.

For these models, a shared text prefix does not always mean every cached state
can be reused in the same way. Sliding-window attention, for example, only keeps
a bounded recent window, so the cache manager must know which tokens are still
valid. In production, treat prefix cache hit rate as a per-workload metric
rather than a single global number, and verify that your inference framework can
compose prefix caching with the other optimizations you enable.

---

Optimizing LLM prefix caching requires flexible customization in your LLM
serving and infrastructure stack. We work to provide the infrastructure for
dedicated and customizable LLM deployments with fast auto-scaling and
scaling-to-zero capabilities to ensure resource efficiency.

<div style={{ margin: '3rem 0' }}>
<a className="btn-outline" href="https://www.modular.com/request-demo?utm_source=llm_handbook">Talk to us</a>
</div>

<LinkList>

## Additional resources

- [Prompt Cache: Modular Attention Reuse for Low-Latency Inference](https://arxiv.org/abs/2311.04934)
- [Prompt Caching in Claude](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [Design Around the KV-Cache](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
- [The Five Eras of KVCache](https://www.modular.com/blog/the-five-eras-of-kvcache?utm_source=llm_handbook)
</LinkList>
