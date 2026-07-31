---
sidebar_position: 2
description: Understand GPU architecture fundamentals for kernel optimization, including threads, warps, streaming multiprocessors, memory hierarchy, and tensor cores.
keywords:
    - GPU architecture
    - CUDA threads, warps, thread blocks, streaming multiprocessors
    - GPU memory hierarchy, shared memory, HBM, registers
    - Tensor cores, GPU occupancy
---

test

import LinkList from '@site/src/components/LinkList'; import
GPUExecutionVisualizer from '@site/src/components/GPUExecutionVisualizer';

# GPU architecture fundamentals

Before writing or tuning GPU kernels, you need a working model of how a GPU
actually runs code. Without it, suggestions like "increase occupancy" or "reduce
shared memory bank conflicts" are just a set of rules to memorize. You don’t
fully understand when they apply and when they don't.

This page covers the execution model and memory system of modern GPUs at a level
useful for kernel work. The details lean toward NVIDIA's architecture since CUDA
dominates the LLM inference ecosystem today. However, the core concepts apply
broadly to AMD GPUs and other accelerators as well.

<GPUExecutionVisualizer />

## How a GPU runs code

The high-level idea is simple. GPUs keep thousands of lightweight threads in
flight so they can hide latency and sustain high throughput.

### Threads, warps, and thread blocks

When you launch a GPU kernel, you create a large number of threads. They are
organized in a simple hierarchy that helps the GPU run them efficiently.

- **Thread**: The smallest unit of execution. Each thread runs the same kernel
  code but operates on different data. This is called SIMT (Single Instruction,
  Multiple Threads).

  You don’t manually assign each thread what to do. Instead, each thread
  typically combines its position inside a block (`threadIdx`) with the block
  position (`blockIdx`) to compute which part of the input it should process.

- **Warp**: A group of 32 threads (on NVIDIA GPUs) that execute instructions in
  lockstep. The warp is the actual scheduling unit. It can only execute one
  instruction at a time. If threads within a warp take different code paths
  (branch divergence), the warp executes both paths sequentially. This reduces
  efficiency because some threads are inactive at any given time.

  Different warps are independent and can run different instructions at the same
  time.

- **Thread block (or block)**: A group of threads that can cooperate through
  shared memory and synchronization barriers. A block can contain up to 1024
  threads (32 warps). The size is available as `blockDim`. All threads in a
  block are scheduled on the same Streaming Multiprocessor (SM), but may execute
  over time rather than all at once.

### Grid and indexing

When launching a kernel, you define a grid of blocks:

```cpp
kernel<<<gridDim, blockDim>>>();
```

- `gridDim`: Grid dimensions, namely the number of blocks in each dimension
- `blockDim`: Block dimensions, namely the number of threads in each dimension
  of a block

The GPU assigns IDs automatically:

- `blockIdx`: Block’s position in the grid
- `threadIdx`: Thread’s position in the block

Each thread combines them to get a global index:

```cpp
int i = blockIdx.x * blockDim.x + threadIdx.x;
```

This indexing mechanism is what makes the SIMT model practical. All threads run
the same code, but each derives a different index from its position in the grid
and operates on its own data.

### Streaming Multiprocessors (SMs)

The SM is the core compute unit of a GPU. Each SM contains:

- A set of arithmetic execution units (CUDA cores on NVIDIA GPUs, execution
  units on AMD GPUs) for integer and floating-point arithmetic
- Tensor cores for accelerated matrix operations (on modern architectures)
- A warp scheduler that picks ready warps and issues instructions each cycle
- A register file, shared memory, and L1 cache (on many architectures, shared
  memory and L1 share on-chip resources and can be configured. Details will be
  covered in the sections below)

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

### Occupancy

Occupancy measures how many warps are active on an SM relative to the maximum it
can support. Higher occupancy gives the warp scheduler more warps to choose
from, which helps hide memory latency. While one warp waits for data (e.g., from
HBM), the SM can execute instructions from another.

However, higher occupancy is not always better. A kernel that uses more
registers per thread or more shared memory per block will have lower occupancy,
but it may still run faster because each thread does more useful work per memory
access. FlashAttention is a good example: it deliberately uses a lot of shared
memory to keep data on-chip, trading occupancy for dramatically less HBM access.

Occupancy is a tool for hiding latency, not a performance metric to maximize
blindly. Profile first, then decide whether occupancy is your bottleneck.

## Memory hierarchy

GPUs have a deep memory hierarchy. Understanding it is essential because most
kernel bottlenecks are about memory, not compute.

### Registers

Registers are the fastest storage on the GPU. Each thread has its own logically
private registers, meaning other threads cannot access them. Physically,
however, these registers come from a large register file on the SM (for example,
256 KB per SM on H100), which is shared across all resident threads and
partitioned among them.

Register access is much cheaper than going to shared memory or HBM because the
data is already on-chip and directly available to the compute units.

Registers are a limited resource. The more registers each thread uses, the fewer
threads (and warps) the SM can run concurrently. This is a primary driver of the
occupancy tradeoff.

### Shared memory (SMEM) and L1 cache

Modern GPUs provide two types of fast, on-chip memory inside each SM: shared
memory (SMEM) and the L1 cache. They often use the same physical SRAM, but their
roles are different.

L1 cache is hardware-managed. When a thread reads from global memory (HBM), the
GPU may store the data in L1 automatically. If the same data is accessed again,
it can be served from L1 much faster (a cache hit) instead of going back to HBM.
This process is transparent to the programmer: you do not explicitly load data
into L1 or control what stays there. As a result, L1 is best viewed as a
best-effort optimization that improves performance when there is temporal or
spatial locality in memory access patterns.

Shared memory, in contrast, is programmer-managed. It is a small, explicitly
allocated memory space that is shared by all threads in a thread block. Threads
can read and write shared memory directly, and use synchronization (e.g.,
`__syncthreads()`) to coordinate access. This makes shared memory a predictable
and controllable workspace for cooperation between threads.

The main purpose of shared memory is to reduce expensive HBM accesses. A common
pattern is to load data once from global memory into shared memory, then reuse
it multiple times across threads. Because shared memory is on-chip and much
faster than HBM, this can significantly improve performance. This pattern
appears in many high-performance kernels, such as matrix multiplication and
attention mechanisms.

Shared memory is organized into banks (typically 32). When multiple threads in a
warp access the same bank simultaneously, a bank conflict occurs and the
accesses are serialized. Avoiding bank conflicts is a common micro-optimization
in kernel tuning.

Here is a comparison:

|                | Shared memory          | L1 cache                          |
|----------------|------------------------|-----------------------------------|
| Managed by     | Programmer             | Hardware                          |
| Scope          | Thread block           | Per-SM (all blocks on SM)         |
| Persistence    | Block lifetime         | Evicted by hardware               |
| Bank conflicts | Yes, possible          | No (hardware handles)             |
| Best for       | Reuse you can plan for | Irregular or unpredictable access |

A common question: why do we need shared memory (SMEM) and L1 cache when we
already have registers?

Registers are the fastest storage on the GPU, but they are not enough on their
own.

1. **Registers are private**. Each thread has its own registers, so data cannot
   be shared. If multiple threads need the same data, they must reload it from
   global memory. L1 cache and shared memory support data reuse across threads.
2. **Registers are limited**. Each thread only gets a small number of registers.
   Large data (e.g., weights, tiles) cannot fit, so it must come from memory. L1
   helps cache it automatically, and shared memory lets you stage and reuse it
   explicitly.
3. **No coordination between threads.** Threads cannot communicate through
   registers. Shared memory provides a shared workspace for cooperation and
   synchronization.

### L2 cache

L2 cache is the largest on-chip memory, shared by all SMs on the GPU, and acts
as the last fast stop before going to HBM. On the H100, the L2 cache is ~50 MB,
and on the A100, it's ~40 MB.

The L2 cache is hardware-managed. You don't explicitly load data into it.
Instead, it automatically caches recent global memory accesses. For workloads
with some degree of data reuse across thread blocks, the L2 can significantly
reduce HBM traffic.

While L1 cache and shared memory work within a single SM, L2 exists to capture
reuse across SMs and across thread blocks. Data that does not fit in on-chip
memory or is accessed by multiple blocks can still be reused through L2 instead
of being fetched repeatedly from HBM.

In LLM inference, the L2 cache can help with:

- KV cache entries accessed by multiple attention heads
- Weight tiles reused across batch elements
- Small lookup tables or metadata

However, with very large working sets (common in LLM inference), the L2 hit rate
can drop and HBM bandwidth becomes the binding constraint.

### HBM (High Bandwidth Memory)

HBM is the main GPU memory (often called VRAM or global memory). It stores model
weights, KV cache, activations, and all other large data structures. Modern data
center GPUs use HBM2e or HBM3:

| GPU      | HBM capacity | HBM bandwidth |
|----------|--------------|---------------|
| A100 SXM | 80 GB        | 2.0 TB/s      |
| H100 SXM | 80 GB        | 3.35 TB/s     |
| H200 SXM | 141 GB       | 4.8 TB/s      |

HBM is large but slow relative to on-chip memory. A single HBM access takes
hundreds of cycles. This is why kernel optimization focuses on minimizing
traffic between HBM and compute units.

---

The memory hierarchy forms a pyramid.

| Level              | Size (H100)         | Bandwidth          | Scope                      | Latency       | Managed by                        |
|--------------------|---------------------|--------------------|----------------------------|---------------|-----------------------------------|
| Registers          | 256 KB per SM       | Highest            | Per thread                 | ~1 cycle      | Compiler                          |
| Shared memory / L1 | Up to 228 KB per SM | ~20 TB/s effective | Per block (SMEM) / SM (L1) | ~20-30 cycles | Programmer (SMEM) / Hardware (L1) |
| L2 cache           | 50 MB               | ~12 TB/s           | All SMs                    | ~200 cycles   | Hardware                          |
| HBM                | 80 GB               | 3.35 TB/s          | Global                     | ~400+ cycles  | Programmer                        |

Every kernel optimization technique, whether it's tiling, fusion, or data layout
changes, is ultimately about moving data access up this pyramid: keeping
frequently used data in registers or shared memory rather than reading it from
HBM repeatedly.

## Tensor cores

Starting with the Volta architecture (2017), NVIDIA GPUs include tensor cores:
specialized hardware units designed for matrix multiply-accumulate operations.
They operate on small matrix tiles (e.g., 16×16 or 8×8 depending on data type)
and can deliver far higher throughput than standard CUDA cores for matrix math.

For LLM inference, tensor cores matter because:

- The core computation in transformers is matrix multiplication (projections,
  attention scores, feed-forward layers)
- Tensor cores support mixed-precision formats (FP16, BF16, FP8, INT8) that
  reduce memory traffic and increase throughput
- On modern GPUs, the gap between tensor core throughput and standard core
  throughput is enormous. On H100-class GPUs, FP16 and BF16 tensor core
  throughput is dramatically higher than standard FP32 throughput

However, to use tensor cores effectively, your data must be in the right format
and layout. Misaligned tiles, wrong data types, or suboptimal memory access
patterns can prevent the compiler or library from mapping your computation onto
tensor cores.

This is one reason why frameworks like cuBLAS and Triton exist. They handle the
complexity of mapping operations onto tensor cores so you don't have to manage
it manually in every kernel.

## FAQs

### Do all threads in a warp do exactly the same thing, including the data?

They do the same operation, but they don’t operate on the same data. If they did
use the same data, parallelism would be useless. For example, for this kernel:

```cpp
C[i] = A[i] + B[i];
```

You launch 32 threads (one warp). Here is what happens:

- Thread 0 computes `C[0] = A[0] + B[0]`
- Thread 1 computes `C[1] = A[1] + B[1]`
- ...
- Thread 31 computes `C[31] = A[31] + B[31]`

Within a warp, the same instruction here is `add` , but the data are different.
Each thread uses a different index (`i`).

### What is the difference between CUDA cores and tensor cores?

CUDA cores are general-purpose execution units for standard floating-point and
integer operations. Tensor cores are specialized units designed for matrix
multiply-accumulate on small tiles (e.g., 4×4 or 16×16, depending on
architecture and data type). For matrix-heavy workloads like transformer layers,
tensor cores deliver significantly higher throughput than CUDA cores.

<LinkList>

## Additional resources

- [CUDA C++ Programming Guide](https://docs.nvidia.com/cuda/cuda-c-programming-guide/)
- [NVIDIA H100 Tensor Core GPU Architecture Whitepaper](https://resources.nvidia.com/en-us-hopper-architecture/nvidia-h100-tensor-c)
- [What exactly is "CUDA"?](https://www.modular.com/blog/democratizing-compute-part-2-what-exactly-is-cuda?utm_source=llm_handbook)
</LinkList>
