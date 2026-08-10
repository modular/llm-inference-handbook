---
sidebar_position: 4
description: Learn how to calculate GPU memory for serving LLMs.
keywords:
    - GPU memory calculation, LLM inference hardware calculator
    - VRAM calculation
    - LLM memory requirements
---

import LinkList from '@site/src/components/LinkList';
import GPUMemoryCalculator from '@site/src/components/Calculator/GPUMemory';

# Calculating GPU memory for serving LLMs

If you're planning to self-host an LLM, one of the first things you'll need to
estimate is how much GPU memory (VRAM) it requires.

During LLM inference, the model weights must live in GPU memory while the model
is serving requests. This fixed baseline depends mainly on the model’s size and
the precision used for the weights.

- **Model size (number of parameters)**. Larger models need more memory. Models
  with tens or hundreds of billions of parameters usually require high-end GPUs
  like NVIDIA H100 or H200.
- **Bit precision**. The precision used (e.g., FP16, FP8, INT8) affects memory
  consumption. Lower precision formats can significantly reduce the memory
  footprint, but may affect accuracy. For models on Hugging Face, you can often
  find the weight data type in the `config.json` file. The `torch_dtype`
  attribute indicates the precision used for the model weights. See
  [LLM quantization](/model-preparation/llm-quantization/) for details.

Weight memory is not the full serving requirement. For example, a 7B model in
FP16 needs roughly 14 GB just for weights, so it may load on a 16 GB GPU.
However, that does not mean the GPU has enough headroom for production
inference. A single short request may work, but longer prompts, larger batches,
or more concurrent users can quickly exhaust the remaining memory.

The [KV cache](/inference-optimization/kv-cache-offloading/) is usually the
largest runtime overhead. It stores attention keys and values so the model can
reuse previous tokens during decoding instead of recomputing them. The cache
grows with sequence length and the number of active requests. Serving engines
also need memory for temporary activations, workspace buffers, framework
allocations, and sometimes CUDA graphs. If you leave only a tiny amount of GPU
memory beyond the weights, you will be limited to short contexts, small batches,
and low concurrency.

A rough formula for estimating serving memory is:

```bash
Memory (GB) = P * (Q / 8) * (1 + Overhead)
```

- **P**: Number of parameters (in billions)
- **Q**: Bit precision (e.g., 16, 32), division by 8 converts bits to bytes
- **Overhead (%)**: Additional serving memory beyond weights, such as KV cache,
  activation buffers, workspace memory, and framework/runtime reservations

The percentage-based overhead is a quick sizing shortcut, not an exact capacity
model. KV cache memory depends on sequence length, batch size, concurrency,
number of layers, and hidden size, so long-context workloads may need much more
headroom than a simple 10–30% estimate.

Use the calculator below to estimate GPU memory requirements for your model:

<GPUMemoryCalculator />

:::note
Not all GPUs support all precision formats natively. A100 and other Ampere GPUs
support INT8 but don't support FP8 in hardware. Native FP8 requires Hopper,
Ada, or newer architectures. If your inference stack relies on FP8 kernels, make
sure your GPU supports them. Some 4-bit models use INT4 quantization, while
native FP4 support relies on newer architectures and software stacks.
:::

<LinkList>

## Additional resources

- [GPU architecture fundamentals](/kernel-optimization/gpu-architecture-fundamentals/)
</LinkList>
