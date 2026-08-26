---
sidebar_position: 3
description: Understand GPU registers, shared memory, caches, bank conflicts, HBM, and the trade-offs across the memory hierarchy.
keywords:
    - GPU memory hierarchy
    - GPU registers
    - CUDA shared memory
    - GPU cache
    - HBM
    - Shared memory bank conflicts
---

import LinkList from '@site/src/components/LinkList'; import
MemoryHierarchyExplorer from '@site/src/components/MemoryHierarchyExplorer';
import MemoryCoalescingVisualizer from
'@site/src/components/MemoryCoalescingVisualizer';

# GPU memory hierarchy

GPU memory is organized as a hierarchy. Small on-chip storage sits close to the
compute units and provides low latency, while high bandwidth memory (HBM)
provides much more capacity off-chip. Most
[GPU kernel optimization techniques](/kernel-optimization/kernel-optimization-for-llm-inference/)
come down to moving less data or reusing data at a faster level of this
hierarchy.

Each step down the hierarchy buys capacity but moves data farther from compute.
Select a tier below to see how the physical location changes the group that can
reuse the same data.

<MemoryHierarchyExplorer />

## Registers

Registers are the fastest storage on the GPU. Each thread has a logically
private set of registers, meaning other threads cannot access them. Physically,
however, these registers come from a large register file on the
[SM](/kernel-optimization/gpu-architecture-fundamentals/streaming-multiprocessors/)
(for example, 256 KB per SM on H100), which is shared across all resident
threads and partitioned among them.

Register access is much cheaper than going to shared memory or HBM because the
data is already on-chip and directly available to the compute units.

Registers are a limited resource. Higher register use per thread can reduce the
number of resident threads and warps when register allocation becomes the
binding limit. This is a primary driver of the occupancy tradeoff.

## Shared memory (SMEM) and L1 cache

Modern GPUs provide two types of fast, on-chip memory inside each SM: shared
memory (SMEM) and the L1 cache. They often use the same physical SRAM, but their
roles are different.

L1 cache is hardware-managed. When a thread reads from global memory (HBM), the
GPU may store the data in L1 automatically. If the same data is accessed again,
it can be served from L1 much faster (a cache hit) instead of going back to HBM.
This process is transparent to the programmer: you don’t explicitly load data
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
appears in many high-performance kernels, including
[matrix multiplication](/kernel-optimization/gpu-architecture-fundamentals/tensor-cores/)
and [attention](/kernel-optimization/flashattention/).

Shared memory is organized into banks (typically 32). When multiple threads in a
[warp](/kernel-optimization/gpu-architecture-fundamentals/threads-warps-blocks/#warps)
access different addresses in the same bank simultaneously, a bank conflict
occurs and the accesses are serialized (threads reading the same address are
served by a broadcast and don’t conflict). Avoiding bank conflicts is a common
micro-optimization in kernel tuning.

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

Registers are the fastest storage on the GPU, but they aren't enough on their
own.

1. **Registers are private**. One thread cannot directly read registers
   allocated to another thread. Warp shuffle instructions can exchange register
   values within a warp, while shared memory supports reuse across a full thread
   block. L1 can also prevent repeated accesses from reaching HBM.
2. **Registers are limited**. Each thread only gets a small number of
   registers. Large data, such as complete weight tensors or large tiles, cannot
   fit, so it must come from memory. L1 helps cache it automatically, and shared
   memory lets you stage and reuse it explicitly.
3. **No coordination between threads.** Threads cannot communicate through
   registers. Shared memory provides a shared workspace for cooperation and
   synchronization.

## L2 cache

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

- KV cache entries shared by multiple query heads in grouped-query or
  multi-query attention
- Weight tiles reused across batch elements
- Small lookup tables or metadata

However, with very large working sets (common in LLM inference), the L2 hit rate
can drop and HBM bandwidth becomes the binding constraint.

## HBM (High Bandwidth Memory)

HBM is the main GPU memory (often called VRAM or global memory). It stores model
weights, KV cache, activations, and all other large data structures. Modern data
center GPUs use HBM2e, HBM3, or HBM3e:

| GPU             | HBM capacity | Peak HBM bandwidth |
|-----------------|-------------:|-------------------:|
| NVIDIA A100 SXM |        80 GB |           2.0 TB/s |
| NVIDIA H100 SXM |        80 GB |          3.35 TB/s |
| NVIDIA H200 SXM |       141 GB |           4.8 TB/s |

For LLM inference:

- HBM capacity determines how much model state and KV cache can
remain on one GPU.
- HBM bandwidth often determines token throughput during decode.

HBM is large but slow relative to on-chip memory. A single HBM access takes
hundreds of cycles. This is why kernel optimization focuses on minimizing
traffic between HBM and compute units.

## Memory coalescing

Memory coalescing describes how efficiently the memory requests from one warp
fit into hardware memory transactions. A warp executes one load instruction,
but the GPU doesn't fetch each requested value as a separate operation.
Instead, the GPU groups the addresses from all active threads into transactions
that cover fixed-size regions of memory.

On current NVIDIA GPUs, global memory loads are serviced in 32-byte sectors.
The fewer sectors a warp needs for one instruction, the better the access is
coalesced.

:::note
A sector is a 32-byte aligned region of memory that NVIDIA GPUs use as a
transfer unit for global memory loads. Even when a thread needs only 4 bytes,
the GPU may fetch the entire 32-byte sector containing those bytes.
:::

Suppose all 32 threads in a warp load one `float32` value, or 4 bytes per
thread. The warp requests 128 bytes in total:

```bash
32 threads × 4 bytes = 128 bytes
```

If adjacent threads read adjacent elements, the addresses can fit into four
adjacent 32-byte sectors:

```bash
Thread 0  → bytes 0–3
Thread 1  → bytes 4–7
Thread 2  → bytes 8–11
...
Thread 31 → bytes 124–127
```

The GPU fetches 128 bytes, and the warp uses all 128 bytes. This is a fully
coalesced access, assuming the first address has suitable alignment.

Now consider a strided access where every thread reads from a different
32-byte sector. The warp still requests only 128 useful bytes, but the GPU may
need 32 sectors to serve the load:

```text
32 sectors × 32 bytes = 1,024 bytes fetched
```

Only one eighth of the transferred data is useful for that instruction. The
remaining bytes consume bandwidth without contributing values to the warp.
Caches may help on later accesses, but they don't make the original address
pattern coalesced.

Try each pattern below and compare the number of sectors required by one load:

<MemoryCoalescingVisualizer />

Good coalescing usually comes from mapping adjacent threads to adjacent tensor
elements. Alignment matters too: an otherwise consecutive 128-byte request can
cross a sector boundary and require an extra transaction.

Efficient memory access is especially important for LLM inference because many
kernels move far more data than they compute on. Poor coalescing wastes HBM
bandwidth and can reduce token throughput even when the amount of arithmetic
stays the same.

## The memory pyramid

The values below provide an approximate Hopper-class example. Exact capacity,
latency, and bandwidth vary by GPU, access pattern, and measurement method.

| Level              | Size (H100)                             | Bandwidth          | Scope                      | Latency       | Managed by                        |
|--------------------|-----------------------------------------|--------------------|----------------------------|---------------|-----------------------------------|
| Registers          | 256 KB per SM                           | Highest            | Per thread                 | ~1 cycle      | Compiler                          |
| Shared memory / L1 | 256 KB combined pool; up to 228 KB SMEM | ~20 TB/s effective | Per block (SMEM) / SM (L1) | ~20-30 cycles | Programmer (SMEM) / Hardware (L1) |
| L2 cache           | 50 MB                                   | ~12 TB/s           | All SMs                    | ~200 cycles   | Hardware                          |
| HBM                | 80 GB                                   | 3.35 TB/s          | Global                     | ~400+ cycles  | Programmer / runtime              |

Many kernel optimization techniques, including tiling, fusion, and data layout
changes, reduce traffic lower in this pyramid by keeping frequently used data in
registers or shared memory rather than reading it from HBM repeatedly.

<LinkList>

## Additional resources

- [NVIDIA H100 Tensor Core GPU Architecture Whitepaper](https://resources.nvidia.com/en-us-hopper-architecture/nvidia-h100-tensor-c)
</LinkList>
