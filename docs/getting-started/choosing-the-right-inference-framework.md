---
sidebar_position: 5
description: Learn what LLM inference frameworks do, why raw model execution is not enough for production, and how to choose the right inference frameworks for your use case.
keywords:
    - Inference frameworks, inference backends, inference runtimes, inference engines, inference platforms
    - Best inference frameworks, best LLM inference providers, LLM inference benchmark
    - vLLM, SGLang, LMDeploy, TensorRT-LLM, Hugging Face TGI, llama.cpp, MLC-LLM, Ollama
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import LinkList from '@site/src/components/LinkList';

# Choosing the right inference framework

Once you’ve selected a model, the next step is choosing how to run it. Your
choice of inference framework directly affects latency, throughput, hardware
efficiency, and feature support. There's no one-size-fits-all solution. The
right choice depends on your deployment scenario, workload, model, and
infrastructure.

## What are inference frameworks?

An inference framework is the software layer that loads a model, runs it on the
right hardware, and serves outputs to applications. For LLMs, this usually means
more than calling the `forward()` function of the model. A framework also
manages token generation,
[KV cache](/inference-optimization/kv-cache-offloading/), batching, streaming
responses, memory limits, and request handling.

You may also see these tools called inference runtimes, inference engines,
inference backends, or model servers. The exact meaning varies by project, but
the core job is the same: make model execution efficient and usable outside a
training notebook.

## Why do I need an inference framework?

You can run inference directly with a raw model in PyTorch or Hugging Face
Transformers. That is often enough for experiments, local testing, or one
request at a time. It is usually not enough for production inference.

Training frameworks are built around learning weights. They support
backpropagation, optimizer steps, gradient accumulation, and large training
batches. Inference has different goals: low latency, high throughput, stable
memory use, streaming output, and predictable behavior under concurrent traffic.

Inference frameworks handle the serving-specific work that raw model execution
does not solve well, such as:

- **Batching and scheduling**: Combine active requests so GPUs stay busy.
- **KV cache management**: Store attention state efficiently for long prompts
  and multi-turn chats.
- **Streaming**: Return tokens as they are generated instead of waiting for the
  full response.
- **Memory control**: Fit larger models and more concurrent requests into
  limited GPU memory.
- **Production APIs**: Expose
  [OpenAI-compatible](/model-interaction/openai-compatible-api/) or
  framework-specific endpoints.
- **Multi-GPU support**: Split large models across devices when one GPU is not
  enough.

These frameworks hide much of the model execution complexity behind serving
options you can tune. Here is an example of serving Gemma 4 31B. The flag names
and accepted values differ, but each framework exposes similar categories of
knobs, such as model parallelism, memory utilization, and maximum sequence
length. You tune these directly without touching the model itself.

<Tabs groupId="inference-framework">
<TabItem value="max" label="MAX">

```bash
max serve --model google/gemma-4-31B-it \
  --devices gpu:0,1 \
  --max-batch-size 16 \
  --device-memory-utilization 0.95 \
  --max-length 262144
```

</TabItem>
<TabItem value="vllm" label="vLLM">

```bash
vllm serve --model google/gemma-4-31B-it \
  --tensor-parallel-size 2 \
  --gpu-memory-utilization 0.90 \
  --enable-auto-tool-choice \
  --reasoning-parser gemma4 \
  --tool-call-parser gemma4 \
  --chat-template examples/tool_chat_template_gemma4.jinja \
  --limit-mm-per-prompt '{"image": 4, "audio": 1}' \
  --async-scheduling
```

</TabItem>
<TabItem value="sglang" label="SGLang">

```bash
sglang serve --model-path google/gemma-4-31B-it \
  --reasoning-parser gemma4 \
  --tool-call-parser gemma4 \
  --mem-fraction-static 0.9 \
  --host 0.0.0.0 --port 30000
```

</TabItem>
</Tabs>

By abstracting away low-level infrastructure work, inference frameworks let you
focus on building applications instead of reimplementing inference logic for
each model architecture.

The benefit is not just convenience. A good inference framework can improve the
latency, throughput, and cost profile of the same model on the same hardware.
For example, [in a 2023 benchmark](https://vllm.ai/blog/2023-06-20-vllm), the
vLLM team reported up to 24× higher throughput than Hugging Face Transformers
without requiring any changes to the underlying model architecture.

The same gap shows up between inference frameworks, not just against raw
Transformers. In a
[2026 benchmark](https://www.modular.com/blog/three-trends-from-mlsys-2026),
Modular reported serving `google/gemma-4-31B-it` with MAX on an NVIDIA B200 at
2.5× faster P99 [TTFT](/llm-inference-basics/llm-inference-metrics/) and 1.5×
the throughput of vLLM. Numbers like these are workload-specific, so treat them
as a reason to benchmark your own traffic rather than as a ranking that holds
everywhere.

## Inference frameworks and tools

Popular inference frameworks for building high-throughput, low-latency LLM
applications include:

- [vLLM](https://github.com/vllm-project/vllm). A high-performance inference
  engine optimized for serving LLMs. It is known for its efficient use of GPU
  resources and fast decoding capabilities.
- [SGLang](https://github.com/sgl-project/sglang). A fast serving framework for
  LLMs and vision language models. It makes your interaction with models faster
  and more controllable by co-designing the backend runtime and frontend
  language.
- [MAX](https://github.com/modular/modular). A high-performance AI serving
  framework from Modular. It provides an integrated suite of tools for AI
  compute workloads across CPUs and GPUs and supports customization at both the
  model and [kernel level](/kernel-optimization/kernel-optimization-tools/).
- [LMDeploy](https://github.com/InternLM/lmdeploy). An inference backend
  focusing on delivering high decoding speed and efficient handling of
  concurrent requests. It supports various quantization techniques, making it
  suitable for deploying large models with reduced memory requirements.
- [TensorRT-LLM](https://github.com/NVIDIA/TensorRT-LLM). An inference backend
  that leverages NVIDIA's TensorRT, a high-performance deep learning inference
  library. It is optimized for running large models on NVIDIA GPUs, providing
  fast inference and support for advanced optimizations like quantization.
- [TokenSpeed](https://github.com/lightseekorg/tokenspeed). An inference
  engine from the LightSeek Foundation aimed at agentic workloads. It features a
  pluggable, layered kernel system, a sophisticated scheduler with safe KV cache
  management, compiler-backed parallelism, and an OpenAI-compatible serving API.
- [Hugging Face TGI](https://github.com/huggingface/text-generation-inference).
  A toolkit for deploying and serving LLMs. It is used in production at Hugging
  Face to power Hugging Chat, the Inference API and Inference Endpoint. Note
  that Hugging Face TGI is now in **maintenance mode**. This means it is still
  supported and usable, but there will no longer be major feature development or
  new performance optimizations. If you’re running TGI in production, it’s worth
  planning an upgrade path as your performance or scaling needs grow.

If you're working with limited hardware or targeting desktop/edge devices, these
tools are optimized for low-resource environments:

- [llama.cpp](https://github.com/ggml-org/llama.cpp). A lightweight inference
  runtime for LLMs, implemented in plain C/C++ with no external dependencies.
  Its primary goal is to make LLM inference fast, portable, and easy to run
  across a wide range of hardware. Despite the name, llama.cpp supports far more
  than just Llama models. It supports many popular architectures like Qwen,
  DeepSeek, and Mistral. The tool is ideal for low-latency inference and
  performs well on consumer-grade GPUs.
- [MLC-LLM](https://github.com/mlc-ai/mlc-llm). An ML compiler and
  high-performance deployment engine for LLMs. It is built on top of Apache TVM
  and requires compilation and weight conversion before serving models. MLC-LLM
  can be used for a wide range of hardware platforms, supporting AMD, NVIDIA,
  Apple, and Intel GPUs across Linux, Windows, macOS, iOS, Android, and web
  browsers.
- [Ollama](https://ollama.com/). A user-friendly local inference tool built on
  top of llama.cpp. It’s designed for simplicity and ease of use, ideal for
  running models on your laptop with minimal setup. However, Ollama is mainly
  used for single-request use cases. Unlike runtimes like vLLM, SGLang, or MAX,
  it doesn’t support concurrent requests. This difference matters since many
  inference optimizations, such as paged attention, prefix caching, and dynamic
  batching, are only effective when handling multiple requests in parallel.

Several of these frameworks have also evolved beyond text generation to serve
diffusion models.

- [SGLang Diffusion](https://docs.sglang.io/docs/sglang-diffusion) supports
  image and video models like FLUX, Wan, and Qwen-Image.
- [vLLM-Omni](https://docs.vllm.ai/projects/vllm-omni/en/latest/) extends vLLM
  to Diffusion Transformers (DiT) and other parallel, non-autoregressive
  generation models across text, image, video, and audio.
- [MAX](https://www.modular.com/solutions/image-generation?utm_source=llm_handbook)
  serves diffusion models like FLUX up to 4x faster than native PyTorch.

## Library mode vs. server mode

Many model inference frameworks, such as vLLM and SGLang, support two deployment
patterns. You can embed the framework as a library inside your application for
better control over execution, or run it as a standalone server that external
clients call through an HTTP API.

### Embed the framework as a library

Library mode loads the inference engine in the same process as your application.
This works well for offline batch jobs, evaluation pipelines, and custom
services that need direct access to engine outputs without an extra network hop.

For example, both vLLM and SGLang expose an in-process engine for this:

<Tabs groupId="inference-framework">
<TabItem value="vllm" label="vLLM">

The
[vLLM offline inference API](https://docs.vllm.ai/en/latest/serving/offline_inference.html)
exposes an `LLM` class:

```python
from vllm import LLM, SamplingParams

model = "meta-llama/Llama-3.1-8B-Instruct"
llm = LLM(model=model)

outputs = llm.generate(
    ["Explain continuous batching in two sentences."],
    SamplingParams(temperature=0.2, max_tokens=64),
)
```

</TabItem>
<TabItem value="sglang" label="SGLang">

[SGLang's offline engine](https://docs.sglang.io/docs/basic_usage/offline_engine_api)
provides a similar interface:

```python
import sglang as sgl

model = "meta-llama/Llama-3.1-8B-Instruct"
llm = sgl.Engine(model_path=model)

outputs = llm.generate(
    ["Explain continuous batching in two sentences."],
    {"temperature": 0.2, "max_new_tokens": 64},
)
```

</TabItem>
</Tabs>

The application now owns the engine lifecycle. A crash, dependency conflict, or
GPU out-of-memory error can affect the entire process, so this pattern requires
careful resource and concurrency management.

### Run the framework as a standalone server

Server mode runs the inference engine in a separate process and exposes a REST
or streaming API. This is usually a better boundary when multiple applications
share a model, clients use different programming languages, or the serving layer
needs to scale and deploy independently.

Start an OpenAI-compatible server:

<Tabs groupId="inference-framework">
<TabItem value="max" label="MAX">

```bash
max serve --model meta-llama/Llama-3.1-8B-Instruct
```

</TabItem>
<TabItem value="vllm" label="vLLM">

```bash
vllm serve --model meta-llama/Llama-3.1-8B-Instruct
```

</TabItem>
<TabItem value="sglang" label="SGLang">

```bash
sglang serve --model-path meta-llama/Llama-3.1-8B-Instruct
```

</TabItem>
</Tabs>

Because these servers expose an
[OpenAI-compatible API](/model-interaction/openai-compatible-api/), the
application code can use the same client interface like this:

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="EMPTY",
)

response = client.chat.completions.create(
    model="meta-llama/Llama-3.1-8B-Instruct",
    messages=[
        {"role": "user", "content": "Explain continuous batching in two sentences."}
    ],
    temperature=0.2,
    max_tokens=64,
)

print(response.choices[0].message.content)
```

The server boundary adds network and serialization overhead, but it isolates the
inference runtime from application code. This makes routing, authentication,
observability, and independent scaling easier to add. In either mode, the
framework still handles model execution, batching, and KV cache management. The
specific choice depends on your use case and how your application integrates
with that engine.

## Why do you need multiple inference runtimes?

In real-world deployments, no single runtime is perfect for every scenario.
Here’s why AI teams often end up using more than one:

### Different use cases have different needs

Models, hardware, and workloads vary. The best performance often comes from
matching each use case with a runtime tailored to that environment.

- **High-throughput, batching**: vLLM, SGLang, MAX, LMDeploy, TensorRT-LLM
  (tuning needed for better performance)
- **Edge/mobile deployment**: MLC-LLM, llama.cpp
- **Local experimentation or single-user scenario**: Ollama and llama.cpp
- **Diffusion model serving (image/video, multimodal)**: SGLang Diffusion,
  vLLM-Omni, MAX

### Toolchains and frameworks evolve fast

Inference runtimes are constantly updated. The best tool today may be missing
features next month. Additionally, some models are only optimized (or supported)
in specific runtimes at launch.

To stay flexible, your infrastructure should be runtime-agnostic. This lets you
combine the best of each tool without getting locked into a single stack.

## Scaling from local LLMs to distributed inference

Many teams follow the same general path as they scale LLM inference.

They often begin with tools like Ollama to run models locally on a laptop or
small workstation. This works well for quick demos and early prototyping. It’s
simple and private, but limited to single-user workloads with no real
concurrency or batching.

From there, teams move to high-performance server runtimes, which provide
continuous batching, KV cache optimizations, and improved GPU utilization on
data center GPUs. However, most of these runtimes lack built-in multi-region
routing, automatic failover, and true horizontal scaling. GPU provisioning,
performance tuning, and fault tolerance also remain complex and time-consuming
to implement.

When teams need to run and scale inference across multiple GPU clusters,
regions, or clouds, they typically adopt
[distributed inference](/infrastructure-and-operations/distributed-inference/)
platforms to handle autoscaling, routing, observability, and compliance
requirements at production scale. These platforms provide advanced features out
of the box, which means your engineering team can focus on product innovation
instead of building and maintaining infrastructure.

## FAQs

### Are all inference frameworks compatible with every LLM?

Not always. Some frameworks support specific architectures first. Others take
time to add advanced features like multi-GPU support, speculative decoding, and
custom attention backends. Always check model-specific compatibility before
selecting a runtime.

### Which inference frameworks support distributed inference for LLMs?

Some models are too large to fit on a single GPU, so you need distributed
inference. Frameworks like vLLM, SGLang, and MAX offer advanced optimizations
like prefill-decode disaggregation or KV-aware routing across multiple workers.
They let you run larger models, handle longer context windows, and serve more
concurrent traffic without hitting memory limits.

### What’s the best way to start experimenting with inference frameworks?

A good path is to begin small and level up as you go. Many people start with
Ollama because it runs on a laptop with almost no setup. It’s perfect for quick
tests, [prompt tinkering](/model-interaction/prompt-engineering/), or getting a
feel for how different models behave. Once you understand the basics and want to
evaluate real performance for production, move to vLLM, SGLang, or MAX. These
frameworks are built for production-level workloads, so you can measure latency,
throughput, batching behavior, and GPU efficiency in a realistic environment.

<LinkList>

## Additional resources

- [LLM performance benchmarks](/inference-optimization/llm-performance-benchmarks/)
</LinkList>
