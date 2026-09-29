---
sidebar_position: 1
description: LLM 推理是指利用已训练的语言模型，基于提示词生成响应或预测的过程。
keywords:
    - Large Language Models, LLM
    - LLM inference meaning, LLM inference concept
    - LLM inference, AI inference, inference layer, LLM 推理
---

import RequestLifecycle from '@site/src/components/RequestLifecycle';

# 什么是 LLM 推理？

LLM 推理（inference）指的是使用已训练的 LLM——例如 GPT-5、GLM-5 和
DeepSeek-V3.2——从用户输入（通常以自然语言[提示词](/model-interaction/prompt-engineering/)的形式提供）
生成有意义的输出。在推理过程中，模型通过其庞大的参数集处理提示词，生成文本、代码片段、摘要和翻译等响应。

本质上，这就是 LLM 真正「投入运行」的时刻。一些真实的例子：

- **客服聊天机器人**：实时生成个性化、贴合上下文的客户答复。
- **写作助手**：补全句子、纠正语法或总结长文档。
- **开发者工具**：将自然语言描述转换为可执行的代码。
- **AI 智能体**：自主执行复杂的多步推理与决策流程。

使用下面的可视化组件，观察 LLM 推理期间一个请求的流转过程。欲了解细节，请阅读
[LLM 推理的工作原理](/llm-inference-basics/how-does-llm-inference-work/)。

<RequestLifecycle />

## 什么是推理服务器？

**推理服务器**（inference server）是管理 LLM 推理如何运行的组件。它加载模型、连接所需的硬件（如 GPU），并处理应用请求。
当一个提示词到达时，服务器分配资源、执行模型并返回输出。

LLM 推理服务器做的远不止简单的请求-响应。它们提供在大规模运行 LLM 时不可或缺的能力，例如：

- **批处理（Batching）**：合并多个请求以提升 GPU 效率
- **流式输出（Streaming）**：逐 token 发送生成内容以降低延迟
- **弹性伸缩（Scaling）**：根据负载增减副本
- **监控（Monitoring）**：暴露性能与调试指标

在 LLM 领域，人们常把**推理服务器**与**推理框架**当作近义词混用。

- **推理服务器**通常强调接收请求、运行模型、返回结果的运行时组件。
- **推理框架**往往指更宽泛的工具集或库，提供高效服务模型所需的
  API、优化与集成。

流行的[推理框架](/getting-started/choosing-the-right-inference-framework/)包括
vLLM、SGLang、MAX 和 TensorRT LLM。它们的设计目标是最大化 GPU
效率，同时让 LLM 更容易大规模部署。

## 服务与推理有什么区别？

推理是计算本身。服务（serving）是把该计算交付给用户和应用的生产过程。

日常交流中两者常被混用，因为现代框架往往两者都做。vLLM、SGLang、MAX 和
TensorRT LLM 这类工具不仅高效执行推理，还管理请求并暴露 API。于是「推理框架」和「服务框架」经常指向同一类系统。

但严格来说它们不是一回事，而且一旦开始设计基础设施，这个区别就会变得重要。

- 推理是前向计算：token 进、下一个 token 的分布出，经由
  prefill（预填充）和解码循环反复进行。这是一个计算操作。你可以在 Jupyter
  notebook 或 Python 脚本里运行推理，完全没有任何服务器——那依然是推理，但你并没有在「服务」任何东西。
- 服务是把这种能力变成可靠的生产服务所需的一切：API 接口（HTTP/gRPC）、请求排队与调度、跨并发请求的批处理、跨副本的负载均衡、自动扩缩容、
模型加载与版本管理、健康检查、可观测性，以及资源分配。

所以当有人混用这两个词时，他们多半只是没在意「自己的推理引擎恰好也是自己的服务器」这个事实——这完全正常。

## 什么是推理优化？

**推理优化**（inference optimization）是让 LLM 推理更快、更便宜、更高效的一组技术。它关注的是在不损害模型质量的前提下降低延迟、
提升吞吐并压低硬件成本。

常见的策略包括：

- 
[连续批处理](/inference-optimization/static-dynamic-continuous-batching/)（continuous 
batching）：
  动态分组请求以提高 GPU 利用率
- [KV cache 管理](/inference-optimization/kv-cache-offloading/)：复用或卸载注意力缓存，
高效处理长提示词
- [投机解码](/inference-optimization/speculative-decoding/)（speculative decoding）：
用更小的草稿模型加速 token 生成
- [量化](/model-preparation/llm-quantization/)：以更低精度（如 INT8、FP8）运行模型，节省显存与算力
- [前缀缓存](/inference-optimization/prefix-caching/)（prefix caching）：缓存公共提示词片段，
减少重复计算
- [多 GPU 
分布/并行](/inference-optimization/data-tensor-pipeline-expert-hybrid-parallelism/)：
将 LLM 拆分到多张 GPU，支撑更大上下文窗口

实践中，推理优化决定的是一个应用用起来迟缓昂贵，还是敏捷且成本高效。

更多内容见[推理优化](/inference-optimization/)一章。

## 我为什么要关心 LLM 推理？

你可能会想：

> 我只是用 OpenAI 的 API，我真的需要理解推理吗？

OpenAI、Anthropic 等提供的 Serverless API 让推理看起来很简单。你发送提示词、收到响应、按
token 付费。基础设施、模型优化和扩缩容都隐藏在幕后。

但问题在于：**产品走得越远，推理越关键。**

随着应用增长，你终将撞上 Serverless API 无法完全解决的瓶颈（成本、延迟、定制化或合规）。那一刻，团队就会开始探索混合或自托管方案。

尽早理解 LLM 推理（例如
[批处理](/inference-optimization/static-dynamic-continuous-batching/)、
[缓存](/inference-optimization/prefix-caching/)、
[量化](/model-preparation/llm-quantization/)和
[路由](/inference-optimization/inference-routing/)）会给你明确的优势。它帮助你在不同模型服务商和
[推理框架](/getting-started/choosing-the-right-inference-framework/)之间评估功能特性，
从而做出更聪明的选择、避开意外，构建更可扩展的系统。

- **如果你是开发者或工程师**：推理正在成为现代 AI 应用开发中与数据库、API
  同等基础的能力。理解它的工作原理帮助你设计更快、更便宜、更可靠的系统。糟糕的推理实现会导致响应缓慢、算力成本高企和糟糕的用户体验。
- **如果你是技术负责人**：推理效率直接影响你的成本底线。一个优化不佳的方案可能多花 10
  倍 GPU 时间，性能反而更差。理解推理帮助你评估供应商、做 build-vs-buy 决策，并为团队设定现实的性能目标。
- **如果你只是对 AI 好奇**：推理正是魔法发生的地方。理解它的工作原理帮助你把
  AI 的炒作与现实区分开，成为更清醒的消费者和讨论参与者。

更多信息见
[Serverless 与自托管 LLM 
推理](/getting-started/serverless-vs-self-hosted-llm-inference/)。
