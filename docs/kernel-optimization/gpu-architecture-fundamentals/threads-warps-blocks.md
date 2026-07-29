---
sidebar_position: 1
description: Learn how GPU kernels organize work into threads, warps, thread blocks, and grids.
keywords:
    - GPU threads
    - CUDA warps
    - thread blocks
    - CUDA grids
    - SIMT execution
---

import LinkList from '@site/src/components/LinkList';

# GPU threads, warps, blocks, and grids

A GPU kernel exposes a large amount of parallel work. The execution model
organizes that work into a hierarchy of threads, warps, thread blocks, and
grids. Each level answers a different question: what one logical worker does,
which workers execute together, which workers can cooperate, and how the full
kernel launch covers the input.

## Threads

A **thread**, also known as a **work unit** on AMD GPUs, is the smallest logical
unit of execution within a kernel function. Every thread runs the same kernel
code, but built-in coordinates let each thread select different data. This model
is called SIMT: Single Instruction, Multiple Threads.

You don’t manually assign each thread what to do. Instead, each thread typically
combines the position within a block with the block position to compute which
part of the input to process. For more information, see
[grids and indexing](#grids-and-indexing) below.

The same kernel body can process a vector with thousands or millions of
elements. Threads can also use two- or three-dimensional coordinates, which map
naturally to matrices, images, and tiled computations.

## Warps

A **warp**, also known as a **wavefront** on AMD GPUs, is a subset of threads
from a thread block that execute together. On NVIDIA GPUs a warp is 32 threads.
AMD wavefronts are traditionally 64, and 32 or 64 on RDNA.

The warp is the actual scheduling unit. It is what gets presented to a warp
scheduler, and a warp can only be issued one instruction at a time. When a warp
receives an instruction, the active threads of it each execute that instruction
on their own registers and data. Different warps are independent and can execute
different instructions at the same time.

Threads in a warp do not need to produce the same result, but control flow is
most efficient when they follow the same path. If a branch sends some threads
one way and others another way, the warp executes the paths separately. Each
has a different active-thread mask so that only the threads on the current path
are active. This is called **warp divergence**, and it lowers efficiency when
the divergent paths contain substantial work, since threads off the current
path sit idle.

## Thread blocks

A **thread block (or block)**, also known as a **workgroup** on AMD GPUs, is a
subset of threads within a grid, which is the top-level organizational structure
of the threads executing a kernel function. As the primary building block for
workload distribution, thread blocks serve multiple crucial purposes:

1. They break down the overall workload (managed by the grid) of a kernel
   function into smaller, more manageable portions that can be processed
   independently. This division allows for better resource utilization and
   scheduling flexibility across multiple
   [streaming multiprocessors (SMs)](/kernel-optimization/gpu-architecture-fundamentals/streaming-multiprocessors/)
   in the GPU.
2. Thread blocks provide a scope for threads to collaborate through
   [shared memory](/kernel-optimization/gpu-architecture-fundamentals/gpu-memory/#shared-memory-smem-and-l1-cache)
   and synchronization primitives, enabling efficient parallel algorithms and
   data sharing patterns.
3. Thread blocks help with scalability by allowing the same program to
   run efficiently across different GPU architectures, as the hardware can
   automatically distribute blocks based on available resources.

You can specify the number of thread blocks in a grid and how they are arranged
across one, two, or three dimensions. Each block within the grid is assigned a
unique block index that determines the position within the grid. Similarly, you
also specify the number of threads per thread block and how they are arranged
across one, two, or three dimensions. A block can hold up to 1024 threads on
current hardware, subject to the register and shared-memory limits of the
kernel.

The GPU assigns each thread block within the grid to a streaming multiprocessor
(SM), where the block generally remains resident until it completes; blocks are
not migrated between SMs. Several blocks can reside on one SM at the same time
when registers, shared memory, and scheduler slots allow.

Threads within a block can share data through shared memory and synchronize
using built-in mechanisms, but they cannot directly communicate with threads in
other blocks.

## Grids and indexing

A **grid** contains all blocks created by one kernel launch. CUDA makes the
launch dimensions and coordinates available inside the kernel:

- `gridDim`: Grid dimensions, namely the number of blocks in each dimension.
- `blockDim`: Block dimensions, namely the number of threads in each dimension
  of a block.
- `blockIdx`: The current block position within the grid.
- `threadIdx`: The current thread position within the block.

A kernel combines the last three to work out which element each thread owns.
A simple example is a vector addition, where every thread handles one
element:

```cpp
__global__ void vecAdd(float* A, float* B, float* C, int vectorLength)
{
    int workIndex = threadIdx.x + blockDim.x * blockIdx.x;
    if (workIndex < vectorLength)
    {
        C[workIndex] = A[workIndex] + B[workIndex];
    }
}
```

The bounds check here is important because the grid rarely divides the input
evenly. The launch itself uses an **execution configuration** between triple
angle brackets, where the first value sets the number of blocks in the grid and
the second sets the number of threads in each block:

```cpp
int threads = 256;
int blocks = (vectorLength + threads - 1) / threads;

vecAdd<<<blocks, threads>>>(devA, devB, devC, vectorLength);
```

For more information, see the
[CUDA Programming Guide](https://docs.nvidia.com/cuda/cuda-programming-guide/02-basics/intro-to-cuda-cpp.html).

The grid usually contains more blocks than the GPU can run at once. As blocks
finish, the GPU assigns new blocks to free SM capacity. This scheduling model
lets one launch scale across GPUs with different SM counts without changing the
kernel.

CUDA C++ targets NVIDIA hardware. Mojo provides the same grid-and-block model
through GPU APIs that can target NVIDIA, AMD, and Apple hardware. The index
arithmetic and the launch look like this:

```mojo
from std.gpu import block_dim, block_idx, thread_idx
from std.gpu.host import DeviceContext

def kernel():
    var i = block_idx.x * block_dim.x + thread_idx.x
    # Process element i.

def main() raises:
    ctx = DeviceContext()
    # Same geometry as the CUDA launch above.
    ctx.enqueue_function[kernel](grid_dim=blocks, block_dim=256)
    ctx.synchronize()
```

`grid_dim` and `block_dim` correspond to the two CUDA launch values, and the
index arithmetic is identical. Mojo also exposes `global_idx`, a shorthand that
computes `block_idx.x * block_dim.x + thread_idx.x` for you, so the same line
could be written as `var i = global_idx.x`. For more information, see the
[Mojo documentation](https://mojolang.org/docs/manual/gpu/fundamentals/).

## How the hierarchy affects kernel performance

Launch geometry changes how a kernel uses the hardware:

- A block needs enough threads to provide several warps, but an oversized block
  can consume too many registers or too much shared memory.
- Adjacent threads should access adjacent memory when possible. This lets the
  GPU combine memory requests into efficient transactions.
- Branches should keep threads within a warp on the same path when the
  algorithm allows.
- A grid should expose enough independent blocks to keep all SMs busy.

The best geometry depends on the work per thread and the resources required by
each block. Resource use also affects
[occupancy](/kernel-optimization/gpu-architecture-fundamentals/streaming-multiprocessors/#occupancy).
Fixed rules such as “always use 256 threads” are starting points, not universal
answers.

<LinkList>

## Additional resources

- [CUDA C++ Programming Guide](https://docs.nvidia.com/cuda/cuda-programming-guide/index.html)
- [AMD ROCm HIP programming model](https://rocm.docs.amd.com/projects/HIP/en/latest/understand/programming_model.html)
- [GPU programming fundamentals](https://mojolang.org/docs/manual/gpu/fundamentals/)
</LinkList>
