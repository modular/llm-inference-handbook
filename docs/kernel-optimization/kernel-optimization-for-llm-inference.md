---
sidebar_position: 1
description: Kernel optimization for LLM inference improves GPU utilization and performance by writing or generating optimized kernels tailored to the compute patterns of LLMs.
keywords:
    - Kernel optimization
    - LLM inference
    - CUDA kernels
    - Triton
---

import LinkList from '@site/src/components/LinkList';

# Kernel optimization for LLM inference

When people talk about speeding up LLM inference, they usually jump to batching,
caching, or routing. That makes sense. Those are visible, system-level levers.

Underneath all of that, there’s a quieter layer doing the actual work: GPU
kernels.

## What is kernel optimization?

When an LLM generates a token, the GPU executes a sequence of highly parallel
operations, such as matrix multiplications, attention, normalization, and
activation functions. These operations are implemented using GPU kernels:
functions that run across a large number of GPU threads simultaneously.

Some operations map to a single kernel, while others are composed of multiple
kernels. In many cases, multiple operations can also be fused into a single
kernel, which is one of the most impactful optimizations available.

Think of kernels as the inner loops of LLM inference. They handle the core
numerical work behind each token generation step and are where most of the
compute time is actually spent.

Kernel optimization is the practice of making these functions run faster and
more efficiently by:

- Reducing latency per operation
- Increasing hardware utilization (compute units, memory bandwidth, etc.)
- Minimizing memory movement and data transfers

At a high level, there are two common approaches to kernel optimization
depending on how much control you want over the GPU.

- **Hand-written kernels**. This is the traditional path. You write and tune GPU
  kernels directly, often using CUDA or higher-level kernel DSLs like Triton.
  Examples include:
  - Custom CUDA kernels
  - Optimized attention implementations like FlashAttention

  This gives you fine-grained control. You can design and tune memory access,
  thread layout, and computation schedule from scratch. However, it’s also
  hard as it requires deep knowledge of GPU architecture.

  :::note
  For Triton, you're still writing kernels, but the tile-based programming
  model hides many of the low-level details: no manual warp management, no
  explicit shared memory scheduling for common patterns. This makes Triton
  easier than writing raw CUDA kernels. It also provides more control than
  fully compiler-driven methods.
  :::

- **Compiler-driven optimization**. You rely on compiler systems such as TVM or
  XLA to generate optimized kernels from a higher-level description of
  computation. These systems can:
  - Fuse multiple operations into one kernel
  - Reorder computation for better efficiency
  - Generate optimized kernels automatically

  In this model, you describe what to compute, and the compiler determines how
  to execute it efficiently for the target hardware backend. This
  significantly lowers the barrier to entry. However, it offers less direct
  control over low-level execution and may lag behind hand-written kernels
  when supporting new model architectures or specialized computation patterns.

## What kernel optimization is not

It’s easy to mix it up with other optimization techniques covered in the
[Inference Optimization](/inference-optimization/) chapter. Kernel optimization
is not:

- Continuous or dynamic batching
- Prefix caching
- KV cache routing or offloading
- Load balancing across GPUs
- Multi-region or multi-cloud deployment

Those operate at the system and runtime layer above the kernels. Kernel
optimization goes one level deeper, into the GPU code that actually does the
computation.

A simple way to separate them:

- Kernel optimization: how fast a single operation runs on a GPU
- System optimization: how efficiently requests flow through the overall serving
  infrastructure

Both matter. They just solve fundamentally different problems.

## Why most teams never touch this layer

Most AI engineers never write a GPU kernel, and for good reason. Inference
frameworks like vLLM, SGLang, and TensorRT-LLM abstract away all low-level
execution.

This means you can simply:

- Load a model
- Call an API
- Focus on product features

This abstraction is intentional. One of the goals of modern inference frameworks
is to make GPU complexity invisible. Additionally, if a framework already
delivers acceptable performance, there is no obvious reason to go deeper.

## Why kernel optimization still matters

Even if you never write a kernel yourself, the kernel layer sets the ceiling for
everything above it.

### New architectures need new kernels

When a new model architecture comes out, it often brings new patterns:

- New attention mechanisms
- New tensor shapes
- New compute orders

Supporting it is not just writing it in PyTorch. You often need new kernels or
new ways to fuse operations.

Frameworks like vLLM or SGLang rely on prebuilt, pre-optimized kernel libraries.
They don’t automatically support every new idea on day one. Until someone writes
and integrates efficient kernels for the new computation pattern, the framework
either falls back to slower generic implementations or doesn't support the
architecture at all.

That’s why there’s often a gap between:

- A model being released
- That model running efficiently in production

FlashAttention itself is a good example. It wasn't a feature that any inference
framework invented. It was a standalone kernel optimization that frameworks
adopted after it proved its value.

### The performance ceiling is real

High-level frameworks are, in a way, orchestration layers built on top of
collections of kernels. vLLM, SGLang, and TensorRT-LLM all ultimately dispatch
kernels for the actual computation. This means inference speed cannot exceed
what the underlying kernels allow.

System-level optimizations can help, but they can’t fully compensate for
inefficient kernels. If the bottleneck is in the kernel itself, no runtime-level
change will close the gap.

### Hardware portability

If you write custom CUDA kernels, they only run on NVIDIA GPUs. That creates
lock-in:

- Moving to AMD GPUs or other accelerators becomes hard
- You may need to rewrite kernels from scratch

This is why portability layers and compiler-based solutions are becoming more
important. They try to solve a tough tradeoff:

- **Peak performance on a specific backend**
- **Broader portability across hardware backends**

Most teams want both. Few solutions fully deliver it today. A kernel carefully
tuned for one GPU architecture often does not perform well on another without
significant rework.

## FAQs

### What is a GPU kernel?

A GPU kernel is a small program that runs in parallel across a large number of
GPU threads.

In LLM inference, kernels handle the actual math, such as:

- Matrix multiplications
- Attention computations
- Normalization and activation functions

You can think of a kernel as a unit of work executed on the GPU. When your model
generates a token, it triggers many kernels under the hood.

### What is kernel fusion?

Kernel fusion means combining multiple operations into a single GPU kernel. The
key benefit is reducing memory movement and kernel launch overhead.

Consider making a sandwich. Without fusion, every operation in a chain is a
separate job:

1. **Job 1**: Go to the fridge, get the bread, bring it to the counter, toast
   it, then put it back
2. **Job 2**: Go to the fridge, get that toasted bread, bring it back to the
   counter, add ham, then put it back
3. **Job 3**: Go to the fridge again, get the ham sandwich, bring it back to the
   counter, add cheese, then put it back

In GPU terms, the fridge represents global memory (HBM) and the counter
represents fast on-chip memory (registers, shared memory, caches). The key issue
is that moving data between HBM and on-chip memory is much more expensive than
the computation itself.

Without fusion:

- Each operation often writes intermediate results back to global memory
- The next operation reads them again
- This means repeated memory round-trips and high bandwidth pressure

With fusion:

- Multiple operations are combined into a single kernel
- Intermediate results can often stay in fast on-chip memory
- You avoid unnecessary global memory reads/writes

<LinkList>

## Additional resources

- [CUDA C++ Programming Guide](https://docs.nvidia.com/cuda/cuda-c-programming-guide/)
- [What exactly is “CUDA”?](https://www.modular.com/blog/democratizing-compute-part-2-what-exactly-is-cuda?utm_source=llm_handbook)
</LinkList>
