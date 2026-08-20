---
sidebar_position: 3
description: Compare the main tools for kernel optimization in LLM inference, from cuBLAS and cuDNN to TVM, XLA, Triton, custom CUDA kernels, Mojo and MAX.
keywords:
    - Tools for kernel optimization
    - Kernel optimization tools, GPU kernel tooling, LLM kernel optimization
    - cuBLAS, cuBLASLt, cuDNN, Triton, TVM, XLA, OpenXLA
    - CUDA kernels, custom GPU kernels, kernel DSLs, AI compilers
    - Mojo, MAX
---

import LinkList from '@site/src/components/LinkList';

# Choosing the right kernel optimization tool

Today, most teams don't optimize kernels by writing raw CUDA from scratch. They
work through a stack of tools that sits between model code and the GPU.

The practical question is simple: if you need faster kernels for LLM inference,
which layer of the stack should you reach for first?

## A simple mental model for the tool stack

You can think about kernel tooling as a ladder of control.

At the top are high-level vendor libraries such as cuBLAS and cuDNN. They expose
optimized kernels behind stable APIs. Below that are AI compilers like TVM and
XLA, which try to generate optimized kernels from a higher-level graph or
intermediate representation. Then there are kernel DSLs such as Triton, where
you still write kernels yourself, but in a friendlier programming model than raw
CUDA. At the bottom are hand-written custom kernels, where you control the
memory access pattern, tiling strategy, and scheduling directly.

Newer full-stack efforts such as Mojo and MAX try to blur those boundaries by
combining language, compiler, runtime, and kernel tooling into one stack.

As you move down this ladder, three things usually happen:

- You get more control over tiling, memory movement, and execution details
- You need more GPU expertise and more engineering time
- You get less portability for free

## High-level CUDA libraries

The most common starting point is NVIDIA’s own library stack. This includes
libraries such as cuBLAS and cuDNN.

These libraries package highly optimized kernels behind stable APIs. If your
workload matches a common operator pattern, they are often the fastest way to
get strong performance without doing kernel work yourself.

This layer covers operations such as:

- GEMM and tensor contractions in cuBLAS and cuBLASLt
- Neural network primitives in cuDNN
- Increasingly, fused attention and other common deep learning patterns

This is why frameworks like PyTorch, TensorRT LLM, and many inference stacks
rely on them under the hood. They inherit years of architecture-specific tuning
work (e.g., Ampere, Hopper) that most teams could never justify doing
themselves.

That tuning matters. A kernel that works on one NVIDIA generation does not
automatically achieve peak performance on the next one. New GPUs have different
memory hierarchies, Tensor Core behavior, scheduling details, and instruction
sets. NVIDIA’s library teams retune for those changes so users don't have to.

The benefit is obvious. If your workload is built from standard operations,
these libraries are often good enough out of the box.

However, they have several limitations:

- **Coverage is limited to known patterns**. They don't automatically support
  every new attention variant, fusion strategy, or model-specific operator. When
  models evolve, library support often lags behind.
- **Limited cross-operator optimization**. They are hard to customize across
  library boundaries. If your critical path spans several operators and the best
  answer is a new fused kernel, a library call may no longer be enough.
- **Portability constraints**. CUDA libraries are tied to the NVIDIA ecosystem.
  They are powerful, but the performance benefit is not transferable to AMD GPUs
  or other accelerators.

High-level libraries help you quickly get started, but they only cover the
operators NVIDIA chose to optimize and expose through those libraries. Once your
workload steps outside that catalog, you often need a compiler, a DSL, or a
custom kernel path.

## AI compilers

AI compilers are a layer of software that sit between your high-level model code
(written in something like PyTorch or TensorFlow) and the actual hardware that
runs it. Their job is to automatically transform and optimize the computation so
it runs faster, without you having to rewrite anything by hand.

A simple example is `matmul + bias + activation`. A naive implementation may run
these as separate kernels, writing intermediate results to global memory each
time. A compiler can often fuse that sequence, keep more intermediate data on
chip, reduce extra HBM traffic, thus improving efficiency.

### Why do we need AI compilers?

Modern AI frameworks expose thousands of operators. It is not realistic to
hand-write and retune every one of them across every hardware target. This is
because:

- Operations might involve many small steps with lots of data movement (slow on
  GPUs).
- Different hardware (NVIDIA GPU vs. mobile ARM chip vs. Google TPU) needs
  different optimizations.
- Hand-tuning everything is time-consuming and doesn't scale.

AI compilers automate optimizations like kernel fusion, memory layout changes,
loop optimizations, and hardware-specific tuning. They often use search
algorithms or even machine learning to find the best way to schedule
computations.

### How do AI compilers work?

Most AI compilers follow a similar pipeline:

1. **Import the model**. From frameworks like PyTorch, TensorFlow and ONNX.
2. **Graph-level optimizations** Simplify the computation graph (e.g., remove
   unnecessary parts, fuse operations).
3. **Operator-level optimizations**. Break down into tensor operations and
   optimize each (or groups of them) for the target hardware.
4. **Code generation.** Produce low-level code (e.g., using LLVM, CUDA, or
   custom kernels) and compile it into a deployable module.
5. **Runtime execution.** Run the optimized model efficiently.

They give you a path from high-level code to optimized execution without writing
kernels directly.

---

Here are several well-known AI compilers.

#### Apache TVM

[Apache TVM](https://tvm.apache.org/) is one of the best-known open compiler
stacks in this space. You write your model in frameworks like PyTorch or
TensorFlow, TVM converts it to its own graph IR (Intermediate Representation),
then generates optimized kernels for the target hardware.

One of TVM’s key innovations is **auto-tuning**. TVM tries thousands of
different ways to tile and schedule a computation, benchmarking each one, and
picking the fastest. It's like brute-force searching for the best algorithm
rather than hand-coding it.

However, TVM faces several important challenges.

- **Hard to reach peak performance**. Modern GPUs rely on specialized units
  (e.g., Tensor Cores) and complex memory behavior. Auto-generated kernels often
  fall short of highly tuned vendor libraries or hand-written implementations.
- **Ecosystem fragmentation**. Because TVM is a real implementation (not just a
  standard), hardware vendors often fork and customize it for their own needs.
  This leads to divergence and long-term maintenance challenges.
- **Struggles with rapidly evolving AI workloads**. TVM works best for
  relatively stable operator patterns. Modern GenAI workloads often require new
  algorithms and tightly coupled kernel designs (e.g., FlashAttention), which
  compilers can’t immediately capture.
- **High auto-tuning cost**. Exploring large search spaces can lead to long
  compilation and tuning times, slowing down iteration.

#### XLA and OpenXLA

[XLA](https://openxla.org/xla) came out of Google’s ecosystem and is tightly
integrated with frameworks like TensorFlow and JAX, as well as TPU execution. It
is strong at graph-level rewrites, layout optimization, and backend-specific
lowering inside that stack.

For users already working in JAX or TensorFlow, this tight integration is a
major advantage. When the compiler can see the full computation graph, XLA can
aggressively fuse and reorder operations to achieve strong performance.

Note that people often talk about XLA in two closely related contexts:

- **Internal XLA (TPU-focused)**: the compiler stack Google uses internally for
  TPU workloads
- **OpenXLA / open-source XLA**: the public compiler ecosystem and related
  projects targeting CPUs, GPUs, TPUs, and other backends

They share important pieces such as StableHLO, but the public and internal
stacks aren't identical, and backend maturity varies by framework and target.

Like TVM, XLA faces several practical limitations:

- **Hardware abstraction limits control**. XLA was designed to abstract hardware
  details, but modern GenAI workloads often require fine-grained control over
  memory, data types, custom kernels, and execution patterns.
- **Relies on external kernels**. On GPUs, peak performance often comes from
  calling into CUDA libraries rather than fully compiler-generated kernels.

Learn more about AI compilers in Chris Lattner’s blog posts:

- [What about TVM, XLA, and AI compilers](https://www.modular.com/blog/democratizing-ai-compute-part-6-what-about-ai-compilers?utm_source=llm_handbook)
- [What about the MLIR compiler infrastructure](https://www.modular.com/blog/democratizing-ai-compute-part-8-what-about-the-mlir-compiler-infrastructure?utm_source=llm_handbook)

---

AI compilers try to make things easier by hiding low-level details. However,
GenAI workloads don’t make that easy. To get top performance, you still need:

- Fine control over memory and execution
- The ability to write custom kernels

That results in a tradeoff: More abstraction makes things easier, but it limits
performance.

CUDA gives you full control, but it’s hard to use. As most AI development today
happens in Python, the natural idea is:

- Keep the Python experience
- Still generate fast GPU kernels

That’s where DSL comes in.

## Triton and Python kernel DSLs

A DSL (Domain-Specific Language) is a programming language designed for a
specific purpose rather than general use. For example:

- SQL is a DSL for querying databases
- Regex is a DSL for pattern matching

A kernel DSL is a language designed specifically for writing GPU kernels.

Triton is the most prominent example. It sits between raw CUDA and fully
compiler-driven systems.

With Triton, you still write kernels. The difference is that you write them in a
higher-level, tile-oriented programming model rather than in CUDA C++
thread-level code.

This makes Triton easier to approach than raw CUDA. You still need to think
about memory access, tiling, and parallel work partitioning, but you spend less
time managing low-level machinery directly.

At a high level, a Triton kernel looks like this:

```python title="🐍 Python"
@triton.jit
def add_kernel(x_ptr, y_ptr, output_ptr, n, BLOCK_SIZE: tl.constexpr):
    pid = tl.program_id(0)
    offsets = pid * BLOCK_SIZE + tl.arange(0, BLOCK_SIZE)
    x = tl.load(x_ptr + offsets)
    y = tl.load(y_ptr + offsets)
    tl.store(output_ptr + offsets, x + y)
```

The important thing to notice is not the syntax. It is the programming model:

- You work with blocks or tiles of data (`tl.arange`, `tl.load`)
- You explicitly load and store data
- You don't directly manage `threadIdx`, `blockIdx`, or most warp-level details

That makes Triton a good fit for modern AI kernel work. It is often used for
custom attention kernels, fused pointwise operations, and research-driven
kernels that sit outside the standard library catalog.

Triton also shows why kernel DSLs are useful in practice. It lowers the barrier
without pretending the problem has become easy. You still need GPU intuition.
You still need to understand memory traffic, occupancy, and how tile shape
interacts with the workload.

It also has limits:

- Debugging can still be difficult
- Performance tuning is not automatic
- Portability beyond the primary backend depends on backend maturity and
  compiler support

This is why many see Triton as a middle layer. It helps those who can write
kernels; it does not remove the need for kernel work.

## Custom kernels

Sometimes the right move is simple: Drop the abstractions and write a custom
kernel for the exact bottleneck.

This is where breakthroughs like FlashAttention come from.

This is an important pattern in LLM inference. New model architectures often
bring new attention variants, tensor layouts, or fusion opportunities. Libraries
may lag behind. Compilers don’t optimize them well. At that point, custom
kernels become the frontier path.

However, they don’t scale well. The effort doesn't transfer easily across
models, hardware generations, or teams. Main reasons include:

- **High development cost**. Writing a good kernel is not just coding. It
  requires understanding:
  - GPU architecture (threads, warps, memory hierarchy)
  - How to balance compute vs memory bandwidth
  - How to tile workloads and avoid bottlenecks

    This level of expertise is rare and takes time to build.

- **Hard to maintain**. Every model or hardware change can invalidate the
  assumptions baked into the kernel: expected memory layouts, tile sizes tuned
  for a specific GPU, or intrinsics that don't exist on the next architecture.
- **Hardware lock-in**. Many custom kernels in today's LLM ecosystem are written
  in CUDA, which means:
  - They only run on NVIDIA GPUs
  - Porting to AMD or other accelerators requires rewriting
  - Teams become tied to one hardware ecosystem

That's why the AI community keeps searching for something better: the high
performance of hand-written kernels, without the expertise barrier and hardware
dependency that makes them impractical to scale.

## Mojo and MAX: a full-stack attempt

So far, every layer in the stack forces certain tradeoffs:

- Vendor libraries help you get started quickly, but lock you into NVIDIA
  hardware.
- AI compilers improve flexibility and portability, but sacrifice the
  fine-grained control that peak performance requires.
- Triton gives a friendlier programming model, but you still manage tiling and
  debug low-level details.
- Custom kernels give you full control, but at a high cost in time, expertise,
  and portability.

Modular's attempt with [Mojo](https://mojolang.org) and
[MAX](https://max.modular.com) takes a different approach.
Instead of treating kernels, compilers, and runtimes as separate layers, they
combine them as a single, vertically integrated system.

Mojo is a programming language with Python-like syntax, built on MLIR
(Multi-Level Intermediate Representation), with first-class support for GPU
programming. The goal is to make low-level optimization accessible without
forcing developers to drop into CUDA C++ for every performance-critical path.

In short, you can:

- Write high-level code in a familiar style
- Gradually introduce low-level control when needed
- Stay in one language across the stack

One of the biggest differences is hardware portability. Traditional custom
kernels are written in CUDA and run on NVIDIA only. For other hardware, you have
to rewrite or maintain separate stacks.

With Mojo, the same kernel code can run on NVIDIA, AMD, and more. The MLIR
compilation step handles the translation to each vendor's specific instructions.
This way, you get hardware-aware performance and optimization on each target
without duplicating your kernel code. For example, the compiler can target the
following without requiring separate implementations per vendor.

- Warp synchronization
- Tensor core instructions
- Memory hierarchy details

As shown in the code below, a warp synchronization primitive can be compiled
differently depending on the hardware target:

```mojo title="🔥 Mojo"
# Compile-time warp synchronization per hardware

@always_inline("nodebug")
def syncwarp(mask: Int = -1):
    comptime if is_nvidia_gpu():
        __mlir_op.`nvvm.bar.warp.sync`(
            __mlir_op.`index.casts`[_type=__mlir_type.i32](
                mask.__mlir_index__()
            )
        )
    elif is_amd_gpu():
        llvm_intrinsic["llvm.amdgcn.wave.barrier", NoneType]()
    elif is_apple_gpu():
        llvm_intrinsic["llvm.air.simdgroup.barrier", NoneType](
            Int32(0), Int32(4)
        )
    else:
        CompilationTarget.unsupported_target_error[
            operation=__get_current_function_name()
        ]()
```

MAX is the execution and compilation layer underneath. It handles the full
inference path:

- Model definition (with a PyTorch-like API)
- Graph compilation (via MLIR)
- Kernel generation and execution on hardware

Instead of stitching together PyTorch, vLLM, CUDA, and custom kernels, MAX
provides one stack from model graph to GPU kernel. This allows optimization
across layers, not just within one.

Note that Mojo and MAX are maturing, and the ecosystem around them is a fraction
of what CUDA has accumulated over fifteen years. However, they are different in
kind from what came before. The right way to read Mojo and MAX is not as a
settled winner. It is better to see them as a serious attempt to close the gap
that older tools leave open: too much fragmentation, too much rewrite work, and
too much coupling between peak performance and one specific backend.

For teams navigating mixed GPU fleets, rising hardware costs, or the maintenance
burden of hand-written CUDA kernels, it is worth understanding what this stack
can do.

## How should you choose among these tools

Most teams shouldn't start at the bottom of the stack.

- If your workload matches common operator patterns, start with vendor libraries
  through your framework or inference engine.
- If graph-level optimization can remove memory round-trips or fuse repeated
  patterns, an AI compiler may give you leverage.
- If you need a custom kernel but want a better authoring model than CUDA C++,
  Triton is often the next step.
- If you want both kernel-level control and broader hardware portability, Mojo
  and MAX offer another path. They let you write custom kernels in a
  higher-level language while relying on the compiler stack to target different
  backends where support exists.
- If a critical bottleneck still needs maximum control on a specific hardware
  target, then handwritten CUDA kernels may be worth the cost.

The right choice depends on a few practical questions. The answers will point
you to a different layer of the stack.

- Is the operator standard or novel?
- Do you care more about peak performance on one backend, or portability across
  several?
- Does your team have compiler expertise, kernel expertise, or neither?
- Are you building general product infrastructure or frontier model kernels?

## FAQs

### Should most inference teams write custom kernels?

Usually, no.

Most teams should start with the kernels already available through frameworks,
vendor libraries, or existing inference engines. Custom kernels make sense when
a critical workload is not already served well by those tools and the
performance upside is large enough to justify the engineering cost.

### Are vendor libraries enough for modern LLM inference?

They are essential for many standard operations, but they aren't enough for
every frontier workload.

Once a model introduces a new attention pattern, a new fusion opportunity, or an
unusual operator mix, you may need compiler help or a custom kernel path.

### How is Triton different from an AI compiler like TVM or XLA?

Triton is a kernel authoring model. The developer still writes the kernel logic
and controls the data movement at a fairly low level.

TVM and XLA work at a higher graph or compiler level. They try to automate more
of the lowering and optimization process across many operations.

<LinkList>

## Additional resources

- [What about TVM, XLA, and AI compilers?](https://www.modular.com/blog/democratizing-ai-compute-part-6-what-about-ai-compilers?utm_source=llm_handbook)
- [What about Triton and Python eDSLs?](https://www.modular.com/blog/democratizing-ai-compute-part-7-what-about-triton-and-python-edsls?utm_source=llm_handbook)
- [What about the MLIR compiler infrastructure?](https://www.modular.com/blog/democratizing-ai-compute-part-8-what-about-the-mlir-compiler-infrastructure?utm_source=llm_handbook)
</LinkList>
