---
sidebar_position: 1
description: Understand LLM fine-tuning and different fine-tuning frameworks.
keywords:
    - LLM fine-tuning, LoRA, how does LLM fine-tuning work
    - Fine-tuning frameworks, open source LLM fine-tuning, types of LLM fine-tuning
    - Axolotl, Unsloth, Torchtune, LLaMA Factory
---

# LLM fine-tuning

Fine-tuning is one of the most effective ways to adapt an LLM for a specific use
case. It continues the training process on a pre-trained model using new,
task-specific data. This can involve updating the entire model or just specific
layers.

A key driver behind fine-tuning is efficiency. Instead of training a model from
scratch (which is extremely resource-intensive), it's far easier and more
cost-effective to build on top of a base model that has already learned general
language patterns from massive datasets. Fine-tuning sharpens those broad
capabilities for your particular task.

For example, fine-tuning can significantly improve a model’s:

- **Domain expertise**: Adapting a model for legal, medical, or
  programming-related tasks.
- **Instruction following**: Ensuring the model adheres to specific formats,
  tones, or styles in its responses.
- **Safety and alignment**: Reinforcing how the model handles sensitive or
  high-risk [prompts](/model-interaction/prompt-engineering/).

## Where fine-tuning fits in the customization stack

Fine-tuning is only one approach to customization. It changes model weights,
which makes it different from other techniques such as
[prompt engineering](/model-interaction/prompt-engineering/),
[function calling](/model-interaction/function-calling/), and
[structured outputs](/model-interaction/structured-outputs/).

The difference matters in production. Runtime techniques are usually faster to
test, easier to roll back, and more portable across model providers. Fine-tuning
is more appropriate when the behavior you want is stable, appears across many
requests, and cannot be handled cleanly by prompts or retrieved context alone.

A practical improvement loop often looks like this:

1. Build an evaluation set from real or representative inputs.
2. Improve prompts, examples, retrieval, tools, and output validation.
3. Measure the result with the same evaluation set.
4. Fine-tune only if the remaining failures are systematic and worth moving into
   the model.

## Common fine-tuning frameworks

Fine-tuning LLMs doesn’t have to mean building everything from the ground up.
Several open-source frameworks are designed to streamline the process.

These tools provide out-of-the-box support for training open-weight models on
custom datasets. They make it easier to apply modern optimization techniques
without having to write complex training code yourself.

Many of these frameworks are also built with efficiency in mind, helping users
reduce memory usage and speed up training, even on limited hardware.

### Axolotl

[Axolotl](https://axolotl.ai/) is a user-friendly fine-tuning framework to
simplify post-training for LLMs. Whether you’re doing full fine-tuning,
instruction tuning, LoRA/QLoRA, or alignment work, Axolotl makes it easy to get
started, without diving deep into training internals.

It’s built on top of Hugging Face’s Transformers library but wraps much of the
complexity in a clean, YAML-based configuration system. You define your training
setup like datasets, models, and training strategy in a single config file.
Axolotl takes care of the rest.

Key features:

- Supports popular open-weight models like Llama, Pythia, Falcon, and MPT.
- Flexible training options: full fine-tuning, LoRA, QLoRA, ReLoRA, and GPTQ.
- Compatible with advanced techniques like xFormers,
  [FlashAttention](/kernel-optimization/flashattention/), ROPE scaling, Liger
  kernel, and sample packing.
- Scales from single GPU setups to multi-GPU training using FSDP or DeepSpeed.
- Easy to run locally with Docker or on cloud infrastructure.

Axolotl is great for users who want to focus on their data and tasks instead of
the details of deep learning internals. With sensible defaults, strong community
support, and various integrations, it's a go-to choice for practical fine-tuning
of open models.

### Unsloth

[Unsloth](https://unsloth.ai/) is a fine-tuning framework designed to make
training LLMs faster, lighter, and more accessible, especially on limited
hardware (e.g., free Google Colab GPUs).

Unsloth is deeply optimized at the kernel level. Built with a custom attention
implementation in [Triton](https://openai.com/index/triton), it enables 2×
faster training with up to 80% less memory usage. If you want more background on
where Triton fits relative to CUDA and compiler-based approaches, see
[kernel optimization tools](/kernel-optimization/kernel-optimization-tools/).

The Unsloth team has collaborated directly with developers behind models like
Llama 4, Mistral, Qwen, Gemma, and Phi, often contributing bug fixes and updates
that improve prompt handling, accuracy, and overall stability.

Key features:

- Supports fine-tuning open-weight models like Llama, Mistral, Phi, Gemma, and
  more.
- Supports LoRA, QLoRA, full fine-tuning, and even reinforcement learning (DPO,
  ORPO).
- Highly customizable: edit chat templates, dataset formats, and training
  configs as needed.
- Compatible with inference tools like Ollama, llama.cpp, and vLLM.
- Runs easily on platforms like Google Colab, Kaggle, and even older consumer
  GPUs.

If you're trying to fine-tune a model on resource-constrained setups, Unsloth is
a top choice. It’s built to maximize what you can do with minimal resources.

### Torchtune

[Torchtune](https://github.com/pytorch/torchtune) is a PyTorch-native library
for fine-tuning LLMs. It's built for users who want full control over the
training pipeline without relying on high-level abstractions or opaque training
frameworks.

Torchtune follows PyTorch’s core principles: usability over everything else. It
avoids unnecessary abstractions and emphasizes:

- Native PyTorch components
- Composition over inheritance
- Clear training logic instead of hidden framework mechanics
- Test-driven development and correctness at every level

Key features:

- Modular LLM implementations written in pure PyTorch.
- Training recipes for a variety of fine-tuning techniques like full
  fine-tuning, LoRA, and QLoRA.
- Easy configuration with YAML files to manage datasets, models,
  hyperparameters, and hardware settings.
- Interoperability with model zoos through checkpoint conversion tools.

Torchtune is ideal if you prefer working directly in PyTorch and want to
customize everything, from data preprocessing to training logic. It’s especially
useful for researchers, developers, and engineers who value transparent code,
reproducibility, and direct access to model internals.

### LLaMA Factory

[LLaMA Factory](https://github.com/hiyouga/LLaMA-Factory) is an open-source
fine-tuning toolkit built for simplicity and efficiency. It supports more than
100 LLMs, with both a command-line interface and a Web UI for zero-code
workflows.

Unlike many frameworks that target expert users, LLaMA Factory is designed to be
beginner-friendly. Through its web interface, users can select a model, upload a
dataset, adjust a few parameters, and launch training, with no coding required.

But it’s not just for beginners. Behind the scenes, LLaMA Factory supports a
wide range of tuning methods, making it equally useful for experienced
researchers and developers.

Key features:

- Fine-tuning methods: supervised SFT (including multimodal), reward modeling,
  and reinforcement learning (PPO, DPO, ORPO, KTO).
- Quantization and adapter support: 16-bit full-tuning, freeze-tuning, LoRA, and
  2–8 bit QLoRA via formats like GPTQ, AWQ, HQQ, and AQLM.
- Advanced optimization: GaLore, DoRA, LongLoRA, LoftQ, LLaMA Pro,
  Mixture-of-Depths, and more.

---

Instead of fine-tuning a model yourself, you can often start with an existing
fine-tuned or instruction-tuned model from
[Hugging Face](/getting-started/choosing-the-right-model/#hugging-face). It
hosts a large collection of community and officially released fine-tuned models
that are ready to use out of the box. At the same time, it also provides base
models and foundation checkpoints if you want full control and plan to fine-tune
the model yourself. In practice, teams frequently explore both options on
Hugging Face before deciding whether to reuse an existing model or invest in
custom fine-tuning.

## Fine-tuning through a hosted provider

Fine-tuning through a hosted provider can be convenient because you don't need
to manage training infrastructure yourself. However, it also means your
fine-tuned model depends on the provider and the base model it was trained from.

OpenAI's
[self-serve fine-tuning update](https://developers.openai.com/api/docs/deprecations#update-to-openais-self-serve-fine-tuning)
is a useful example. After May 7, 2026, new organizations can no longer create
fine-tuning jobs, and active existing customers can create new jobs only until
January 6, 2027. Existing fine-tuned models can still run until their base
models are deprecated.

That does not mean hosted fine-tuning is a bad choice. It means teams should
treat a fine-tuned hosted model as a maintained production artifact. Track the
base model lifecycle, keep evaluation sets for replacement testing, and know
whether you can migrate to another hosted model or open-source fine-tuning if
needed.

## FAQs

### How is fine-tuning different from inference?

Fine-tuning is a small form of training. You update some of the model’s weights
using your own dataset. Inference doesn’t change weights at all. It only runs
the existing model to produce output.

Here’s a clearer side-by-side comparison:

| Item            | Inference                                | Fine-tuning                                                    |
|-----------------|------------------------------------------|----------------------------------------------------------------|
| Purpose         | Generate outputs (answers, images, etc.) | Adapt the model to perform better on a specific task or domain |
| Weights updated | No, weights stay frozen                  | Yes, some or all weights are updated                           |
| Data required   | Just the input prompt                    | A dataset (often labeled) specific to your use case            |
| Compute cost    | Low (single forward pass)                | High (multiple epochs of training)                             |
| Time            | Milliseconds to seconds                  | Minutes to days (depending on model size & data)               |
| Model changes   | The model stays the same                 | Get a new version/checkpoint of the model                      |
| Examples        | Asking an LLM questions                  | Llama 3 fine-tuned on internal docs or medical Q&A             |

### How does LLM fine-tuning compare to other techniques like prompt engineering?

[Prompt engineering](/model-interaction/prompt-engineering/) adjusts how you ask
the model to get better answers. It’s quick, cheap, and doesn’t require
training, but it has limits. Long prompts can get messy, and the model may still
behave inconsistently.

Fine-tuning actually changes the model. You feed it examples of what “good”
looks like, and it learns to follow that pattern on its own. It’s more reliable
for long-term use, especially when you need consistent tone, domain knowledge,
or strict formatting.

In short, prompt engineering is great for early exploration, but fine-tuning
gives you stable, repeatable performance at scale.

### When should I avoid fine-tuning?

Avoid fine-tuning when the main problem is missing or frequently changing
information. A
[RAG pipeline](/infrastructure-and-operations/multi-model-inference-pipelines/#rag-pipeline),
prompt template, or tool call is usually a better fit because it can fetch fresh
data at inference time.

Fine-tuning is also a poor first step when you don't have a reliable evaluation
set. Without it, it is hard to tell whether a fine-tuned model actually improved
the target behavior or simply changed its style.

Finally, avoid fine-tuning if the deployment path is uncertain. A fine-tuned
model depends on a base model, training method, serving stack, and provider
lifecycle. If you expect to switch providers or base models soon, keep more
behavior in portable runtime logic until the system stabilizes.

### How much data do I need to fine-tune an LLM?

It depends on the task. Many teams get solid results with a few thousand
high-quality examples. For complex domains, you may need tens or hundreds of
thousands. Quality matters more than quantity.

### Do I need powerful GPUs to fine-tune an LLM?

Not always. Frameworks like Unsloth, Axolotl, and LLaMA Factory support
efficient methods like LoRA and QLoRA, which let you fine-tune large models on a
single consumer GPU or even Google Colab. Full fine-tuning often requires
stronger hardware.
