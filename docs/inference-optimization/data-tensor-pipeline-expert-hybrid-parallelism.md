---
sidebar_position: 9
description: Understand the differences between data, tensor, pipeline, expert and hybrid parallelisms.
keywords:
    - LLM inference optimization, LLM inference optimization techniques
    - Data parallelism, tensor parallelism, pipeline parallelism, expert parallelism and hybrid parallelism
    - Speed up LLM inference
---

import LinkList from '@site/src/components/LinkList';

# Data, tensor, pipeline, expert and hybrid parallelisms

Parallelism strategies distribute inference work across multiple devices to
improve throughput, fit larger models, and use hardware more efficiently. New
parallelization strategies continue to emerge as models grow larger and more
complex.

## Data parallelism

Data parallelism (DP) increases total throughput by distributing individual
requests or microbatches across multiple replicas of the same model. Each
replica has its own copy of the model weights and handles different requests
independently. A replica can run on a single GPU, or it can span multiple GPUs
using [tensor parallelism](#tensor-parallelism) or
[pipeline parallelism](#pipeline-parallelism) internally.

AI teams often use a router to distribute independent requests across replicas.
For batch workloads, a larger batch can also be split into smaller microbatches,
with each replica processing a different microbatch at the same time. This
approach allows more requests to be processed concurrently.

<Diagram name="dp" alt="Data parallelism: a full model replica on each GPU" />

As a result, adding more replicas increases aggregate throughput and
concurrency. It doesn't directly reduce the compute latency of an individual
request, because that request is still processed by a single replica.

Data parallelism also provides a failure boundary. When a health check marks one
replica unavailable, the router can stop sending new requests to it and use the
remaining replicas. This improves availability, though the healthy replicas need
spare capacity to absorb the traffic. Any in-flight request and local KV cache
on the failed replica may also be lost.

A key consideration here is how to route requests. For LLM inference, requests
can vary widely in prompt length, output length, and KV cache usage. GPU
capacity is also expensive, so poor load distribution can leave some replicas
overloaded while others sit underused. Production routers therefore often
consider multiple signals when choosing a replica. For more information, see
[inference routing](/inference-optimization/inference-routing/).

The main cost of data parallelism is memory duplication. Every replica needs a
copy of the model weights and maintains a separate KV cache. If one copy of the
model can't fit on a worker, data parallelism alone doesn't solve the problem.
Combine it with tensor or pipeline parallelism.

## Tensor parallelism

Tensor parallelism (TP) distributes the weights of a model across multiple GPUs
to deploy large models that can't fit into the memory of a single GPU. It
divides the tensors within each model layer, so every device holds a shard of a
layer rather than a copy of it.

This is necessary because many modern LLMs can't fit on a single GPU, even after
quantization, especially once you account for the KV cache and runtime overhead.
For example, FP8 weights require roughly 1 GB per billion parameters, so a model
like Llama 3.1 405B needs about 405 GB just for weights. That alone exceeds the
memory of any single current GPU, so one device often can't load the model or
serve it efficiently.

During operations such as matrix multiplication, each GPU holds a shard of the
weight tensor and computes part of the result. The GPUs then exchange or combine
intermediate results using collective communication operations such as
all-reduce or all-gather, depending on how the tensors are partitioned.

<Diagram name="tp-inference" alt="Tensor parallelism: model layers split across GPUs" />

By distributing weights, cache, and computation, tensor parallelism makes models
that exceed the capacity of a single GPU practical to serve. It can also lower
the latency of an individual request when the gains from parallel computation
outweigh the added communication cost.

That communication is the central tradeoff. GPUs in tensor parallelism must
exchange intermediate results repeatedly as a request flows through the
transformer layers. Interconnect bandwidth and latency therefore weigh heavily
on performance.

Tensor parallelism works best among GPUs linked by high-bandwidth
interconnects within a single node, such as NVLink. Splitting tensors across
GPUs that sit in separate nodes can turn network communication into the dominant
bottleneck. The number of GPUs you shard across is also constrained; it
generally has to divide the number of attention heads evenly, so you can't scale
to arbitrary GPU counts.

Before sharding a model to perform tensor parallelism, check whether the
weights, KV cache, and other inference memory requirements fit comfortably on a
single GPU, especially after
[quantization](/model-preparation/llm-quantization/). Single-GPU serving avoids
cross-device synchronization entirely, and adding GPUs through tensor
parallelism rarely yields a linear speedup. Use tensor parallelism when the
memory footprint or latency targets justify the communication overhead.

## Pipeline parallelism

Pipeline parallelism (PP) divides the model’s layers into sequential chunks
called stages, each assigned to a separate device. Data flows through these
stages like an assembly line, with the output of one device becoming the input
for the next. For instance, in a four-way pipeline, each device processes a
quarter of the model’s layers.

<Diagram name="pp-diagram" alt="Pipeline parallelism: consecutive layers on each GPU" />

Unlike tensor parallelism, pipeline parallelism doesn't require devices to
combine partial results within every layer. A stage sends activations to the
next stage only after finishing all of its own layers. This lower
communication frequency can make pipeline parallelism a better fit for
low-bandwidth connections, including the interconnects between nodes.

The trade-off is a pipeline bubble. A stage can sit idle while waiting for work
from the previous stage. A slow or memory-heavy stage can also hold up every
stage that follows. Stage boundaries should therefore balance execution time and
memory demand, not only the number of layers.

<Diagram name="pp-batching" alt="Pipeline parallelism microbatch schedule filling the pipeline across iterations" />

To shrink idle periods, the server can keep multiple requests or microbatches in
flight. While a later stage handles one microbatch, an earlier stage can begin
work on the next microbatch. This scheduling mechanism improves throughput,
though it doesn't completely eliminate idle time at the start and end of the
pipeline. For more information, see the
[GPipe paper](https://arxiv.org/pdf/1811.06965).

Note that pipeline parallelism doesn't necessarily reduce latency for an
individual request. Every request still passes through all stages in order and
pays the cost of activation transfers. Pipeline parallelism works best when
enough concurrent work is available to keep the pipeline full or when lower
communication frequency matters more than the pipeline bubble.

## Expert parallelism

Expert parallelism is a specialized parallelism strategy used in Mixture of
Experts (MoE) models. In these models, only a subset of the experts is
activated for each token. Instead of duplicating all experts across every device
(e.g., GPU), expert parallelism splits the experts themselves across different
devices.

<Diagram name="ep-inference" alt="Expert parallelism: a router dispatches requests to experts across GPUs" />

Each GPU holds the full weights of only some experts, not all. This means that
each GPU processes only the tokens assigned to the experts stored on that GPU.
In contrast, if you apply tensor parallelism for MoE models, it simply slices
the weight matrices of all experts and distributes these slices across all
devices.

By using expert parallelism, GPUs can be utilized more efficiently. This reduces
memory and compute overhead compared to replicating the entire model on every
device.

## Hybrid parallelism

For certain models, relying on a single parallelism strategy is often not
enough. Hybrid parallelism combines two or more parallelism techniques to
achieve better scalability, efficiency, and hardware utilization.

A typical hybrid setup might look like this (combining data parallelism and
tensor parallelism):

<Diagram name="dptp" alt="Tensor parallelism within two data-parallel model replicas" />

If you have 8 GPUs, you could apply tensor parallelism across the first four
GPUs (TP=4), then replicate that setup to the remaining ones using data
parallelism (DP=2).

Note that this is only one of the possible combinations, each with advantages
and disadvantages. In the above example, tensor parallelism introduces
communication overhead between GPUs, especially during inference. Therefore,
using a high TP degree doesn't always translate to better performance.

An alternative configuration is to reduce tensor parallelism and increase data
parallelism. For example, you can set TP=2 and DP=4:

<Diagram name="dp4tp2" alt="Tensor parallelism (2) combined with data parallelism (4) across eight GPUs" />

This reduces cross-GPU communication, which may help lower latency during
inference. However, there’s a catch: model weights consume a large portion of
GPU memory, especially for large models. Lowering tensor parallelism means fewer
GPUs share the model, leaving less room for KV cache. This can degrade inference
optimizations like prefix caching.

These trade-offs aren’t unique to tensor and data parallelism. When designing a
hybrid parallelism plan, it’s essential to benchmark different configurations
based on your specific model size, hardware setup, and inference requirements.
There’s no one-size-fits-all setup. The optimal strategy is often found through
tuning and experimentation.

<LinkList>

## Additional resources

- [Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism](https://arxiv.org/pdf/1909.08053)
- [GPipe: Easy Scaling with Micro-Batch Pipeline Parallelism](https://arxiv.org/pdf/1811.06965)
- [DeepSpeed-MoE: Advancing Mixture-of-Experts Inference and Training to Power Next-Generation AI Scale](https://arxiv.org/abs/2201.05596)
</LinkList>
