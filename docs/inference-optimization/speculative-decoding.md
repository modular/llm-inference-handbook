---
sidebar_position: 4
description: Speculative decoding accelerates LLM inference with draft model predictions verified by the target model.
keywords:
    - Speculative decoding, speculative sampling
    - Adaptive speculative decoding
    - EAGLE, Medusa, Multi-Token Prediction, MTP
    - Lookahead decoding, prompt lookup decoding
    - Draft model, target model
    - Distributed inference, distributed LLM inference
    - LLM inference optimization, LLM inference optimization techniques
    - Speed up LLM inference
---

import LinkList from '@site/src/components/LinkList';

# Speculative decoding

Speculative decoding is an inference-time optimization that speeds up LLM token
generation without reducing output quality. It works by pairing two models:

- **Draft model**: A smaller, fast model proposes several draft tokens ahead.
- **Target model**: A larger model verifies these proposed tokens in parallel
  and accepts those that match its own predictions.

This draft-then-verify pattern guarantees the final output matches exactly what
the original target model would have produced on its own. Therefore, it does not
sacrifice output quality.

## Why speculative decoding

[Transformer-based LLMs generate text autoregressively](/llm-inference-basics/how-does-llm-inference-work/#the-two-phases-of-llm-inference):
one token at a time, each depending on the previous ones. Every new token
requires a full forward pass, sampling, and then appending that token to the
input before the next step begins.

This sequential process has two major issues:

- **High Inter-Token Latency (ITL)**:
  [The delay between tokens](/llm-inference-basics/llm-inference-metrics/) makes
  generation feel slow.
- **Poor GPU utilization**: The model can’t compute future tokens in advance
  even if the GPU is idle.

What if you could parallelize parts of the generation process, even if not all
of it?

Inspired by speculative execution (operations are computed ahead of time and
discarded if unnecessary), speculative decoding allows parts of token generation
to run in parallel. When the target model verifies multiple draft tokens at
once, it makes better use of GPU resources and reduces ITL. This is especially
useful for latency-sensitive applications like chatbots and code completion
tools.

This technique builds on
[two key observations about LLM inference](https://research.google/blog/looking-back-at-speculative-decoding/):

1. **LLM inference is memory-bound**. GPUs have massive compute capacity but
   limited memory bandwidth. Much of their compute sits unused while waiting on
   memory access.
2. **Some tokens are easier to predict than others**. Many next tokens are
   obvious from context and can be proposed by a smaller model.

The draft-then-verify idea was first introduced by
[Stern et al. (2018)](https://arxiv.org/abs/1811.03115), and later
[extended by DeepMind](https://arxiv.org/pdf/2302.01318) into a statistically
grounded method called **Speculative Sampling**. Speculative decoding is the
application of speculative sampling to inference from autoregressive models,
like transformers.

## How does speculative decoding work

At a high level, speculative decoding runs in a loop:

1. The draft model predicts the next *K tokens* after the input sequence.
2. The target model then verifies these *K tokens* in parallel to see if it
   would also predict them.
3. The target model accepts the longest prefix of these *K tokens* that it
   agrees with.
4. If it accepts *h* tokens, it then generates the *(h+1)*th token itself (so
   that generation remains on track).
5. The process repeats: the draft model proposes the next *K tokens* based on
   this new extended sequence.

<Diagram name="spec-decoding" alt="Speculative decoding: draft model proposes tokens the target model verifies in parallel" />

## Understanding the performance of speculative decoding

Speculative decoding can accelerate LLM inference, but only when the draft and
target models align well. Before enabling it in production, always benchmark
performance under your workload. For a quick test, you can choose
[inference frameworks](/getting-started/choosing-the-right-inference-framework/)
like vLLM, SGLang, and MAX, which provide built-in support for this inference
optimization technique.

### Key metrics

When evaluating speculative decoding, three metrics matter most:

- **Acceptance rate (α)**: The probability of accepting draft tokens by the
  target model. This figure varies by several factors like decoding strategy
  (e.g., nucleus vs. random sampling) and application domain.

  A high α value means more tokens are accepted per round and you have fewer
  target model forward passes. This results in lower latency, higher throughput,
  and better GPU utilization. On the contrary, a low α indicates many tokens are
  rejected. This means you waste compute on drafting and verification. It also
  means reverting to sequential decoding more frequently.

- **Speculative token count (γ)**: The number of tokens the draft model proposes
  each step. It is configurable in most inference frameworks.
- **Acceptance length (τ)**: The average number of tokens accepted per round of
  decoding. According to the paper
  [Fast Inference from Transformers via Speculative Decoding](https://arxiv.org/pdf/2211.17192),
  you can calculate it with a theoretical formula:

  $$
  \tau = \frac{1 - \alpha^{\gamma+1}}{1 - \alpha}
  $$

### How acceptance rate impacts performance

In theory, the effectiveness of speculative decoding depends heavily on
acceptance rate. To isolate this variable, you can simulate speculation by
accepting each drafted token at a preset probability instead of running a real
draft model. For example, a
[BentoML benchmark](https://www.bentoml.com/blog/3x-faster-llm-inference-with-speculative-decoding)
used a patched vLLM setup for this purpose;
[Modular MAX supports speculative decoding](https://max.modular.com/serve/speculative-decoding/)
and exposes a `--synthetic-acceptance-rate` knob for the same kind of controlled
test.

The simulated benchmark showed four patterns:

1. Higher α produces greater speedup.
2. Increasing γ helps only when τ is high; otherwise, performance may be
   negatively affected.
3. Latency drops and throughput rises almost linearly with α.
4. At α ≥ 0.6 and γ ≥ 5, speculative decoding achieved 2–3× speedups over
   baseline decoding.

In practice, however, the speedup was lower than expected.

### How performance varies under different workloads

The synthetic acceptance-rate test isolates the effect of α and γ, but real
deployments also have to contend with concurrency and parallelism. To see how
those factors interact,
[a separate set of benchmarks](https://www.bentoml.com/blog/3x-faster-llm-inference-with-speculative-decoding)
measured speculative decoding under different concurrency levels and tensor
parallelism (TP) configurations, serving Llama-3.3-70B-Instruct with vLLM on
H100 GPUs.

<figure>
  <img src={require('./img/tp-1-spec-decoding.png').default} alt="Speculative decoding benchmark on a single H100 GPU" />
  <figcaption>Llama-3.3-70B-Instruct served with vLLM on a single H100 GPU</figcaption>
</figure>

With TP = 1, the total throughput plateaued earlier (around 20–30 concurrent
requests) compared to the baseline. This indicates that the coordination between
the draft and target models might bring overhead at higher loads. Still, Time
Per Output Token (TPOT) improved by roughly 2×.

<figure>
  <img src={require('./img/tp-2-spec-decoding.png').default} alt="Speculative decoding benchmark on two H100 GPUs" />
  <figcaption>Llama-3.3-70B-Instruct served with vLLM on 2 H100 GPUs</figcaption>
</figure>

With TP = 2, the performance of speculative decoding improved, showing clear
throughput gains over baseline. However, a higher speculative token count
(γ = 5) saw larger latency spikes under heavy concurrency (40+ requests).

Overall, the results show that speculative decoding reduced TPOT across
different workloads. Adding parallelism (TP = 2) improves throughput, but you
need to tune γ to avoid latency spikes at high load.

:::note
These results are from informal tests and for reference only. Performance varies
depending on your model, hardware, workload, and framework choices. Always
benchmark speculative decoding under your own conditions for production
adoption.
:::

## Tips for using speculative decoding

Speculative decoding can deliver real gains, but only if you set it up
carefully. The trick is knowing where it helps most and where it might backfire.

### Watch out for memory overhead

You need to load both the draft model and the target model into GPU memory. On a
single GPU, it can quickly squeeze out space for other tasks (e.g., batch
processing) and hurt performance under heavy load or with larger models.

For a multi-GPU setup (e.g., TP > 1), the story is different. Splitting models
across multiple GPUs reduces the bottleneck. In the tests above, speculative
decoding with γ = 3 or γ = 5 kept outperforming baseline even at 50 concurrent
requests.

### Don’t ignore wasted compute

When the target model rejects too many draft tokens, your GPU still spends time
generating and verifying them. The work doesn’t pay off and it defeats the point
of speculative acceleration. It is also why acceptance rate matters so much.

### Get the draft model right

How closely your draft model’s distribution matches with the target model
determines the acceptance rate. Out-of-the-box draft models may work fine in
some cases, but they often struggle with domain-specific tasks or very long
contexts.

If your workload has its own characteristics, you’ll likely get better results
by fine-tuning a draft model on your data. That way, it learns to mimic the
target more closely, boosting acceptance rates and speedups. On the flip side,
if you already see good acceptance, you can skip the training and still benefit.

## Speculative decoding methods

The draft-then-verify pattern above describes the classic setup, where a
separate, smaller model does the drafting. However, it is only one way to
generate draft tokens. Over time, researchers have developed a number of methods
that differ mainly in how the draft tokens are proposed.

Broadly, the approaches fall into four groups:

- **Standalone draft model**. A separate smaller model proposes tokens (the
  classic one described above).
- **Target-specific auxiliary drafter**. A lightweight model trained
  specifically for the target proposes tokens or hidden features. EAGLE belongs
  to this group and normally uses a separate checkpoint.
- **Model-integrated drafter**. Extra prediction heads or modules are included
  in the target checkpoint, as with Medusa or native MTP models.
- **Training-free or retrieval-based methods**. Candidates are generated
  algorithmically or retrieved from the prompt and previously generated context,
  without a trained draft component.

Let’s take a look at them in more detail.

### Medusa

[Medusa](https://arxiv.org/abs/2401.10774) removes the separate draft model. It
attaches several lightweight **decoding heads** on top of the target model's
final hidden state. Each head predicts a token at a future position (t+2, t+3,
t+4, …), while the original LM head of the model still handles the immediate
next token (t+1).

The top candidates from these heads are combined into a tree of possible
continuations. The target model then evaluates the tree in one forward pass
using tree attention, which applies an attention mask that preserves the causal
relationships within each candidate branch. Similar to the classic speculative
decoding method, the longest accepted candidate prefix will be used for the next
decoding phase.

Medusa comes in two flavors:

- **Medusa-1** trains only the new heads on a frozen backbone LLM, leaving the
  backbone weights unchanged. The paper reports speedups above 2.2× without
  compromising generation quality.
- **Medusa-2** fine-tunes the heads and backbone together. This improves draft
  accuracy but modifies the original target model. The paper reports speedups of
  approximately 2.3–3.6× by using a training recipe that preserves the
  capabilities of the backbone LLM.

### Multi-Token Prediction (MTP)

[Multi-Token Prediction](https://arxiv.org/abs/2404.19737) started as a training
objective: instead of only predicting the next token, the model is trained to
predict several future tokens at once. This gives the model denser training
signal and, as a side benefit, built-in machinery for drafting.

[DeepSeek-V3](https://arxiv.org/abs/2412.19437) popularized MTP at scale, using
sequential MTP modules that preserve the full causal chain at each prediction
depth. At inference time, these MTP modules can be repurposed as native draft
heads for speculative decoding, so the model speculates on its own next tokens
with no separate draft model and no bolt-on heads. Because the MTP modules are
trained jointly with the main model, their predictions align closely with the
target distribution, which tends to yield high acceptance rates.

### N-gram speculation

N-gram speculation generates draft tokens without running a separate draft model
or adding trained prediction heads. It searches the existing context for
repeated token sequences and reuses the continuation that followed an earlier
match.

A typical implementation follows four steps:

1. Take a suffix from the current sequence, such as the most recent two, three,
   or four tokens.
2. Search the prompt or previously generated text for an earlier occurrence of
   that suffix.
3. Copy the tokens that followed the earlier occurrence and use them as a draft.
4. Ask the target model to verify the proposed tokens.

N-gram speculation is helpful when the desired output repeats or closely follows
language already available in the prompt. Common examples include:

- Summarizing or rewriting supplied text
- Editing code or configuration files
- Filling predefined templates
- Answering questions from retrieved documents
- Reproducing names, dates, identifiers, or technical terms from the input
- Generating structured output from a schema or example already included in the
  prompt

### EAGLE

[EAGLE (Extrapolation Algorithm for Greater Language-model Efficiency)](https://arxiv.org/pdf/2401.15077)
makes a key observation: autoregression is easier to model at the feature level
(the hidden states of the second-to-top layer) than at the token level. So
instead of predicting the next token, the lightweight EAGLE draft model predicts
the next feature, then reuses the LM head of the target model to turn that
feature into token probabilities.

Under stochastic sampling, the current feature does not reveal which token was
sampled from the corresponding distribution. For example, if the generated text
currently ends with `I`, sampling might produce `am`, `always`, or `think`. The
next feature depends on the token actually drawn: `I am` and `I always` lead to
different hidden states.

The fix from EAGLE is simple: tell it. Along with the features, feed in the
tokens that were actually sampled, offset by one position so that each feature
is paired with the token that came after it. This way, at each step the draft
head sees "here's the hidden state, and here's the token that the sampler
actually picked from it", which is exactly the missing information needed to
know where the sequence went.

EAGLE has evolved across three versions:

- **EAGLE-1**: Feature-level autoregression with a small draft model.
- **EAGLE-2**: Adds a context-aware dynamic draft tree. It uses the confidence
  scores from the draft model to allocate candidate branches to positions where
  acceptance is more likely. [The paper](https://arxiv.org/abs/2406.16858)
  reports speedups of approximately 3.05–4.26× in evaluations.
- **EAGLE-3**: Drops the feature-prediction constraint and predicts tokens
  directly. It fuses low-, mid-, and high-level features from the target model.
  [The paper](https://arxiv.org/abs/2503.01840) reports speedups of
  approximately 3.0×–6.5× over vanilla autoregressive generation across the
  evaluated models and tasks.

EAGLE is widely adopted and supported natively in frameworks like vLLM, MAX, and
SGLang. The EAGLE papers report strong speedups, but actual gains depend on the
target model, draft checkpoint, workload, hardware, and serving implementation.

### Choosing a method

There's no universally best method. The right choice depends on your needs:

| Method                       | Extra draft model | Training required             | Note                                              |
|------------------------------|-------------------|-------------------------------|---------------------------------------------------|
| Vanilla speculative decoding | Yes               | No (optional fine-tuning)     | Matching a good draft model can be tricky         |
| Medusa                       | No (extra heads)  | Yes (heads)                   | Moderate speedup                                  |
| MTP                          | No                | Yes (jointly, at pretraining) | Models trained with MTP (e.g., DeepSeek-V3)       |
| N-gram                       | No                | No                            | Zero-setup gains, input-grounded tasks            |
| EAGLE                        | Yes               | Yes (draft model)             | Strong reported speedups, broad framework support |

[Inference frameworks](/getting-started/choosing-the-right-inference-framework/)
like vLLM, MAX, and SGLang implement several of these methods, so you can
benchmark them against your own workload before committing.

## Adaptive speculative decoding

Most speculative decoding deployments use a fixed speculative token count or
number of draft steps (γ). It may work for a benchmark, but it is rarely optimal
for every request in production.

Real workloads are dynamic. The predictability of the next token changes
throughout generation, and batch sizes fluctuate as requests enter and leave the
system. A large speculative window can work well when the draft model is highly
accurate and batch sizes are small. The same window may become inefficient when
acceptance rates fall or batch sizes grow, because every unnecessary draft step
consumes additional compute across more sequences.

A fixed γ is therefore a compromise. It may be too conservative when the GPU has
spare capacity and could benefit from more aggressive drafting, and too
aggressive when the system is busy and rejected draft tokens become wasted work.

Adaptive speculative decoding addresses this problem by adjusting speculative
decoding parameters at runtime instead of relying on a single configuration. The
goal is to keep speculation aligned with current conditions.

### What can be adaptive?

Adaptive speculative decoding can modify one or more aspects of the speculation
process.

- **Speculative length**. How many tokens the draft model proposes before
  handing off to the target for verification. Tuning this is the most common and
  lowest-risk form of adaptivity. It changes speed only, and the output remains
  identical to what the target would have produced (lossless). For example, the
  system may increase speculative length when acceptance rates are high and
  resources are available, then reduce it when acceptance rates decline or the
  system becomes saturated.
- **Acceptance criterion**. How strictly the target verifies each draft token.
  Relaxing verification lets more "close enough" tokens through, which
  accelerates generation but allows the output to drift from the exact
  distribution by the target model (lossy). This trades a small amount of
  quality for additional speed and should be used deliberately.

### Existing solutions

Adaptive speculative decoding is an active area, and current solutions span a
spectrum from production-ready features to research prototypes.

#### SGLang adaptive speculative decoding

SGLang provides a
[built-in adaptive speculative decoding mechanism](https://docs.sglang.io/docs/advanced_features/adaptive_speculative_decoding)
that dynamically adjusts speculative length during inference.

After each verification round, SGLang measures the number of accepted draft
tokens and maintains an exponential moving average (EMA) of the accepted length.
Based on this value, it switches between a small set of predefined
speculative-length tiers (for example, `[1, 3, 7]` by default).

Each tier has its own pre-captured CUDA graph, so switching between tiers is
inexpensive and does not require graph recapture. The method is reactive,
batch-level, and lossless because it only adjusts speculative length and
preserves the original verification algorithm.

#### AdaSpec

[AdaSpec](https://arxiv.org/abs/2503.05096) is a research LLM inference system
built on vLLM that takes a more sophisticated, predictive approach. It attempts
to predict the efficiency of different speculative lengths before drafting
begins.

AdaSpec uses draft-model confidence scores to estimate acceptance rates and
combines those estimates with a performance model that accounts for factors such
as batch size and context length. It then selects a speculative configuration
that maximizes performance while maintaining service-level objectives (SLOs),
such as TPOT targets.

The authors report that AdaSpec consistently achieves high SLO attainment and
delivers up to 66% speedup compared to prior speculative serving systems on
real-world serving traces.

#### AdaSD

[AdaSD](https://arxiv.org/abs/2512.11280) is a research decoding algorithm
designed primarily for off-the-shelf draft and target model pairs. Unlike most
adaptive approaches, AdaSD adapts both speculative length and the acceptance
criterion. It introduces two dynamically adjusted thresholds derived from
runtime statistics:

- **Draft-token entropy** determines when the draft model should stop generating
  additional speculative tokens.
- **Jensen–Shannon (JS) distance** between the draft and target distributions
  determines whether a draft token is sufficiently close to the target
  distribution to be accepted.

Because AdaSD can accept tokens that don't strictly satisfy the original
speculative decoding acceptance rule, it is a lossy approach. The authors report
up to 1.46× speedup over vanilla speculative decoding while limiting accuracy
degradation to less than 1.8% on their benchmarks.

AdaSD requires the draft and target models to share the same vocabulary. This is
because entropy and JS-distance calculations operate directly on the token
probability distributions produced by the two models. If the vocabularies
differ, these distributions cannot be compared consistently.

### When is adaptive speculative decoding worth it?

Adaptive speculative decoding is most useful when serving conditions vary
significantly over time. Examples include bursty traffic patterns, rapidly
changing batch sizes, mixed workloads, or applications where acceptance rates
swing widely.

In those cases, dynamically adapting to current conditions often outperforms any
single fixed speculative length. On the other hand, if your workload is stable
and you have already tuned a static γ for your model and hardware, adaptive
mechanisms may provide only marginal benefits.

As with speculative decoding in general, the only reliable way to know is to
benchmark under your own model, hardware, and workload before applying it in
production.

<LinkList>

## Additional resources

- [Looking back at speculative decoding](https://research.google/blog/looking-back-at-speculative-decoding/)
- [Adaptive Speculative Decoding in SGLang](https://docs.sglang.io/docs/advanced_features/adaptive_speculative_decoding)
- [AdaSpec: Adaptive Speculative Decoding for Fast, SLO-Aware Large Language Model Serving](https://arxiv.org/abs/2503.05096)
- [AdaSD: Adaptive Speculative Decoding for Efficient Language Model Inference](https://arxiv.org/abs/2512.11280)
- [EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty](https://arxiv.org/pdf/2401.15077)
- [Fast Inference from Transformers via Speculative Decoding](https://arxiv.org/abs/2211.17192)
- [Accelerating Large Language Model Decoding with Speculative Sampling](https://arxiv.org/abs/2302.01318)
</LinkList>
