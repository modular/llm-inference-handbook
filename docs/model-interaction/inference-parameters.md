---
sidebar_position: 8
description: LLM inference parameters are request-time settings that control randomness, output length, repetition, stopping behavior, reproducibility, and structured generation.
keywords:
    - LLM inference parameters
    - LLM generation parameters
    - Temperature, top-p, top-k
    - max tokens, stop sequences
    - presence penalty, frequency penalty, repetition penalty
---

import LinkList from '@site/src/components/LinkList';
import TopPvsTopK from '@site/src/components/TopPvsTopK';

# LLM inference parameters

Inference parameters are the settings you pass with an LLM request to control
how the model generates responses. They do not change the model weights.
Instead, they impact the
[decoding process](/llm-inference-basics/how-does-llm-inference-work/), such as:

- How the next token is selected
- How long the model can keep generating
- When it should stop
- How much repetition is allowed.

Some parameters mainly affect output quality and style, while others have direct
serving implications for scheduling,
[throughput](/llm-inference-basics/llm-inference-metrics/), memory usage, and
production cost.

## Common inference parameters

You will see these parameters in hosted APIs,
[OpenAI-compatible servers](/model-interaction/openai-compatible-api/),
[inference frameworks](/getting-started/choosing-the-right-inference-framework/)
like vLLM, SGLang, and MAX, and agentic frameworks. Here is a quick summary of
the common ones:

| Parameter                 | What it controls                                    | Common use                                            |
|---------------------------|-----------------------------------------------------|-------------------------------------------------------|
| `temperature`             | Randomness in token selection                       | Lower for stable answers, higher for creative writing |
| `top_p`                   | Cumulative probability mass considered for sampling | Limit sampling to a likely set of tokens              |
| `top_k`                   | Maximum number of candidate tokens considered       | Remove very low-ranked tokens                         |
| `max_tokens`              | Maximum number of output tokens                     | Bound latency and cost                                |
| `min_tokens`              | Minimum number of output tokens                     | Avoid responses that stop too early                   |
| `stop` / `stop_token_ids` | Text or token patterns that end generation          | Stop before delimiters, sections, or tool boundaries  |
| `presence_penalty`        | Penalizes tokens that already appeared              | Encourage new topics or wording                       |
| `frequency_penalty`       | Penalizes tokens based on repeat frequency          | Reduce repeated words or phrases                      |
| `repetition_penalty`      | Penalizes repeated prompt or output tokens          | Common in open-source serving stacks                  |
| `seed`                    | Random seed for sampling                            | Improve reproducibility during testing                |
| `logprobs`                | Token probability details                           | Debug, score, or inspect outputs                      |
| `n` / `best_of`           | Number of candidate outputs                         | Generate alternatives, at higher cost                 |

Not every provider supports every field and the exact names may vary. Even when
the field name is the same, behavior can differ across models and frameworks.
Treat these configurations as part of your evaluation surface, not as portable
guarantees.

## Temperature

`temperature` controls how much the model spreads probability across likely and
unlikely tokens before sampling.

Lower temperature makes the probability distribution sharper. In other words,
the model is more likely to choose the highest-probability token, so outputs
become more stable and predictable.

Higher temperature flattens the distribution. Less likely tokens get more chance
to appear, which can make outputs more varied, surprising, or creative.

Common patterns:

- Use low temperature for factual question answering, extraction,
  classification, and
  [structured workflows](/model-interaction/structured-outputs/).
- Use moderate temperature for chat, summarization, and product copy if you can
  accept some variation.
- Use higher temperature for brainstorming, fiction, naming, and other creative
  tasks.
- Use `temperature: 0` or near-zero values when you want greedy or
  near-deterministic decoding.

Low temperature does not guarantee factual accuracy. It only reduces randomness
in the decode step. A model can still give a confident wrong answer if the
[prompt](/model-interaction/prompt-engineering/) lacks grounding, the model
lacks knowledge, or the application does not verify outputs.

## Top-p and top-k sampling

`top_p` and `top_k` limit which tokens are eligible before sampling.

### Top-p

`top_p`, also called nucleus sampling, keeps the smallest set of tokens whose
cumulative probability reaches a threshold. For example, `top_p: 0.9` means the
sampler considers the most likely tokens that together cover about 90% of the
probability mass.

This adapts to the model's uncertainty. If the next token is obvious, the
candidate set may be small. If many tokens are plausible, the set grows.

### Top-k

`top_k` keeps only the `k` most likely tokens. For example, `top_k: 50` means
the model samples from the top 50 candidates and ignores everything below them.

This is simple and predictable, but it does not adapt to the shape of the
probability distribution. Sometimes the top 50 tokens contain too many weak
options. Sometimes there may be more than 50 reasonable options.

The visualizer below shows the same distribution under both filters. Switch
between a peaky, mixed, and flat distribution, and notice how top-p keeps fewer
tokens when one answer dominates and more when many are plausible. Top-k always
keeps the same number, regardless of shape.

<TopPvsTopK />

### Which one should you tune

Many systems let you use `temperature`, `top_p`, and `top_k` together. This can
be useful, but it also makes behavior harder to reason about.

A practical starting point:

- Tune `temperature` first.
- Use
  [greedy decoding](/llm-inference-basics/how-does-llm-inference-work/#how-are-tokens-selected-via-sampling)
  if you want the model to select the highest probability token at each step. It
  is deterministic in a fixed serving setup, but can be prone to repetition.
- Use `top_p` when you want to bound the long tail and keep sampling adaptive.
- Use `top_k` when your inference framework or model family recommends it, or
  when you need a hard cap on candidate tokens.
- Combine `top_k` and `top_p`: In many samplers, top-k removes the low-ranked
  tail first, then top-p refines the candidate set further.
- Avoid changing all of them at once during evaluation.

## Output length

Length parameters directly affect
[latency](/llm-inference-basics/llm-inference-metrics/) and cost because LLMs
generate one token at a time during decode.

`max_tokens` sets the maximum number of tokens the model can produce. This is
one of the most important production controls. If it is too low, responses get
cut off. If it is too high, bad prompts or edge cases can waste GPU time and
increase tail latency.

`min_tokens` asks the model to generate at least a certain number of tokens
before it can stop. Use it carefully. It can help avoid empty or overly short
responses, but it can also force the model to keep writing after the natural
answer is done.

Good defaults depend on the application:

- **Short classification or extraction**: Small `max_tokens`, often below 100.
- **Customer support answer**: Enough room for a complete answer, but bounded to
  avoid rambling.
- **Code generation or long-form writing**: Larger limits, with stronger
  monitoring for latency and cost.
- **Batch jobs**: Explicit length limits so one bad input does not dominate the
  run.

For inference systems, output length also affects scheduling. Long generations
hold active request state longer, consume
[KV cache](/llm-inference-basics/how-does-llm-inference-work/#prefill) longer,
and can interfere with latency-sensitive traffic.

## Stop sequences

Stop sequences tell the server to end generation when specific text appears.
Some APIs use string stops such as `stop`, while lower-level engines may also
support token IDs such as `stop_token_ids`.

They are useful when the output has a clear boundary:

- Stop at `"\n\nUser:"` in a chat transcript format.
- Stop at `"</json>"` or another delimiter in a structured prompt.
- Stop after one list item, one SQL statement, or one
  [tool call](/model-interaction/function-calling/).

Stop sequences are not a replacement for schema enforcement. They only end
generation when a sequence appears. If you need guaranteed JSON, use
[structured outputs](/model-interaction/structured-outputs/) or constrained
decoding when your provider supports it.

Be careful with common substrings. A stop sequence that appears inside normal
content can cut off valid answers.

## Repetition penalties

Penalty parameters modify token scores based on what has already appeared. They
are a practical tool for reducing loops and repetitive phrasing.

- `presence_penalty` penalizes a token if it has appeared at all. Higher values
  encourage the model to introduce new tokens or topics.
- `frequency_penalty` penalizes tokens more as they appear more often. This is
  useful when the model repeats the same word or phrase too many times.
- `repetition_penalty` penalizes tokens that appeared in the prompt or generated
  text. Values above `1` usually discourage repetition, while values below `1`
  encourage it.

These parameters can help, but they are blunt instruments. If the model repeats
itself because the prompt is ambiguous, the context is noisy, or the task asks
for repetitive output, penalties may only hide the symptom. Too much penalty can
also make writing awkward because the model avoids legitimate repeated terms.

## Multiple candidates

Some APIs can return multiple completions for one prompt.

`n` usually means the number of outputs returned. `best_of` usually means the
number of candidates generated internally before returning the best `n`.

This can help when you want several creative options or when another system will
score candidates. The trade-off is cost. If you ask for five candidates, the
system may do close to five times the generation work. `best_of` can be even
more expensive because it may generate candidates that are never returned.

Use them deliberately:

- **Good fit**: Brainstorming, reranking, test-time selection, evaluation data
  generation.
- **Poor fit**: High-volume production requests since every extra token matters.
- **Risky fit**: Latency-sensitive chat, because candidate generation can
  increase tail latency.

## Reproducibility and log probabilities

LLM sampling involves randomness. As mentioned above, at each step the model
picks the next token probabilistically based on parameters like `temperature`
and `top_p`. `seed` initializes the random number generator that drives this
sampling. With the same `seed`, identical inputs, identical parameters, and a
stable serving setup, you can often get the same or near-identical output. This
is useful for testing prompts, comparing model versions, or debugging an
unexpected output.

However, do not treat seeds as a perfect production guarantee. Reproducibility
can still change when the model version, tokenizer, serving framework, hardware
kernels, batching behavior, or floating-point implementation changes.

`logprobs` returns probability information for generated tokens. Some systems
also support `prompt_logprobs`, which reports probability information for prompt
tokens.

These fields are useful for:

- Inspecting why a model chose a token.
- Building confidence heuristics.
- Comparing candidate completions.
- Debugging classification prompts.
- Measuring how strongly the model prefers a constrained label.

They can increase response size and are not always supported by chat APIs.
Enable them when you need the signal, not by default for every production
request.

## Advanced controls

More advanced inference parameters can restrict or alter token selection
directly. Some common ones include:

- `logit_bias` increases or decreases the score of specific tokens. This can
  nudge the model toward or away from specific words, labels, or formatting
  markers.
- `bad_words` blocks certain word sequences.
- `allowed_token_ids` restricts generation to a specific token set. These are
  powerful but easy to misuse because tokenization does not always match
  human-visible words.

Use advanced controls when the output is consumed by software. For example,
extraction pipelines, [function calling](/model-interaction/function-calling/),
and [structured data generation](/model-interaction/structured-outputs/) usually
need stronger guarantees than prompt instructions alone can provide.

## Recommended starting points

There is no universal best parameter configuration. Good defaults depend on the
task, the model family, and the serving stack. Different models can behave very
differently even with the same settings.

Still, the following ranges are useful starting points for evaluation:

| Use case                        | Temperature | Top-p      | max_tokens          | Notes                                                             |
|---------------------------------|-------------|------------|---------------------|-------------------------------------------------------------------|
| Classification                  | `0.0–0.2`   | `1.0`      | Small, often `< 20` | Prefer deterministic output                                       |
| Extraction / structured parsing | `0.0–0.2`   | `1.0`      | Small               | Minimize variation and formatting drift                           |
| RAG / factual QA                | `0.1–0.5`   | `0.9–1.0`  | Moderate            | Lower randomness may reduce hallucinations                        |
| General chat assistant          | `0.5–0.8`   | `0.9–1.0`  | Moderate            | Balanced stability and variation                                  |
| Summarization                   | `0.2–0.7`   | `0.9–1.0`  | Moderate            | Depends on how extractive vs. creative you want the summary to be |
| Code generation                 | `0.0–0.3`   | `1.0`      | Moderate to large   | Lower temperature usually improves syntax stability               |
| Brainstorming / ideation        | `0.7–1.2`   | `0.9–0.95` | Moderate to large   | Encourage more diverse outputs                                    |
| Creative writing                | `0.8–1.3`   | `0.9–0.95` | Large               | Higher diversity, but also higher instability                     |

These are starting points, not rules. Always evaluate parameters with your
actual prompts, model versions, and workloads.

For production systems, parameter tuning is also an infrastructure concern. For
example, higher output lengths and more exploratory sampling can increase
[latency](/llm-inference-basics/llm-inference-metrics/), GPU utilization, KV
cache pressure, and tail latency under load.

## FAQs

### Are inference parameters the same as model hyperparameters?

No. Hyperparameters usually refer to settings used during training, such as
learning rate or batch size. Inference parameters are request-time settings used
when generating outputs from an already trained model.

### Why did my output stop early?

Common causes include a low `max_tokens`, a stop sequence appearing in normal
text, the model producing an end-of-sequence token, or a provider-side safety or
length limit.

### Do all models support the same parameters?

No. Hosted providers, OpenAI-compatible servers, and open-source engines expose
different subsets. Some parameters may be ignored, rejected, or implemented
differently depending on the serving stack.
