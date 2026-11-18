---
sidebar_position: 9
description: Deterministic LLM inference returns the same output for the same request every time. Learn why temperature 0 isn't deterministic, when you need determinism, and how to enable it.
keywords:
    - Deterministic LLM inference, LLM determinism, reproducible LLM outputs
    - Temperature 0 not deterministic, nondeterministic LLM outputs
    - Batch invariance, batch-invariant kernels
    - Floating-point nondeterminism, reduction order
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import LinkList from '@site/src/components/LinkList';
import TokenFlipSimulator from '@site/src/components/TokenFlipSimulator';

# Deterministic inference

Deterministic inference means an LLM server returns the same output, bit for
bit, every time you send the same request. This property should hold when the
following remain unchanged:

- Model weights and model version
- Input prompt and conversation context
- Tokenizer and tokenization configuration
- Inference parameters
- Hardware and numerical execution behavior

Most inference servers don't behave this way by default. Even with
`temperature=0`, sending one prompt many times to an LLM server can still
return several different completions.

## Why temperature 0 isn't deterministic

At each decode step, an LLM doesn't output a token directly. The
[output head](/llm-inference-basics/how-does-llm-inference-work/#whats-inside-an-llm)
produces **logits**: one raw score for every token in the vocabulary. A higher
logit generally means the model considers that token a more likely next token.
Logits aren't probabilities yet. A softmax function turns them into
probabilities that sum to 1, and the sampler picks the next token from that
distribution.

Setting `temperature=0` means the sampler skips randomness and picks the
token with the highest logit, also known as
[greedy decoding](/llm-inference-basics/how-does-llm-inference-work/#how-are-tokens-selected-via-sampling).
If the logits were identical on every run, the output would be identical too.

The problem is that the logits aren't always identical. They can differ in the
last few bits between runs, for reasons explained in the next section. Usually
that doesn't matter, because the top token leads by a wide margin. However,
sometimes two candidates are nearly tied. For example, suppose the logits after
"The best way to learn a new language is" look like this (illustrative values):

| Token      | Run 1 logit | Run 2 logit |
|------------|-------------|-------------|
| `to`       | 19.8125     | 19.8125     |
| `by`       | 19.8120     | 19.8130     |
| `through`  | 16.4062     | 16.4062     |

Both `to` and `by` are reasonable continuations, so the model scores them almost
equally. A difference in the fourth decimal place changes which token wins. Run
1 can continue with "to practice every day" and run 2 with "by speaking with
native speakers". Once one token changes, every later token is conditioned on a
different prefix, and the outputs diverge.

The simulator below models the same step 100 times with illustrative logit
variation. Shrink the logit gap or add more variation, and see how often the
winning token flips.

<TokenFlipSimulator />

:::info
Thinking Machines Lab measured
[completion nondeterminism on Qwen3-235B-A22B-Instruct-2507](https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/).
They sent the prompt "Tell me about Richard Feynman" 1,000 times at
`temperature=0` and got 80 unique completions. All of them matched for the first
102 tokens. At token 103, 992 completions said Feynman was born in "Queens, New
York" and 8 said "New York City".
:::

## What causes nondeterminism

Setting `temperature=0` disables random sampling, but it doesn't guarantee that
the underlying computations produce exactly the same results every time. Small
differences in floating-point calculations can lead to different logits and,
eventually, different token selections. Several factors cause these
differences.

### Floating-point addition isn't associative

LLMs perform enormous numbers of floating-point operations during inference,
including matrix multiplications, attention calculations, and normalization.

Due to finite numerical precision and rounding errors, floating-point operations
aren't always associative. This means that changing the order of additions can
produce slightly different numerical results. For example:

$$
(a+b)+c \neq a+(b+c)
$$

GPUs split large sums into many pieces that run in parallel, and the way a
kernel splits the work decides the order of the additions. If that order
changes, the result can change slightly. These small differences can propagate
through the model and affect the final logits.

For more information, see
[Understanding and Mitigating Numerical Sources of Nondeterminism in LLM Inference](https://arxiv.org/abs/2506.09501).

### Batch size changes the reduction order

A **reduction** is an operation that combines multiple values into one, usually
by adding them together. For example, each element of a matrix multiplication
output is a dot product: multiply pairs of numbers, then sum all the products
into a single value.

On a GPU, reductions are often split into smaller chunks that are processed in
parallel. The partial sums are then combined to produce the final result. How a
kernel divides the work determines the order of the additions. As explained
above, different addition orders can produce slightly different floating-point
results.

Most GPU kernels choose how to divide the work based on the input shape,
including the batch size. For example, when the batch is small, a matrix
multiplication kernel might split the reduction dimension across multiple
[streaming multiprocessors (SMs)](/kernel-optimization/gpu-architecture-fundamentals/streaming-multiprocessors/)
using a technique called split-K. This gives more SMs work to do. When the batch
is larger, there's already enough work to keep the SMs busy, so the kernel might
use a different tiling strategy without split-K. These strategies add the same
numbers in different orders, potentially producing slightly different results.

A kernel is **batch-invariant** if it produces the same result for a given
input, regardless of the batch size or the other inputs processed alongside it.
Most kernels don't guarantee this because they choose execution strategies based
on input shapes to maximize performance.

This matters because of
[continuous batching](/inference-optimization/static-dynamic-continuous-batching/#continuous-batching).
Your request shares a batch with whatever other requests the server is
processing at that moment. The batch size depends on server load, so the kernels
may choose different execution strategies for your request across runs. This can
change its numerical results and, eventually, its logits.

Each execution can still be deterministic for its specific inputs and execution
path: running the same batch twice under the same conditions can produce the
same result. From the client's perspective, however, the same request can
produce different outputs depending on what else is running on the server.

### Other sources of execution variability

Batch size is the main source of variation on a fixed deployment, but outputs
can also change when:

- The
  [tensor parallelism](/inference-optimization/data-tensor-pipeline-expert-hybrid-parallelism/#tensor-parallelism)
  degree changes, altering how computations are partitioned and reduced across
  GPUs.
- The GPU type, driver, CUDA version, or inference framework version changes.
- The [quantization](/model-preparation/llm-quantization/) format or attention
  backend changes.
- [Prefix caching](/inference-optimization/prefix-caching/) or chunked prefill
  changes how the KV cache was computed. A cached prefix may have been computed
  in a different chunk or batch shape than a fresh one.

## When do you need deterministic inference

Not every LLM application needs deterministic inference. For many user-facing
applications, small variations in generated responses are perfectly acceptable.
However, there are situations where reproducibility matters.

Here are some common examples:

### Debugging and regression testing

When a model produces an unexpected response, you want to be able to reproduce
the issue. Deterministic inference makes it easier to:

- Reproduce unexpected outputs.
- Trace problems to a particular model, kernel, or configuration.
- Verify that a bug fix resolves the issue.
- Run regression tests and compare outputs across software updates.

### Reinforcement learning training

In reinforcement learning (RL) for LLMs, the model generates responses that are
evaluated by a reward model or a verifier. These rewards guide subsequent model
updates.

Reproducible inference helps teams generate consistent trajectories when
debugging training runs, comparing experiments, and investigating unexpected
reward changes. Without it, differences in generated responses can introduce
additional variability into the training process, making it harder to identify
the source of a problem.

However, RL training often relies on stochastic sampling to explore different
responses. The goal isn't necessarily to eliminate randomness, but to control it
so that experiments can be reproduced when needed.

### Production consistency

Some applications require consistent outputs for the same inputs. For example,
an LLM might be used to classify support tickets, extract structured
information, or route requests to different systems.

If the same input produces different outputs across replicas or repeated
requests, downstream systems may behave unpredictably.

### Auditing and compliance

In regulated environments, teams may need to explain how a system arrives at a
particular output. Being able to reproduce an inference result can help with
debugging, auditing, and investigating unexpected behavior.

However, deterministic inference alone isn't enough for full auditability. You
also need to preserve the model version, input data, inference configuration,
and execution environment.

## How to enable deterministic inference

Most serverless APIs don't guarantee deterministic outputs. Some accept a `seed`
parameter, but treat it as best effort. The provider controls the batching,
hardware, and kernel versions behind the endpoint, and those can change without
notice. If you need strict reproducibility across changes in server load, use a
supported deterministic mode in a controlled serving setup.

Some open-source inference frameworks already support this feature.

<Tabs groupId="inference-framework">
<TabItem value="vllm" label="vLLM">

vLLM calls this feature
[batch invariance](https://docs.vllm.ai/en/latest/features/batch_invariance/).
Enable it with the `VLLM_BATCH_INVARIANT` environment variable:

```bash
VLLM_BATCH_INVARIANT=1 vllm serve meta-llama/Llama-3.1-8B-Instruct
```

Note that this feature is still in beta in vLLM.

</TabItem>
<TabItem value="sglang" label="SGLang">

SGLang enables
[deterministic inference](https://docs.sglang.io/docs/advanced_features/deterministic_inference)
with a server flag:

```bash
python3 -m sglang.launch_server \
    --model-path Qwen/Qwen3-8B \
    --attention-backend fa3 \
    --enable-deterministic-inference
```

</TabItem>
</Tabs>

## FAQs

### Are deterministic outputs the same on different GPUs?

Not necessarily. Batch invariance makes outputs stable across batch sizes and
server load on one serving setup. Changing the GPU type, tensor parallelism
degree, framework version, attention backend, or quantization can still change
the output.

### Does deterministic inference make a model more accurate?

No. It makes outputs repeatable, not better. A deterministic model can give the
same wrong answer every time.

<LinkList>

## Additional resources

- [Defeating Nondeterminism in LLM Inference](https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/)
- [LLM-42: Enabling Determinism in LLM Inference with Verified Speculation](https://arxiv.org/abs/2601.17768)
- [Understanding and Mitigating Numerical Sources of Nondeterminism in LLM Inference](https://arxiv.org/abs/2506.09501)
- [CoRun: Padding is Simple and Efficient for Deterministic LLM Inference](https://arxiv.org/abs/2608.14376)
</LinkList>
