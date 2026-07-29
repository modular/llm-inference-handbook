---
sidebar_position: 2
description: Understand streaming multiprocessor internals, warp scheduling, block residency, and GPU occupancy.
keywords:
    - streaming multiprocessor
    - GPU warp scheduler
    - GPU occupancy
    - CUDA SM
    - block residency
---

import LinkList from '@site/src/components/LinkList';

# Streaming multiprocessors

A **streaming multiprocessor (SM)** is the main compute unit of an NVIDIA GPU.
A GPU contains many SMs, and each SM accepts
[thread blocks](/kernel-optimization/gpu-architecture-fundamentals/threads-warps-blocks/#thread-blocks),
schedules their warps, and executes instructions with on-chip compute and memory
resources.
AMD hardware uses different names and groups work differently, but the same
broad idea applies: many parallel compute units share the workload.

## What an SM contains

The exact design changes between GPU generations, but an SM typically contains:

- A set of arithmetic execution units (CUDA cores on NVIDIA GPUs, execution
  units on AMD GPUs) for integer and floating-point arithmetic
- [Tensor cores](/kernel-optimization/gpu-architecture-fundamentals/tensor-cores/)
  for accelerated matrix operations (on modern architectures)
- A warp scheduler that picks ready warps and issues instructions each cycle
- A register file, shared memory, and L1 cache. On many architectures, shared
  memory and L1 share on-chip resources and can be configured. For more
  information, see the
  [GPU memory hierarchy](/kernel-optimization/gpu-architecture-fundamentals/gpu-memory/).

:::note
On-chip means physically located on the GPU silicon die itself, right next to
the compute units. Off-chip means outside the GPU chip, which requires traveling
across memory interfaces (wires, controllers).
:::

A modern data center GPU has many SMs. For example, the NVIDIA H100 SXM has 132
SMs and the A100 has 108. The total throughput of a GPU depends on how well your
kernel keeps these SMs busy with useful work.

Each SM can hold and execute multiple thread blocks concurrently, as long as
there are enough registers, shared memory, and warp slots available.

## How warp scheduling hides latency

An SM can keep many warps resident. A warp scheduler selects a ready warp and
issues an instruction to the required execution units. If one warp waits for a
memory load or a dependency, the scheduler can issue work from another ready
warp.

This rapid switching does not require an operating-system context switch.
Registers and scheduling state for resident warps are already present on the
SM. The GPU uses this pool of ready work to hide latency and sustain throughput.

More resident warps only help when they provide useful alternatives. If every
warp waits on the same bottleneck, or if the kernel already saturates a compute
pipeline, adding more warps may provide little benefit.

## Block residency

The GPU assigns each block to one SM. A block cannot move between SMs during
execution, and all threads in the block draw from resources on that SM.

Several limits determine how many blocks and warps can reside together:

- Threads and warps per SM
- Blocks per SM
- Registers per SM and registers used by each thread
- Shared memory per SM and shared memory used by each block
- Architecture-specific scheduling limits

One limit usually becomes binding first. For example, a block that allocates a
large shared-memory tile can prevent another block from residing on the same
SM, even when thread slots remain available.

## Occupancy

**Occupancy** is the ratio of active warps on an SM to the maximum number of
active warps supported by that SM:

$$
\text{Occupancy} =
\frac{\text{Active Warps per SM}}{\text{Maximum Active Warps per SM}}
$$

Higher occupancy gives the scheduler a larger pool of warps and can help hide
latency. Register use per thread and shared-memory use per block often
set the occupancy ceiling.

Occupancy is not a score to maximize blindly. A kernel may accept lower
occupancy to keep a useful tile in shared memory, hold intermediate values in
registers, or reduce repeated HBM traffic.
[FlashAttention](/kernel-optimization/flashattention/) follows this pattern:
more on-chip storage can lower occupancy while cutting far more expensive
off-chip memory movement.

Use occupancy to explain performance, not to replace measurement. Profiling can
show whether the SM lacks eligible warps, stalls on memory, or already saturates
the relevant execution pipeline.

## Why SM utilization matters for inference

An inference workload rarely consists of one ideal matrix multiplication.
Attention, normalization, sampling, data movement, and many small kernels all
compete for SM time. Poor launch geometry or insufficient parallel work can
leave SMs idle, increasing latency. Excessive resource use can reduce the number
of resident blocks and make latency harder to hide.

Batch size and sequence shape also affect the amount of parallel work. A kernel
that fills the GPU during
[prefill](/llm-inference-basics/how-does-llm-inference-work/#prefill) may
underuse the same GPU during single-token
[decode](/llm-inference-basics/how-does-llm-inference-work/#decode). This is why
utilization has to be interpreted for the actual inference phase rather than as
one aggregate percentage.

## FAQs

### Does a GPU with more SMs always run a kernel faster?

No. The launch needs enough independent blocks to use the added SMs, and the
kernel must avoid another binding limit such as HBM bandwidth. SM designs and
clock rates also differ across GPU generations, so SM count alone is not a
complete performance comparison.

### Is low occupancy always a problem?

No. Low occupancy becomes a concern when the SM lacks ready warps and cannot
hide latency. A compute-bound kernel or a kernel with strong on-chip data reuse
can perform well at moderate occupancy.

<LinkList>

## Additional resources

- [CUDA C++ Best Practices Guide: Occupancy](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/#occupancy)
- [CUDA Occupancy Calculator](https://docs.nvidia.com/cuda/cuda-occupancy-calculator/index.html)
- [NVIDIA Hopper Architecture In-Depth](https://developer.nvidia.com/blog/nvidia-hopper-architecture-in-depth/)
</LinkList>
