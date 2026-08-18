---
sidebar_position: 2
description: LLM training builds the model while LLM inference applies it to generate real-time outputs from new inputs.
keywords:
    - LLM training vs. inference
    - LLM training, LLM inference
    - Differences between LLM inference and training
    - AI training, training techniques
    - Traning and inference
---

import LLMLifecycleMap from '@site/src/components/LLMLifecycleMap';

# Training vs. inference

LLM training and inference are two different phases in the lifecycle of a model.

<LLMLifecycleMap />

## Training: Building the model’s understanding

Training occurs initially when building an LLM. It is about teaching the model
how to recognize patterns and make accurate predictions. This is done by
exposing the model to vast amounts of data and adjusting its parameters based on
the data it encounters.

Common techniques used in LLM training include:

- **Supervised learning**: Show the model examples of inputs paired with the
  correct outputs.
- **Reinforcement learning**: Allow the model to learn by trial and error,
  optimizing based on feedback or rewards.
- **Self-supervised learning**: Learn by predicting missing or corrupted parts
  of the data, without explicit labels.

Training is computationally intensive, often requiring expensive GPU or TPU
clusters. While this initial cost can be very high, it is more or less a
one-time expense. Once the model achieves desired accuracy, retraining is
usually only necessary to update or improve the model periodically.

## Inference: Using the model in real time

LLM inference means applying the trained model to new data to make predictions.
Unlike training, inference
[happens continuously and in real-time](/llm-inference-basics/what-is-llm-inference/),
responding immediately to user input or incoming data. It is the phase where the
model is actively "in use." Better-trained and more finely-tuned models
typically provide more accurate and useful inference.

Inference compute needs are ongoing and can become very high, especially as user
interactions and traffic grow. Each inference request consumes computational
resources such as GPUs. While each inference step may be smaller than training
in isolation, the cumulative demand over time can lead to significant
operational expenses.

---

Here is a side-by-side comparison between training and inference:

| Item       | Training                          | Inference                                            |
|------------|-----------------------------------|------------------------------------------------------|
| Purpose    | Teach the model                   | Use the model                                        |
| Data       | Huge datasets                     | New, user-provided inputs                            |
| Compute    | Long, expensive GPU/TPU jobs      | Real-time, repeated workloads                        |
| Cost model | Mostly one-time                   | Ongoing and scales with traffic                      |
| Hardware   | Multi-node clusters               | Smaller clusters, optimized runtimes and cache usage |
| Time       | Hours to weeks                    | Milliseconds to seconds                              |
| Tools      | PyTorch, JAX, DeepSpeed, Megatron | vLLM, SGLang, TensorRT LLM, MAX, LMDeploy            |

## FAQs

### What is model serving?

Model serving is the production process of making a trained model available to
applications, users, or systems so it can run inference on new inputs. It
usually includes packaging the model, loading it onto suitable hardware,
exposing it through an API or service, monitoring its behavior, and keeping
latency, reliability, security, and cost under control.

Learn more about the difference between
[serving and inference](/llm-inference-basics/what-is-llm-inference/#whats-the-difference-between-serving-and-inference).

### Where do training and inference fit in the LLM lifecycle?

Training happens early in the lifecycle. The model learns patterns, language
structure, and general knowledge. After that, the model goes through alignment,
optional fine-tuning, evaluation, and deployment. Inference comes after
deployment. It is the stage where the model serves real users in production,
usually through an API, service, or application workflow. You can think of
training as "building the model" and inference as "putting the model to work."

### Why does LLM inference often cost more than training?

Even though training an LLM is expensive, it usually happens once. Inference, on
the other hand, runs every time a user sends a request. As traffic grows, the
number of inference calls grows with it. Each request uses GPU compute, memory,
and network bandwidth. Over time, this ongoing demand can make inference the
larger long-term expense, especially for applications with heavy usage or long
[prompts](/model-interaction/prompt-engineering/).

### Should I train my own LLM?

In most cases, no. Training a new LLM from scratch requires massive datasets,
specialized hardware, and a dedicated research team. Most companies get better
results by starting with an existing
[open-source LLM](/getting-started/choosing-the-right-model/) and then
fine-tuning or customizing it for their domain. Full training only makes sense
if you’re solving a problem that existing models can’t handle or you have strict
control requirements that fine-tuning can’t meet.

### Is fine-tuning considered training or inference?

Fine-tuning is a form of training. You update some of the model’s weights using
new data to adapt it to a specific task or domain. Inference doesn’t change any
weights. It only uses the model to generate predictions. See the
[fine-tuning section](/model-preparation/llm-fine-tuning/) to learn more.
