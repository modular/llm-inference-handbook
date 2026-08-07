---
sidebar_position: 2
description: Optimize LLM inference with static, dynamic, and continuous batching for better GPU utilization.
keywords:
    - Static batching, dynamic batching and continuous batching
    - Batch LLM inference, batch requests, batch processing, LLM inference batching, LLM batching
    - Batch size, batch window
    - Chunked prefill, decode-maximal batching
    - Padding tokens, pad tokens, ragged tensors
    - LLM inference optimization, LLM inference optimization techniques, LLM batch API
    - Speed up LLM inference
---

import Tabs from '@theme/Tabs'; import TabItem from '@theme/TabItem'; import
LinkList from '@site/src/components/LinkList'; import BatchingSimulator
from '@site/src/components/BatchingSimulator'; import ChunkedPrefillVisualizer
from '@site/src/components/ChunkedPrefillVisualizer';

# Static, dynamic and continuous batching

GPUs are designed for highly parallel computation workloads, capable of
performing trillions or even quadrillions of floating-point operations per
second (FLOPs). Nevertheless, LLMs often fail to fully utilize these GPUs
because much of the chip's memory bandwidth is spent loading model parameters.

Batching helps mitigate this bottleneck. In production, your service might be
flooded with multiple requests arriving at the same time. Instead of processing
each request individually, batching them together allows you to use the same
loaded model parameters across multiple requests, thus dramatically improving
throughput.

Use the simulator below to understand different batching strategies at a high
level.

<BatchingSimulator />

## Static batching

The simplest form of batching is **static batching**. Here, the server waits
until a fixed number of requests arrive and then processes them together as a
single batch.

<Diagram name="static-batching" alt="Static batching: fixed batch windows where short requests wait for the batch to finish" />

While static batching is easy to implement, it has notable downsides.

- The first request in a batch is forced to wait for the last one, adding
  unnecessary delay. Picture a printer that won’t start printing until you’ve
  queued up a set number of documents, regardless of how long it takes for the
  last document to arrive.
- Not all requests in a batch are created equal. In LLM inference, some requests
  may generate very short responses, while others could involve lengthy,
  step-by-step reasoning. Since all requests in the batch must wait until the
  slowest one finishes, this can lead to wasted compute resources and increased
  latency.

## Dynamic batching

To address the issues in static batching, many systems use **dynamic batching**.
This approach still collects incoming requests into batches, but it doesn’t
insist on a fixed batch size. Instead, it sets a time window and processes
whatever requests have arrived in that time frame. If the batch reaches its size
limit sooner, it launches immediately. This is like a bus that leaves on a
strict schedule or whenever it’s full, whichever happens first.

<Diagram name="dynamic-batching" alt="Dynamic batching: variable batches formed as requests arrive" />

Dynamic batching helps balance throughput and latency. It ensures that early
requests aren’t delayed indefinitely by later ones. However, because some
batches might not be completely full when launched, it doesn’t always achieve
maximum GPU efficiency. Another drawback is that, like static batching, the
longest request in a batch still dictates when the batch finishes; short
requests have to wait unnecessarily.

## Continuous batching

For LLM inference, output sequences vary widely in length. Some users might ask
simple questions, while others request detailed explanations. Static and dynamic
batching force the short requests to wait for the longest one. This leaves GPU
resources unsaturated.

Continuous batching, also known as in-flight batching, addresses these
inefficiencies. Continuous batching doesn’t force the entire batch to complete
before returning results. Instead, it lets each sequence in a batch finish
independently and immediately replaces it with a new one. This is like an
assembly line where, as soon as one item is finished (no matter how long it
takes), a new item is added to keep the line running at full capacity.

<figure>
  <img src={require('./img/continuous-batching-diagram.png').default} alt="Continuous batching: freed token slots are filled immediately by new sequences" />
  <figcaption>
    Generating seven sequences with continuous batching. On the first iteration (left), each sequence generates a token (blue) from its prompt (yellow). Over time (right), sequences complete at different iterations by emitting an end-of-sequence token (red), at which point new sequences are inserted. [Image source](https://www.anyscale.com/blog/continuous-batching-llm-inference)
  </figcaption>
</figure>

This technique uses iteration-level scheduling, meaning the batch composition
changes dynamically at each decoding iteration. As soon as a sequence in the
batch finishes generating tokens, the server inserts a new request in its place.
This maximizes GPU occupancy and keeps compute resources busy by avoiding idle
time that would otherwise be spent waiting for the slowest sequence in a batch
to finish.

Major
[inference frameworks](/getting-started/choosing-the-right-inference-framework/)
such as vLLM, SGLang, MAX, TensorRT-LLM (in-flight batching) and LMDeploy
(persistent batching) all support continuous batching or similar mechanisms. For
memory management in long or mixed-length batches, see
[PagedAttention](/inference-optimization/pagedattention/).

## Chunked prefill

Continuous batching introduces a scheduling conflict when a new request arrives
while other requests are decoding. Processing the entire prompt of a new request
in one prefill iteration minimizes the Time to First Token (TTFT), but a long
prefill can delay the next token for every active decode request. In a streaming
application, users may see the output pause while another user's prompt is
processed.

**Chunked prefill** splits a prompt into smaller token ranges and schedules them
across multiple iterations. Each chunk extends the KV cache of the request, and
later chunks attend to the prompt tokens processed earlier. Because the
attention computation is unchanged (every token still attends to all earlier
tokens through the KV cache), the chunked prefill is mathematically equivalent
to processing the prompt in one pass, and the first token is emitted only after
the final chunk.

<ChunkedPrefillVisualizer />

The scheduler can combine one prefill chunk with decode tokens from active
requests in the same batch. [SARATHI](https://arxiv.org/abs/2308.16369) calls
this **decode-maximal batching**: the prefill chunk supplies enough parallel
work to saturate the compute capacity of the GPU, while decode tokens piggyback
on the same model execution at little extra cost. This prevents a long prompt
from monopolizing one iteration and can also reduce pipeline bubbles under
[pipeline parallelism](/inference-optimization/data-tensor-pipeline-expert-hybrid-parallelism/#pipeline-parallelism).

The benefit of chunked prefill is that even when a request has a long prompt,
the prefill computation is divided into smaller chunks. Instead of waiting for
one long prefill iteration to finish, active decode requests can continue
generating tokens between prefill chunks. This reduces Inter-Token Latency (ITL)
and makes streamed responses smoother.

The trade-off is that chunking introduces additional scheduling and attention
overhead because the prompt is processed through multiple smaller prefill steps
instead of one large step. As a result, TTFT may increase, especially when
smaller chunk sizes are used.

Most inference frameworks let you tune the chunk size, though they express it as
a token budget per batch rather than a chunk count:

<Tabs groupId="inference-framework">
<TabItem value="max" label="MAX">

```bash
max serve --model meta-llama/Llama-3.1-8B-Instruct \
  --enable-chunked-prefill \
  --max-batch-input-tokens 8192 \
  --chunked-prefill-min-chunk-size 512
```

`--max-batch-input-tokens` sets the target number of un-encoded tokens per
batch, and `--chunked-prefill-min-chunk-size` puts a floor on how small a chunk
the scheduler may create.

</TabItem>
<TabItem value="vllm" label="vLLM">

```bash
vllm serve --model meta-llama/Llama-3.1-8B-Instruct \
  --enable-chunked-prefill \
  --max-num-batched-tokens 8192
```

`--max-num-batched-tokens` caps how many tokens the scheduler may issue in a
single iteration, so a longer prompt is split across iterations.

</TabItem>
<TabItem value="sglang" label="SGLang">

```bash
sglang serve --model-path meta-llama/Llama-3.1-8B-Instruct \
  --chunked-prefill-size 8192
```

`--chunked-prefill-size` is the maximum number of tokens in one prefill chunk.
Set it to `-1` to disable chunked prefill in SGLang.

</TabItem>
</Tabs>

When choosing values, note that:

- **Smaller chunks** give the scheduler more opportunities to run decodes,
  reducing ITL spikes for active requests.
- **Larger chunks** process the new prompt more efficiently and usually improve
  the TTFT, but active decodes may wait longer between tokens.
- **Chunks that are too small** can lower GPU utilization and add attention
  overhead because later chunks must reread KV cache entries created by earlier
  chunks.

There is no universal best value. The right size depends on the model, GPU,
prompt-length distribution, concurrency, and latency targets. It should be
treated as a workload-specific scheduling parameter rather than a universal
constant.

## FAQs

### What are padding tokens in LLM batching?

Text sequences naturally have different lengths after tokenization. For example:

```bash
Sentence A: "Hello world"        # [15496, 995] - length 2
Sentence B: "How are you today?" # [2437, 389, 345, 1909] - length 4
```

You cannot directly stack these sequences into one dense rectangular tensor
because their lengths differ. Padding solves this by adding placeholder tokens
to shorter sequences so every request in the batch has the same tensor length.
Common padding token forms include `PAD`, `<pad>`, or token ID `0`, though the
exact ID depends on the tokenizer.

An attention mask tells the model which positions are padding, but padding can
still waste compute and memory. If a batch contains sequences with lengths like
this:

```bash
[1024, 1000, 50, 20]
```

The shorter sequences may be padded to length `1024`. That keeps the tensor
shape regular for GPU kernels, but the `50`-token and `20`-token requests now
carry a lot of unused positions.

### What are ragged tensors in LLM inference?

Ragged tensors represent variable-length sequences without padding them all to
one fixed length. Instead, the runtime stores the real tokens plus metadata such
as sequence lengths, offsets, or KV cache block locations. This helps inference
engines handle mixed-length prompts and continuous batching more efficiently,
especially when paired with paged KV cache layouts such as
[PagedAttention](/inference-optimization/pagedattention/).

<LinkList>

## Additional resources

- [How continuous batching enables 23x throughput in LLM inference while reducing p50 latency](https://www.anyscale.com/blog/continuous-batching-llm-inference)
- [SARATHI: Efficient LLM Inference by Piggybacking Decodes with Chunked Prefills](https://arxiv.org/abs/2308.16369)
- [Mastering LLM Techniques: Inference Optimization](https://developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/)
</LinkList>
