---
sidebar_position: 3
description: Learn what function calling is and its use case.
keywords:
    - Function calling, function calling APIs
    - LLM tool use, LLM tool integration
---

# Function calling

Function calling lets an LLM request specific tools when a task needs external
data or an action outside the model itself. When you ask the model to do
something that requires one of these tools, it can call that tool and use the
result in its response.

<Diagram name="function-calling-diagram" alt="Function calling: the LLM emits a function call routed to external APIs" />

Here is a specific example:

- **You ask**: "What's the current price of Apple stock?"
- **LLM thinks**: "I need current stock data, so I'll use my stock price
  function"
- **LLM calls**: `get_stock_price("AAPL")`
- **Function returns**: "$195.25"
- **LLM responds**: "The current price of Apple stock is $195.25"

At a technical level, the LLM still predicts the next token, just like any other
transformer-based models. The prompt includes well-defined function signatures
and descriptions, guiding the model to produce outputs that match those formats.
This allows you to build workflows like:

- Calling APIs from a user’s input
- Triggering actions (e.g., send email, retrieve weather)
- Passing outputs back into the model for multi-turn conversations

## FAQs

### What is the difference between function calling and structured outputs?

These two ideas get mixed up a lot. Here’s the simple difference:

- Structured outputs: You decide the
  [format that the model uses in its responses](/model-interaction/structured-outputs/).
  For example, you can force the model to output JSON, a list, or a specific
  object.
- Function calling: You tell the model when to take an action. Function calling
  tools are often defined in a structured way (e.g., JSON).

Both can be used together.

### Do all LLMs support function calling?

Not all, but many modern models do. Open-source models like Llama, Qwen, and
DeepSeek usually work well when served through vLLM, SGLang, or MAX.

### Is function calling the same as tools or agents?

Tools are the actions. Function calling is how the model requests those actions.
Agents are systems that can use function calling in a loop with reasoning; they
can plan, call multiple tools in sequence, evaluate results, and adjust their
approach based on what they learn.
