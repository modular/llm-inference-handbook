---
sidebar_position: 4
description: Structured outputs are model responses in defined formats like JSON or XML, making AI-generated data predictable, machine-readable, and easy to integrate into applications and workflows.
keywords:
    - Structured outputs, structured generation, constrained decoding
---

import LinkList from '@site/src/components/LinkList';

# Structured outputs

Structured outputs are responses from an LLM that follow a specific,
machine-readable format, such as JSON, XML, or a regex-defined pattern. Instead
of generating free-form prose, the model produces data that can be parsed and
used directly by downstream systems.

Here is an example:

```json
{
  "name": "LLM Inference Handbook",
  "author": "Modular",
  "website": "handbook.modular.com",
  "summary": "A practical handbook for engineers building, optimizing, scaling, and operating LLM inference systems in production."
}
```

## Why do structured outputs matter?

When you work with an LLM, the output is often free-form text. As humans, we can
easily read and interpret these responses.

However, if you’re building a larger application with an LLM (e.g., one that
connects the model’s response to another service, API, or database), you need
predictable structure. Otherwise, how does your program know what to extract or
which field goes where?

That’s where structured outputs come in. They give the model a clear,
machine-readable format to follow, making automation and integration more
reliable.

For example, you’re building an analytics assistant that reads support tickets
and summarizes insights for the product team. You want the LLM to return:

- the top issues mentioned by users,
- their frequency,
- and an overall sentiment score.

If the model replies in plain text, like:

> “Most customers complain about slow loading times and payment errors. The
> overall tone is slightly negative.”

That’s fine for a human reader, but nearly useless for an automated dashboard.
You have to manually extract those insights or write complex parsing code.

Now compare that to this structured output:

```json
{
  "issues": [
    {"topic": "Slow loading", "count": 42},
    {"topic": "Payment errors", "count": 31}
  ],
  "sentiment": "negative",
  "confidence": 0.87
}
```

Your system can parse the output directly, store it in a database and visualize
the data on a dashboard. There is no guesswork or post-processing required.

Structured outputs are now common in many real-world LLM systems, including:

- **Information extraction**: Extract entities, numbers, or relationships from
  documents into JSON or tables.
- **Data enrichment**: Classify, tag, or summarize records for CRM or analytics
  pipelines.
- **Function calling and API chaining**: Let the LLM choose which tool or
  endpoint to call and pass parameters in a structured way.
- **Agent orchestration**: Coordinate multi-step workflows where each step
  consumes the previous output.
- **Evaluation and testing**: Collect consistent responses for benchmarking
  model quality and accuracy.
- **Content moderation or compliance checks**: Return structured decisions like
  `{ "action": "flag", "reason": "PII detected" }`.

## How to obtain structured outputs

Now that you understand why structured outputs matter, the next question is: how
do you actually get them?

You could, of course, write custom parsing logic to clean up and extract the
data you need from the model’s response. But that approach quickly becomes
messy. It’s time-consuming, error-prone, and brittle at scale. Every new format
or rule adds more complexity to your code.

A better way is to let the LLM itself produce structured data, but not all LLMs
support structured outputs out of the box. For those models, you often need to
guide them through careful prompting or schema definitions with certain
frameworks. When the format is written clearly (e.g., using explicit examples or
regular expressions), the model can reliably generate outputs that follow the
expected structure.

Today, there are three main ways to obtain structured outputs.

### Serverless model API providers

The easiest way to start with structured outputs is by calling model APIs that
support them natively.

Providers like OpenAI, Anthropic, and Google let you specify schemas or JSON
structures directly in your API call. The model then generates responses that
follow this schema automatically.

This feature evolved from early
[JSON mode](https://platform.openai.com/docs/guides/structured-outputs#json-mode),
which simply asked the model to respond in JSON format. JSON mode worked, but
inconsistently. Models would often produce malformed or incomplete JSON. To fix
this, OpenAI introduced
[Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs),
a stricter system that enforces schemas so responses always match the defined
structure.

Here’s an example using OpenAI’s structured output API:

```python
from pydantic import BaseModel
from openai import OpenAI

client = OpenAI()

# Define the expected fields with Pydantic
class SupportSummary(BaseModel):
    issues: list[str]
    sentiment: str
    confidence: float

completion = client.chat.completions.parse(
    model="gpt-5",
    messages=[
        {"role": "system", "content": "Summarize support ticket feedback."},
        {"role": "user", "content": "The app is terrible! It crashes every time it opens."},
    ],
    response_format=SupportSummary,
)

event = completion.choices[0].message.parsed
```

Structured outputs with third-party model APIs are straightforward. There’s no
custom parsing logic to maintain, and the model handles schema validation for
you.

However, it comes with a few trade-offs:

- **Vendor lock-in**. You’re tied to a specific provider’s API.
- **Output limits**. Large payloads can be truncated, leading to incomplete
  JSON.
- **Inconsistent enforcement**. Not all providers handle schema validation
  equally well.

### Re-prompting

Re-prompting is a simple and effective way to get structured outputs using
libraries like [Instructor](https://github.com/567-labs/instructor).

Here’s how it works:

1. You send the model a [prompt](/model-interaction/prompt-engineering/)
   describing the desired format (for example, a JSON schema).
2. The library checks whether the response is valid.
3. If not, it automatically re-prompts the model with details about what went
   wrong.
4. The process repeats until the output passes validation or a retry limit is
   reached.

This loop ensures that you eventually get a valid structured output, without
having to write your own retry logic.

It’s also highly flexible. You can define custom regex rules and enforce date or
number formats. It works with virtually any model or API provider.

The trade-off is latency and cost. Each retry means another model call, which
adds time and tokens. If your schema is complex or your model struggles to
follow instructions, it may take several retries, or even fail after exhausting
all attempts.

### Constrained decoding

If you’re self-hosting open-source LLMs, constrained decoding, also known as
structured generation, is one of the most reliable ways to produce structured
outputs.

Instead of validating the output after it’s generated, this method enforces
structure during token generation. It ensures the model can only sample tokens
that fit the format or schema you’ve defined.

Here’s what happens under the hood:

When an LLM generates text, it predicts the probability of each possible next
token (these probabilities are called *logits*). With constrained decoding,
those logits are modified in real time to remove any tokens that would violate
your defined structure. The model can then only generate valid continuations,
guaranteeing that the final output always follows your schema.

This approach is fast because it doesn’t rely on retries or post-processing. It
works well with open-source models and is supported by libraries such as
[Outlines](https://github.com/outlines-dev/outlines),
[Microsoft Guidance](https://github.com/guidance-ai/llguidance), and
[XGrammar](https://github.com/mlc-ai/xgrammar). Inference frameworks like
[vLLM](https://docs.vllm.ai/en/latest/features/structured_outputs.html) and
[SGLang](https://docs.sglang.ai/advanced_features/structured_outputs.html), and
[MAX](https://max.modular.com/serve/structured-output/) have already
integrated these tools directly.

The main advantages are speed, precision, and reliability. The Outlines team
even showed that
[structured output can improve LLM performance](https://blog.dottxt.ai/performance-gsm8k.html).

<LinkList>

## Additional resources

- [Efficient Guided Generation for Large Language Models](https://arxiv.org/pdf/2307.09702)
- [Fast JSON Decoding for Local LLMs with Compressed Finite State Machine](https://lmsys.org/blog/2024-02-05-compressed-fsm/)
- [XGrammar: Flexible and Efficient Structured Generation Engine for Large Language Models](https://arxiv.org/abs/2411.15100)
</LinkList>
