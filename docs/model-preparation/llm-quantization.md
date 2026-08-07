---
sidebar_position: 2
description: Understand LLM quantization and different quantization formats and methods.
keywords:
    - LLM quantization, how does quantization work, LLM quantization accuracy
    - Quantization formats, quantization types, quantization techniques
    - Quantization vs pruning
    - AWQ, SmoothQuant, GPTQ
---

import Tabs from '@theme/Tabs'; import TabItem from '@theme/TabItem'; import
LinkList from '@site/src/components/LinkList'; import QuantizationVisualizer
from '@site/src/components/Calculator/Quantization';

# LLM quantization

Quantization is a technique used to reduce the memory and compute requirements
of models by converting their weights and activations from high-precision
formats (like FP32) to lower-precision formats such as INT8, INT4, or even INT2.

Fewer bits mean lower memory consumption for the model. For example:

- A 7B model in FP32 format is highly precise, but it requires 28 GB of memory
  just for the weights.
- The same model in FP16 cuts memory use in half.
- Lower-precision formats like INT8 or INT4 compress the model even further,
  dramatically reducing the size.

These figures only account for model weights. Runtime elements, such as
attention caches, activations, and framework overhead, require additional
memory.

## Why use quantization

Quantization can help LLM inference in three main ways:

- **Smaller model footprint**. The number of bits per parameter directly affects
  how much memory the model weights require. For example, a 7B model needs about
  14 GB for FP16 weights but about 7 GB for INT8 weights. This can make the
  difference between fitting the model on one GPU or distributing it across
  multiple GPUs or nodes.
- **Less data movement**. LLM decoding is often limited by GPU memory bandwidth
  because the runtime repeatedly reads model weights while generating tokens.
  Lower-precision weights mean fewer bytes to be moved from
  [GPU memory to the compute units](/kernel-optimization/gpu-architecture-fundamentals/gpu-memory/),
  which can reduce per-token latency.
- **Faster computation**. GPUs and other accelerators can process supported
  low-precision formats at higher throughput than FP32 or FP16.
  [On the H100 SXM](https://www.nvidia.com/en-us/data-center/h100/), for
  example, the BF16/FP16 Tensor Cores hit 1,979 TFLOPS, while FP8 and INT8
  double that to 3,958 TFLOPS/TOPS, a clean 2x from halving the bit width. The
  actual speedup depends on whether the hardware and inference runtime provide
  optimized kernels for the chosen format.

A smaller weight footprint also leaves more GPU memory available for the
[KV cache](/llm-inference-basics/how-does-llm-inference-work/#the-two-phases-of-llm-inference),
larger batches, and more concurrent requests. Weight quantization does not
reduce the KV cache size per token by itself. It requires quantizing the KV
cache separately.

This tradeoff between precision and size comes with **some drop in accuracy**.
For many applications, the above benefits matter only if the generated output
remains reliable enough for production use. For example, a faster model that
produces noticeably worse responses is rarely a worthwhile trade-off.

The good news is that modern quantization methods have made this trade-off much
less severe. Techniques such as GPTQ W4A16, AWQ, and FP8 quantization for both
weights and activations often
[preserve nearly the same accuracy](https://developers.redhat.com/articles/2024/10/17/we-ran-over-half-million-evaluations-quantized-llms)
as the original model, with meaningful improvements in inference efficiency. As
a result, many production deployments can adopt quantization with little or no
noticeable impact on model quality.

## Quantization formats

Different quantization formats offer a balance between size savings and
accuracy. Here's a quick guide:

| Format   | Size vs FP32 | Accuracy Drop | Use Case             | Memory   | Notes                       |
|----------|--------------|---------------|----------------------|----------|-----------------------------|
| **FP32** | 100%         | None          | Training             | High     | Full precision, but slow    |
| **FP16** | 50%          | Minimal       | Training & Inference | Medium   | Standard for most LLMs      |
| **FP8**  | 25%          | Low           | Training & Inference | Low      | Still emerging              |
| **INT8** | 25%          | Low           | Inference            | Low      | Good all-around trade-off   |
| **INT4** | 12.5%        | Moderate      | Inference            | Very Low | Needs methods like GPTQ/AWQ |
| **INT2** | 6.25%        | High          | Rare/Experimental    | Tiny     | Accuracy often poor         |

Use the visualizer below to see how these tradeoffs play out for your model
size. Note that for MoE models, this calculator uses total stored parameters,
not activated parameters per token.

<QuantizationVisualizer />

This calculator estimates **weight memory only**. Use the
[GPU memory calculator](/getting-started/calculating-gpu-memory-for-llms/) to
estimate your overall requirements.

## What to quantize

Generally, you want to focus on what consumes the most memory without hurting
performance too much.

- Model weights are the most commonly quantized component. They’re stable and
  contribute heavily to memory usage.
- Activations can also be quantized, but this is trickier and may lead to more
  accuracy loss.
- The KV cache can be quantized at runtime to reduce memory pressure in
  long-context serving. This is different from weight quantization because the
  cache is generated during inference and is read repeatedly during decoding.
  The main challenge is preserving attention quality: the model still needs
  accurate key/query similarity scores after the key and value vectors are
  stored in fewer bits.

## Quantization vs. pruning

Quantization is not the only way to reduce model size. Another related technique
is model pruning.

Pruning removes parameters that contribute little to the output of a model. They
can be individual weights, neurons, attention heads, or even entire layers. By
eliminating redundant components, pruning produces a smaller and sparser model,
which can reduce compute requirements and accelerate inference speed.

Pruning and quantization are often used together in a deployment pipeline:

1. Train the model
2. Prune less important weights
3. Fine-tune the model
4. Quantize the weights
5. Deploy for inference

In simple terms:

- Quantization reduces the number of bits used to represent each weight.
- Pruning reduces the number of weights in the model.

Both techniques aim to reduce memory usage and computational cost during
inference. However, quantization is generally easier to apply in production
systems because modern hardware provides strong support for low-precision
arithmetic.

## When to use quantization

Quantization is a good choice if:

- You're deploying to hardware with limited GPU memory (e.g., 24GB or less).
- You want lower inference latency.
- You need to reduce serving costs.
- You want to support higher concurrency. Quantization reduces KV cache size per
  token, allowing more tokens (and therefore more parallel requests) to fit
  within the same GPU memory.
- You can tolerate small accuracy trade-offs.

Quantization may not be a good choice if:

- You need the highest possible accuracy (e.g., for sensitive or safety-critical
  tasks).
- Your model is already small (quantization offers limited benefit here).
- Your deployment hardware doesn't support quantized formats.

:::tip
The quantized variants of many popular foundation models are already available
on Hugging Face, so you don't need to quantize the models yourself. You can
often find them in the model tree section.
:::

## Quantization methods

Several advanced quantization techniques have been developed to make LLMs more
efficient without significant loss in performance.

Below are some widely adopted quantization approaches:

### AWQ

[Activation-aware Weight Quantization (AWQ)](https://arxiv.org/pdf/2306.00978)
is designed specifically for running LLMs on edge or resource-constrained
devices. The core insight is that not all weights contribute equally to
performance. Its developers believe only ~1% of weights are "salient" and need
extra care during quantization. Therefore, this approach selectively protects
the most impactful weights based on activation distributions, not just the
weights themselves.

At a high level, AWQ applies an equivalent transformation that scales important
weight channels based on offline-collected activation statistics.

It is ideal for low-bit quantization on models deployed in edge settings or
latency-sensitive environments.

### SmoothQuant

[SmoothQuant](https://arxiv.org/abs/2211.10438) is a general-purpose,
training-free method for post-training quantization (PTQ) that enables efficient
8-bit quantization of both weights and activations (W8A8).

While quantizing weights is relatively straightforward, activations are much
harder due to outliers that can significantly degrade accuracy. SmoothQuant
solves this by "smoothing" the activation outliers. It mathematically shifts
quantization difficulty from activations to weights through an equivalent
transformation. As a result, it achieves up to 2× memory reduction and up to
1.56× speedup for LLMs.

SmoothQuant is a great choice when you want:

- Full INT8 quantization (weights and activations)
- High hardware efficiency without retraining
- Minimal accuracy drop
- Plug-and-play compatibility with most transformer models

It’s a turnkey solution that balances accuracy, performance, and ease of use.
It’s ideal for production scenarios that demand efficiency at scale.

### GPTQ

[GPTQ](https://arxiv.org/abs/2210.17323) is a fast, post-training quantization
method that compresses large transformer models to 3–4 bits per weight with
minimal accuracy loss. It’s specifically designed for scaling to models with
hundreds of billions of parameters and does so without retraining.

Highlights:

- Efficient at scale: Can quantize models like OPT-175B or BLOOM-176B in ~4 GPU
  hours.
- Minimal accuracy loss: Maintains low perplexity, even with aggressive
  compression.
- Extreme quantization: Supports 2-bit and ternary quantization, still with
  usable performance.
- Runs massive models on single GPUs: Enables inference of 175B models on a
  single A100 or two A6000s.
- Performance gains: Custom GPU kernels yield ~3.25× speedup over FP16.

GPTQ is widely used in open-source model serving pipelines, especially with
AutoGPTQ. It is a go-to choice for high-speed, low-memory inference of large
models.

---

Many
[modern inference frameworks](/getting-started/choosing-the-right-inference-framework/)
not only serve quantized models efficiently but also provide built-in APIs or
tooling to quantize models. For example, online quantization often only requires
a single serving flag:

<Tabs groupId="inference-framework">
<TabItem value="max" label="MAX">

```bash
max serve --model meta-llama/Llama-3.1-8B-Instruct \
  --quantization-encoding float8_e4m3fn
```

`--quantization-encoding` accepts high-precision encodings (`float32`,
`float16`, `bfloat16`), low-precision floating-point formats (`float8_e4m3fn`,
`float4_e2m1fnx2`), the GGUF integer formats (`q4_0`, `q4_k`, `q6_k`), and
`gptq` for GPTQ checkpoints. For more information, see
[Quantization in the MAX documentation](https://docs.modular.com/develop/quantize/).

</TabItem>
<TabItem value="vllm" label="vLLM">

```bash
vllm serve --model meta-llama/Llama-3.1-8B-Instruct \
  --quantization mxfp8
```

`--quantization` accepts methods such as `fp8_per_tensor`, `fp8_per_block`,
`mxfp8`, and `bitsandbytes`. If you leave it unset, vLLM reads
`quantization_config` from the model config and falls back to the unquantized
weights. For more information, see
[Quantization in the vLLM documentation](https://docs.vllm.ai/en/latest/features/quantization/).

</TabItem>
<TabItem value="sglang" label="SGLang">

```bash
sglang serve --model-path meta-llama/Llama-3.1-8B-Instruct \
  --quantization fp8
```

`--quantization` accepts methods such as `awq`, `gptq`, `fp8`, and
`bitsandbytes`. For more information, see
[Quantization in the SGLang documentation](https://docs.sglang.io/docs/advanced_features/quantization).

</TabItem>
</Tabs>

In other cases, models are quantized offline using
specialized tools and then loaded directly by the serving framework. As a
result, most users no longer need to implement quantization algorithms
themselves.

You can often start with an already quantized model from
[Hugging Face](/getting-started/choosing-the-right-model/#hugging-face). It
hosts many pre-quantized variants, such as 8-bit and 4-bit models, that are
ready for inference and optimized for lower memory usage and faster deployment.
At the same time, it also provides full-precision base models if you want to
apply your own quantization strategy.

<LinkList>

## Additional resources

- [Quantization and Training of Neural Networks for Efficient Integer-Arithmetic-Only Inference](https://arxiv.org/abs/1712.05877)
- [AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration](https://arxiv.org/abs/2306.00978)
- [GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers](https://arxiv.org/abs/2210.17323)
- [SmoothQuant: Accurate and Efficient Post-Training Quantization for Large Language Models](https://arxiv.org/abs/2211.10438)
</LinkList>
