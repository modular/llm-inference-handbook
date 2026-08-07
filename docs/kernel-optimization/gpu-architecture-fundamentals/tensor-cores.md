---
sidebar_position: 4
description: Learn how tensor cores execute tiled matrix operations and what precision, shape, and layout constraints kernels must satisfy.
keywords:
    - tensor cores
    - matrix multiply accumulate
    - GPU mixed precision
    - tensor core tiles
    - LLM inference kernels
---

import LinkList from '@site/src/components/LinkList';

# Tensor cores

**Tensor cores** are specialized execution units for matrix
multiply-accumulate operations in NVIDIA hardware. NVIDIA introduced them with the Volta
architecture. Rather than issuing a long sequence of scalar multiply and add
instructions, a warp or group of warps can use a matrix instruction that
updates a small output tile.

Transformers spend much of their time in matrix multiplication, including
attention projections and feed-forward layers. Tensor cores can therefore
provide much higher throughput than general-purpose arithmetic units when a
kernel satisfies the required precision, tile, and layout constraints.

## Matrix instructions and tiles

At a conceptual level, a tensor core instruction performs a tiled operation of
the form:

$$
D = A \times B + C
$$

The four letters are the operands of a single matrix multiply-accumulate. Each
is a small tile-sized matrix:

- `A` and `B` are the two input matrices being multiplied. `A × B` is the matrix
  product.
- `C` is the accumulator input, namely the value already accumulated.
- `D` is the output.

The matrices exposed by an application can be much larger than the hardware
instruction tile. A kernel partitions them into tiles, distributes tile
fragments across threads, issues matrix multiply-accumulate instructions, and
combines the partial results.

The programming interface depends on the abstraction level. For example:

- Libraries such as cuBLAS and cuBLASLt choose tensor core kernels internally
- Compilers such as Triton can generate tensor core instructions from blocked
  tensor programs

Higher-level interfaces reduce implementation work. Lower-level interfaces can
unlock more control over data movement and scheduling, but they also tie the
kernel more closely to one architecture.

## Supported precision

Tensor cores don’t accept every type on every GPU generation. Support has
expanded over time:

- Volta introduced FP16 matrix inputs with higher-precision accumulation.
- Ampere added formats and modes such as BF16, TF32, and broader integer
  support.
- Hopper added FP8 tensor core paths and new matrix instructions.
- Blackwell extended tensor cores further with FP4 and FP6 formats and a
  second-generation Transformer Engine.

Note that input precision and accumulator precision can differ. For example, a
kernel might multiply FP16 or BF16 inputs while accumulating into FP32 to reduce
numerical error (the sum step is where numerical error tends to pile up). A
16-bit running sum can overflow the limited range, or lose small values when
they're added to a much larger total.

The exact combination of input type, accumulator type, tile shape, and
throughput depends on the compute capability. Write your code to target
the hardware rather than assume that one tensor core mode works everywhere.

## Tile and layout requirements

Tensor cores deliver high throughput only when the surrounding kernel feeds
them efficiently. Important factors include:

- **Shape**: Matrix dimensions need enough full instruction tiles. Edge tiles
  may require padding, masking, or a fallback path.
- **Alignment**: Pointers and leading dimensions often need suitable alignment
  for efficient vectorized loads and matrix instructions.
- **Layout**: Threads expect matrix fragments in architecture-specific register
  layouts. Shared-memory layouts may need swizzling or padding to avoid
  [bank conflicts](/kernel-optimization/gpu-architecture-fundamentals/gpu-memory/#shared-memory-smem-and-l1-cache).
- **Precision**: Inputs must use a supported type and accumulation mode.
- **Data supply**: HBM and shared-memory transfers must keep pace with the
  tensor core pipeline.

A kernel can issue tensor core instructions and still run poorly. If tile
loading dominates execution or if matrix dimensions are too small, theoretical
tensor throughput won’t translate into application throughput.

## Why tensor cores are important for LLM inference

LLM inference is largely a sequence of large matrix multiplications (matmuls): the QKV and
output projections, the feed-forward (MLP) layers, and the matmuls inside
attention itself. They are exactly the shape tensor cores are built to
accelerate, which is why tensor core throughput (measured in TFLOPS or TOPS)
largely sets how fast the compute-heavy parts of inference run.

As mentioned above, tensor cores also operate on reduced-precision inputs: FP16,
BF16, TF32, INT8, FP8 and FP4. This ties them directly to
[quantization](/model-preparation/llm-quantization/). Applying weights and
activations to a lower-precision format both shrinks their memory footprint and
puts them on a faster tensor-core path, so the two optimizations reinforce each
other.

Specifically, for the two stages of LLM inference:

- During
  [prefill](/llm-inference-basics/how-does-llm-inference-work/#prefill),
  many tokens are processed at once, the matmuls are large, and arithmetic
  intensity is high. The tensor cores are well fed and this phase is usually
  compute-bound, so tensor core throughput is the thing that matters.
- During
  [decode](/llm-inference-basics/how-does-llm-inference-work/#decode), the
  bottleneck shifts to memory bandwidth (streaming weights and the KV cache), so
  raw tensor core FLOPS stop being the limitation and the cores sit partly idle.
  [Batching multiple sequences](/inference-optimization/static-dynamic-continuous-batching/)
  restores a larger matrix dimension and brings tensor core utilization back up,
  which is a major reason inference servers batch aggressively.

Therefore, tensor cores are essential to inference performance, but not
uniformly. They often set the ceiling for compute-heavy prefill and large-batch
decode. Small-batch decode commonly remains bandwidth-bound, so additional
tensor core throughput alone may not help. As with
[occupancy](/kernel-optimization/gpu-architecture-fundamentals/streaming-multiprocessors/#occupancy),
they tell you where the compute ceiling is.

## FAQs

### What is the difference between CUDA cores and tensor cores?

CUDA cores are general-purpose execution units for standard floating-point and
integer operations. Tensor cores are specialized units designed for matrix
multiply-accumulate on small tiles (e.g., 4×4 or 16×16, depending on
architecture and data type). For matrix-heavy workloads like transformer layers,
tensor cores deliver significantly higher throughput than CUDA cores.

### Does using FP16 or FP8 automatically activate tensor cores?

No. The operation, dimensions, layout, alignment, and generated instructions
must all match a supported tensor core path. Always test your code to confirm
whether the kernel actually issues matrix instructions and how well those
pipelines are utilized.

<LinkList>

## Additional resources

- [CUDA C++ Programming Guide: WMMA](https://docs.nvidia.com/cuda/cuda-c-programming-guide/#wmma)
- [NVIDIA Tensor Cores for HPC](https://docs.nvidia.com/deeplearning/performance/dl-performance-matrix-multiplication/index.html)
- [PTX ISA: Matrix Multiply and Accumulate Instructions](https://docs.nvidia.com/cuda/parallel-thread-execution/#warp-level-matrix-instructions)
</LinkList>
