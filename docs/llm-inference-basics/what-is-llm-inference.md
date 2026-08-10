---
sidebar_position: 1
description: LLM inference is the process of using a trained language model to generate responses or predictions based on prompts.
keywords:
    - Large Language Models, LLM
    - LLM inference meaning, LLM inference concept
    - LLM inference, AI inference, inference layer
---

import RequestLifecycle from '@site/src/components/RequestLifecycle';

# What is LLM inference?

LLM inference refers to using trained LLMs, such as GPT-5, GLM-5, and
DeepSeek-V3.2, to generate meaningful outputs from user inputs, typically
provided as natural language [prompts](/model-interaction/prompt-engineering/).
During inference, the model processes the prompt through its vast set of
parameters to generate responses like text, code snippets, summaries, and
translations.

Essentially, this is the moment the LLM is actively "in action." Here are some
real-world examples:

- **Customer support chatbots**: Generating personalized, contextually relevant
  replies to customer queries in real-time.
- **Writing assistants**: Completing sentences, correcting grammar, or
  summarizing long documents.
- **Developer tools**: Converting natural language descriptions into executable
  code.
- **AI agents**: Performing complex, multi-step reasoning and decision-making
  processes autonomously.

Use the visualizer below to see how a request flows during LLM inference. For
details, learn
[how LLM inference works](/llm-inference-basics/how-does-llm-inference-work/).

<RequestLifecycle />

## What is an inference server?

An **inference server** is the component that manages how LLM inference runs. It
loads the models, connects to the required hardware (such as GPUs), and
processes application requests. When a prompt arrives, the server allocates
resources, executes the model, and returns the output.

LLM inference servers do much more than simple request-response. They provide
features essential for running LLMs at scale, such as:

- **Batching**: Combining multiple requests to improve GPU efficiency
- **Streaming**: Sending tokens as they are generated for lower latency
- **Scaling**: Spinning up or down replicas based on demand
- **Monitoring**: Exposing metrics for performance and debugging

In the LLM space, people often use **inference server** or
**inference framework** somewhat interchangeably.

- **An inference server** usually emphasizes the runtime component that receives
  requests, runs models, and returns results.
- **An inference framework** often highlights the broader toolkit or library
  that provides APIs, optimizations, and integrations for serving models
  efficiently.

Popular
[inference frameworks](/getting-started/choosing-the-right-inference-framework/)
include vLLM, SGLang, MAX, and TensorRT-LLM. They’re designed to maximize GPU
efficiency while making LLMs easier to deploy at scale.

## What's the difference between serving and inference?

Inference is the computation. Serving is the production process that makes that
computation available to users and applications.

In everyday conversations, people often use the terms interchangeably because
modern frameworks handle both. Tools like vLLM, SGLang, MAX, and TensorRT-LLM
not only run inference efficiently but also manage requests and expose APIs. As
a result, "inference framework" and "serving framework" often refer to the same
systems.

Strictly speaking, however, they're not the same thing, and the distinction
matters the moment you start designing infrastructure.

- Inference is the forward pass: tokens in, next-token distribution out,
  repeated through prefill and the decode loop. This is a computational
  operation. You can run inference in a Jupyter notebook or a Python script with
  no server in sight. That's still inference, but you aren't serving anything.
- Serving is everything required to turn that capability into a reliable
  production service: an API surface (HTTP/gRPC), request queuing and
  scheduling, batching across concurrent requests, load balancing across
  replicas, autoscaling, model loading and version management, health checks,
  observability, and resource allocation.

So when someone uses them interchangeably, they're usually being loose about the
fact that their inference engine happens to also be their server, which is
perfectly common.

## What is inference optimization?

**Inference optimization** is a set of techniques to make LLM inference faster,
cheaper, and more efficient. It’s about reducing latency, improving throughput,
and lowering hardware costs without hurting model quality.

Some common strategies include:

- [Continuous batching](/inference-optimization/static-dynamic-continuous-batching/):
  Dynamically grouping requests for better GPU utilization
- [KV cache management](/inference-optimization/kv-cache-offloading/): Reusing
  or offloading attention caches to handle long prompts efficiently
- [Speculative decoding](/inference-optimization/speculative-decoding/): Using a
  smaller draft model to speed up token generation
- [Quantization](/model-preparation/llm-quantization/): Running models in lower
  precision (e.g., INT8, FP8) to save memory and compute
- [Prefix caching](/inference-optimization/prefix-caching/): Caching common
  prompt segments to reduce redundant computation
- [Multi-GPU distribution/Parallelism](/inference-optimization/data-tensor-pipeline-expert-hybrid-parallelism/):
  Splitting LLMs across multiple GPUs for larger context windows

In practice, inference optimization can make the difference between an
application that feels sluggish and expensive, and one that delivers snappy,
cost-efficient user experiences.

Learn more in the [inference optimization](/inference-optimization/) chapter.

## Why should I care about LLM inference?

You might think:
_I’m just using OpenAI’s API. Do I really need to understand inference?_

Serverless APIs like OpenAI, Anthropic, and others make inference look simple.
You send a prompt, get a response, and pay by the token. The infrastructure,
model optimization, and scaling are all hidden from view.

But here’s the thing: **the further you go, the more inference matters.**

As your application grows, you'll eventually run into limits (e.g., cost,
latency, customization, or compliance) that serverless APIs can’t fully address.
That’s when teams start exploring hybrid or self-hosted solutions.

Understanding LLM inference (e.g.,
[batching](/inference-optimization/static-dynamic-continuous-batching/),
[caching](/inference-optimization/prefix-caching/),
[quantization](/model-preparation/llm-quantization/) and
[routing](/inference-optimization/inference-routing/)) early gives you a clear
edge. It helps you evaluate the features of different model service providers
and
[inference frameworks](/getting-started/choosing-the-right-inference-framework/),
so you can make smarter choices, avoid surprises, and build more scalable
systems.

- **If you're a developer or engineer**: Inference is becoming as fundamental as
  databases or APIs in modern AI application development. Knowing how it works
  helps you design faster, cheaper, and more reliable systems. Poor inference
  implementation can lead to slow response time, high compute costs, and a poor
  user experience.
- **If you're a technical leader**: Inference efficiency directly affects your
  bottom line. A poorly optimized setup can cost 10× more in GPU hours while
  delivering worse performance. Understanding inference helps you evaluate
  vendors, make build-vs-buy decisions, and set realistic performance goals for
  your team.
- **If you're just curious about AI**: Inference is where the magic happens.
  Knowing how it works helps you separate AI hype from reality and makes you a
  more informed consumer and contributor to AI discussions.

For more information, see
[serverless vs. self-hosted LLM inference](/getting-started/serverless-vs-self-hosted-llm-inference/).
