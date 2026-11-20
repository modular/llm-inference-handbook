# zh-CN 翻译规范

本文是简体中文译文的语言规范和术语表。各语言通用的规则见
[`LOCALIZATION.md`](../../LOCALIZATION.md)，包括文件位置、front matter、标题
ID、图片路径、公式、`source_commit` 和翻译流程。

## 读者与语气

- 读者是构建和运维 LLM
  推理系统的中文工程师。他们熟悉英文术语、参数名和指标名，读中文是为了理解得更快、更准。
- 称呼读者用“你”，不用“您”。
- 语气和原文一致：直接、务实。不加原文没有的客套话、强调、总结或解释。
- 翻译意思，不翻译字面。按中文语序重组句子：时间、条件、原因放在前面，结果放在后面。长句拆成短句，一句超过
  40 个字就考虑拆开。
- 原文的修辞问句和口语化的句子（如“But here's the
  thing”），换成中文里同样自然的说法，不逐词对译。

## 术语

- 一个概念只用一种译法，以文末的术语表为准。术语表按概念对应，不按词形：同一个英文词在不同语境里意思不同时，看说明栏，按上下文选译法。
- 术语表没收录的普通词，按中文习惯翻译，不加括注。新的技术名、指标名和容易混淆的词，在
  PR 里提出译法和依据，协调人确认后加进术语表。
- “括注”为“是”的术语，在每页正文第一次出现时写成“中文（English）”，例如“预填充（prefill）”。缩写写成“中文（全称，缩写）”，例如“首
  token 延迟（time to first
  token，TTFT）”，即使原文这里只写了缩写；原文只写全称的，不补缩写。之后按原文写中文或缩写。
- 正文包括段落、列表、表格和图注；标题、front
  matter、代码和公式不算第一次出现。复合术语整体括注一次，例如“投机解码（speculative
  decoding）”，不再单独给“解码”括注。同一概念的全称、缩写和变体（如 KV cache、KV
  caching、key-value (KV)
  cache）共用一次括注。原文已有括号时，和括注合成一个，例如“全局内存（global
  memory，HBM）”。
- 括注的英文放在加粗外面：`**推理服务器**（inference server）`。
- 这些保留英文：
  - 产品、框架、公司和模型名，如 vLLM、SGLang、MAX、TensorRT
    LLM、CUDA、OpenAI、DeepSeek-V3.2；
  - 模型架构名，如 Transformer；
  - 常见缩写，如 LLM、GPU、CPU、API，直接写，不展开；
  - API、参数、文件和命令名；
  - 精度格式和具体方法的名字，如
    FP8、INT4、AWQ、LoRA、FlashAttention、PagedAttention、EAGLE、Medusa。通用的技术名按术语表翻译，如
    quantization 译“量化”；
  - 指标缩写，如 TTFT、TPOT、ITL、TPS、SLO、P99；
  - token。
- 夹在中文里的普通英文名词用单数：GPUs 写成 GPU，tokens 写成
  token。产品名照原样，如 Hugging Face Transformers。
- 原文刻意区分的近义词，中文也要区分，例如 inference server 和 inference
  framework，inference 和 serving，accuracy 和 precision。

## 标点与空格

| 规则                                                                                                         | 改前 → 改后                                                                                           |
|--------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| 中文句子用全角标点；代码、命令和整句英文用半角                                                               | `支持 FP8,但需要 Hopper.` → `支持 FP8，但需要 Hopper。`                                               |
| 中文和英文字母、数字之间加一个半角空格；全角标点前后不加                                                     | `在8张H100上跑vLLM ，` → `在 8 张 H100 上跑 vLLM，`                                                   |
| 链接和加粗的两侧分开看：标记里靠边的字是英文或数字、标记外紧挨着的是汉字，就在标记外加空格；挨着全角标点不加 | `使用[vLLM](...)部署` → `使用 [vLLM](...) 部署`；`详见[vLLM 文档](...)。` → `详见 [vLLM 文档](...)。` |
| 引号用“”，引号里再套引号用‘’，不用「」                                                                       | `「推理框架」` → `“推理框架”`                                                                         |
| 并列的词用顿号，英文词也一样；最后一项前按原意用“和”“以及”或“或”                                             | `vLLM, SGLang, or MAX` → `vLLM、SGLang 或 MAX`                                                        |
| 括号用全角（），括号前后不加空格；公式和代码里的括号不改                                                     | `预填充 (prefill)` → `预填充（prefill）`                                                              |
| 英文的破折号（—）多数改成逗号、冒号或括号；确实需要时用 `——`                                                 | `预填充是计算受限的—它一次处理所有 token` → `预填充是计算受限的：它一次处理所有 token`                |
| 省略号用 `……`，不和“等”连用                                                                                  | `vLLM、SGLang 等……` → `vLLM、SGLang 等`                                                               |
| 标题末尾不用句号和冒号；问句标题保留问号                                                                     | `## 什么是推理服务器？`                                                                               |
| 加粗的首尾不要放标点：首尾是标点、外侧又紧挨着文字时，页面上会直接显示 `**`                                  | `**注意：**这是` → `**注意**：这是`                                                                   |
| 图注编号去掉英文的句点                                                                                       | `<b>Figure 1.</b>` → `<b>图 1</b>`                                                                    |

## 数字与单位

- 计量和编号用阿拉伯数字。相邻数字连用或带“几”的概数用汉字，如“三四个”“几百毫秒”。同一页里同类数字的写法要一致。
- 字母单位前加空格（`80 GB`、`2 ms`），`%` 和 `×` 前不加（`15%`、`10×`）。
- 范围两头都写单位：`15%～30%`，不写 `15～30%`。
- 倍数：不写“降低 N 倍”“减少 N 倍”，`3x lower latency` 译为“延迟降到原来的
  1/3”。`10× more` 译为“是……的 10 倍”，不写“多 10 倍”“增加 10
  倍”，这两种说法有人会理解成 11 倍。注意区分“增加了”和“增加到”。
- 情态词和范围词照原文译出：`up to 2x` 是“最多 2 倍”，不是“2
  倍”；`can`、`may`、`often`、`usually` 都要译出来。

## Markdown

- 每段写成一行，再运行
  `pnpm lint:md:fix`。它只在空格处折行，不会拆开连续的汉字。不要手动在两个汉字之间换行，Chrome
  会把这个换行显示成一个空格。
- 例外：列表里有 `$$` 公式时，`lint:md:fix` 可能把公式并成一行，公式就坏了。用
  `<!-- rumdl-disable MD013 -->` 和 `<!-- rumdl-enable MD013 -->`
  把整个列表包起来，见 `LOCALIZATION.md` 翻译流程第 4 步。
- 中文不用斜体。原文用斜体强调的，改用加粗；表示引语或心里话的，改用引号。数学变量（如
  *h*、*K*）和保留英文的书名照原样。
- 翻译 front matter 的 `keywords`
  时，每一项保留原有的英文，在后面用半角逗号接上中文关键词，例如
  `- Large Language Models, LLM, 大语言模型`。

## 常见翻译腔

交稿前逐条检查。这些不是禁用词：只在不改变原意、条件和语气时改写。

| 写法                 | 改前 → 改后                                                                                                              |
|----------------------|--------------------------------------------------------------------------------------------------------------------------|
| “被”字句             | `模型在启动时被加载到显存中` → `启动时，模型会加载到显存`                                                                |
| 一句里有三个以上“的” | `批次中的请求的解码阶段的延迟` → `批内各请求的解码延迟`                                                                  |
| “进行”“作出”加名词   | `对模型进行量化` → `量化模型`                                                                                            |
| “一个”“一种”         | `vLLM 是一个使用一种叫作 PagedAttention 的技术的推理引擎` → `vLLM 是推理引擎，采用了 PagedAttention 技术`                |
| “当……时”             | `当显存不足的时候，引擎会拒绝新请求` → `显存不足时，引擎会拒绝新请求`                                                    |
| “对于……来说”         | `对于长提示词来说，预填充占主导` → `提示词较长时，主要时间花在预填充上`                                                  |
| 多余的代词           | `引擎加载模型，并将它切分到多块 GPU 上` → `引擎加载模型，切分到多块 GPU 上`                                              |
| 很长的前置定语       | `一种通过使用较小的草稿模型让大模型每次生成多个 token 的技术` → `这种技术借助较小的草稿模型，让大模型每次产出多个 token` |
| 名词化、“使得”       | `内存占用的减少使得更大的批次成为可能` → `内存占用降下来，批就能开得更大`                                                |
| “可以被用来”“关于”   | `量化可以被用来减少显存占用` → `量化可以减少显存占用`                                                                    |
| 用“和”连接分句       | `路由器做负载均衡和调度器组批` → `路由器负责负载均衡，调度器负责组批`                                                    |
| 条件放在后面         | `使用张量并行，如果单块 GPU 放不下模型` → `如果单块 GPU 放不下模型，就用张量并行`                                        |

## 审校

审阅时逐段对照英文，先看意思，再看中文：

- 数字、倍数、单位和范围与原文一致；
- can、may、often、up to 这类情态词和范围词没有丢；
- 术语符合术语表，第一次出现时按“括注”和“说明”两栏处理；
- 公式在页面上显示完整，没有被 `lint:md:fix` 改坏；
- 符合本文的标点、空格和 Markdown 规则；
- 读起来是中文，没有上面列的翻译腔。

译文改变了原文的结论或操作步骤，必须改；意思没错，只是读着像翻译，能改就改。

## 术语表

“括注”为“是”的词，在每页正文第一次出现时写成“中文（English）”；“否”表示不加英文括注。中文一栏写“保留英文”的，正文直接用英文；需要中文解释的，按说明栏在第一次出现时加。

| English                              | 中文                  | 括注 | 说明                                                                                                                                                                                                                    |
|--------------------------------------|-----------------------|------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| acceptance rate                      | 接受率                | 是   |                                                                                                                                                                                                                         |
| accuracy                             | 准确率                | 是   | 指答对的比例时写“准确率”；泛指结果对不对时写“准确性”，如 factual accuracy 写“事实准确性”。不写“精度”，precision 才是“精度”                                                                                              |
| activation                           | 激活值                | 是   | 量化里的 activation；activation function 写“激活函数”                                                                                                                                                                   |
| agent                                | 智能体                | 是   | agent harness 写成“智能体 harness（agent harness）”                                                                                                                                                                     |
| AI agent                             | AI 智能体             | 否   |                                                                                                                                                                                                                         |
| arithmetic intensity                 | 算术强度              | 是   |                                                                                                                                                                                                                         |
| attention                            | 注意力                | 否   |                                                                                                                                                                                                                         |
| autoregressive                       | 自回归                | 否   |                                                                                                                                                                                                                         |
| autoscaling                          | 自动扩缩容            | 是   | 不用“弹性伸缩”                                                                                                                                                                                                          |
| bank conflict                        | bank 冲突             | 是   |                                                                                                                                                                                                                         |
| batch                                | 批次                  | 否   | 也可以说“一批”“批内”                                                                                                                                                                                                    |
| batch size                           | 批量大小              | 否   | 也常写作“批大小”                                                                                                                                                                                                        |
| batching                             | 批处理                | 是   |                                                                                                                                                                                                                         |
| benchmark                            | 基准测试              | 否   |                                                                                                                                                                                                                         |
| BYOC (bring your own cloud)          | 保留英文              | 否   | 第一次出现写“BYOC（自带云）”                                                                                                                                                                                            |
| cache-aware routing                  | 缓存感知路由          | 是   | prefix-aware 写“前缀感知”                                                                                                                                                                                               |
| calibration                          | 校准                  | 否   |                                                                                                                                                                                                                         |
| chain-of-thought (CoT)               | 思维链                | 是   |                                                                                                                                                                                                                         |
| chatbot                              | 聊天机器人            | 否   |                                                                                                                                                                                                                         |
| checkpoint                           | 检查点                | 是   | 指模型文件时可写“模型检查点”                                                                                                                                                                                            |
| chunked prefill                      | 分块预填充            | 是   |                                                                                                                                                                                                                         |
| cold start                           | 冷启动                | 否   |                                                                                                                                                                                                                         |
| compute-bound                        | 计算受限              | 是   |                                                                                                                                                                                                                         |
| concurrency                          | 并发                  | 否   |                                                                                                                                                                                                                         |
| constrained decoding                 | 约束解码              | 是   |                                                                                                                                                                                                                         |
| context caching                      | 上下文缓存            | 是   |                                                                                                                                                                                                                         |
| context length                       | 上下文长度            | 否   |                                                                                                                                                                                                                         |
| context window                       | 上下文窗口            | 否   |                                                                                                                                                                                                                         |
| continuous batching                  | 连续批处理            | 是   |                                                                                                                                                                                                                         |
| control plane                        | 控制平面              | 否   |                                                                                                                                                                                                                         |
| cross-region                         | 跨区域                | 否   | region 写“区域”。阿里云叫“地域”，这里不用                                                                                                                                                                               |
| data parallelism                     | 数据并行              | 是   |                                                                                                                                                                                                                         |
| data plane                           | 数据平面              | 否   |                                                                                                                                                                                                                         |
| data residency                       | 数据驻留              | 是   |                                                                                                                                                                                                                         |
| decode (decoding)                    | 解码                  | 是   |                                                                                                                                                                                                                         |
| decode loop                          | 解码循环              | 否   |                                                                                                                                                                                                                         |
| dense model                          | 稠密模型              | 是   | 和 MoE 相对                                                                                                                                                                                                             |
| distillation                         | 蒸馏                  | 否   |                                                                                                                                                                                                                         |
| distributed inference                | 分布式推理            | 否   |                                                                                                                                                                                                                         |
| draft model                          | 草稿模型              | 是   |                                                                                                                                                                                                                         |
| draft token                          | 草稿 token            | 否   |                                                                                                                                                                                                                         |
| dynamic batching                     | 动态批处理            | 是   |                                                                                                                                                                                                                         |
| embedding                            | 嵌入                  | 是   | 指向量时写“嵌入向量”；embedding model 写“嵌入模型”                                                                                                                                                                      |
| end-to-end latency (E2EL)            | 端到端延迟            | 是   | 原文的 total latency 也是这个指标                                                                                                                                                                                       |
| endpoint                             | 端点                  | 否   |                                                                                                                                                                                                                         |
| eviction                             | 淘汰                  | 否   | 缓存场景，如“KV 缓存淘汰”                                                                                                                                                                                               |
| expert parallelism                   | 专家并行              | 是   |                                                                                                                                                                                                                         |
| failover                             | 故障转移              | 否   |                                                                                                                                                                                                                         |
| few-shot                             | 少样本                | 否   |                                                                                                                                                                                                                         |
| fine-tuning                          | 微调                  | 否   |                                                                                                                                                                                                                         |
| forward pass                         | 前向传播              | 是   |                                                                                                                                                                                                                         |
| fragmentation                        | 碎片                  | 否   | memory fragmentation 写“显存碎片”                                                                                                                                                                                       |
| function calling                     | 函数调用              | 是   |                                                                                                                                                                                                                         |
| global memory                        | 全局内存              | 是   | GPU 的内存空间，位于显存，不是主机内存                                                                                                                                                                                  |
| goodput                              | 有效吞吐量            | 是   |                                                                                                                                                                                                                         |
| GPU memory                           | 显存                  | 否   | 指 HBM 等片外设备内存及其容量时写“显存”；泛指寄存器、共享内存、缓存和 HBM 这一整套时写“GPU 内存”，如 GPU memory hierarchy 写“GPU 内存层次结构”。memory bandwidth 按层级写，如“显存带宽”“共享内存带宽”。主机内存写“内存” |
| GPU utilization                      | GPU 利用率            | 否   |                                                                                                                                                                                                                         |
| grid                                 | 网格                  | 否   | CUDA 的线程网格                                                                                                                                                                                                         |
| hallucination                        | 幻觉                  | 否   |                                                                                                                                                                                                                         |
| HBM                                  | 保留英文              | 否   | 第一次出现写“HBM（高带宽内存）”                                                                                                                                                                                         |
| health check                         | 健康检查              | 否   |                                                                                                                                                                                                                         |
| hybrid parallelism                   | 混合并行              | 是   |                                                                                                                                                                                                                         |
| inference                            | 推理                  | 是   | reasoning 也译“推理”。两者在同一页出现时，reasoning 第一次出现写“推理（reasoning）”                                                                                                                                     |
| inference engine                     | 推理引擎              | 是   |                                                                                                                                                                                                                         |
| inference framework                  | 推理框架              | 是   |                                                                                                                                                                                                                         |
| inference optimization               | 推理优化              | 否   |                                                                                                                                                                                                                         |
| inference provider                   | 推理服务商            | 否   |                                                                                                                                                                                                                         |
| inference server                     | 推理服务器            | 是   |                                                                                                                                                                                                                         |
| inter-token latency (ITL)            | token 间延迟          | 是   | 和 TPOT 区分                                                                                                                                                                                                            |
| interconnect                         | 互连                  | 否   | 硬件之间的连接写“互连”，不写“互联”                                                                                                                                                                                      |
| kernel                               | 保留英文              | 否   | 每页第一次出现写“kernel（GPU 核函数）”；kernel fusion 写“kernel 融合”                                                                                                                                                   |
| KV cache                             | KV 缓存               | 是   |                                                                                                                                                                                                                         |
| KV cache offloading                  | KV 缓存卸载           | 是   |                                                                                                                                                                                                                         |
| latency                              | 延迟                  | 否   | 不用“时延”                                                                                                                                                                                                              |
| load balancing                       | 负载均衡              | 否   |                                                                                                                                                                                                                         |
| logits                               | 保留英文              | 否   | softmax 之前的原始分数                                                                                                                                                                                                  |
| memory coalescing                    | 合并访存              | 是   |                                                                                                                                                                                                                         |
| memory-bound                         | 内存受限              | 是   | 指受内存带宽限制（在 GPU 上通常是显存带宽），和计算受限相对，不是容量不够                                                                                                                                               |
| mixture of experts (MoE)             | 混合专家模型          | 是   | 第一次出现之后写 MoE                                                                                                                                                                                                    |
| model service provider               | 模型服务商            | 否   |                                                                                                                                                                                                                         |
| model serving                        | 模型服务              | 否   |                                                                                                                                                                                                                         |
| monitoring                           | 监控                  | 否   |                                                                                                                                                                                                                         |
| multi-cloud                          | 多云                  | 否   |                                                                                                                                                                                                                         |
| multi-token prediction (MTP)         | 多 token 预测         | 是   |                                                                                                                                                                                                                         |
| node                                 | 节点                  | 否   | 和 worker 区分                                                                                                                                                                                                          |
| observability                        | 可观测性              | 否   |                                                                                                                                                                                                                         |
| occupancy                            | 占用率                | 是   | SM 上活跃线程束占上限的比例，不是 GPU 利用率                                                                                                                                                                            |
| on-chip memory                       | 片上内存              | 否   | off-chip 写“片外”                                                                                                                                                                                                       |
| on-prem (on-premises)                | 本地部署              | 是   | 指自有数据中心；不用“私有化部署”                                                                                                                                                                                        |
| open-weight model                    | 开放权重模型          | 是   |                                                                                                                                                                                                                         |
| operator                             | 算子                  | 否   | 和 kernel 区分                                                                                                                                                                                                          |
| orchestration                        | 编排                  | 否   |                                                                                                                                                                                                                         |
| overhead                             | 开销                  | 否   |                                                                                                                                                                                                                         |
| padding                              | 填充                  | 否   | 不要和预填充（prefill）混淆                                                                                                                                                                                             |
| parallelism                          | 并行                  | 否   | 表示并行的规模时写“并行度”；和 concurrency（并发）区分                                                                                                                                                                  |
| percentile                           | 百分位数              | 否   | P50、P90、P99 照写                                                                                                                                                                                                      |
| pipeline parallelism                 | 流水线并行            | 是   | 不用“管道并行”                                                                                                                                                                                                          |
| precision                            | 精度                  | 否   | 指数值格式，如 FP16、INT4；和 accuracy 区分                                                                                                                                                                             |
| prefill                              | 预填充                | 是   |                                                                                                                                                                                                                         |
| prefill-decode disaggregation        | 预填充-解码分离       | 是   | 第一次出现之后可写“PD 分离”                                                                                                                                                                                             |
| prefix caching                       | 前缀缓存              | 是   |                                                                                                                                                                                                                         |
| prompt                               | 提示词                | 否   |                                                                                                                                                                                                                         |
| prompt caching                       | 提示缓存              | 是   |                                                                                                                                                                                                                         |
| prompt engineering                   | 提示工程              | 否   |                                                                                                                                                                                                                         |
| pruning                              | 剪枝                  | 是   |                                                                                                                                                                                                                         |
| quantization                         | 量化                  | 是   |                                                                                                                                                                                                                         |
| queries per second (QPS)             | 每秒查询数            | 是   |                                                                                                                                                                                                                         |
| recomputation                        | 重计算                | 否   |                                                                                                                                                                                                                         |
| replica                              | 副本                  | 否   |                                                                                                                                                                                                                         |
| requests per second (RPS)            | 每秒请求数            | 是   |                                                                                                                                                                                                                         |
| retrieval-augmented generation (RAG) | 检索增强生成          | 是   |                                                                                                                                                                                                                         |
| roofline model                       | Roofline 模型         | 否   |                                                                                                                                                                                                                         |
| round-robin                          | 轮询                  | 是   |                                                                                                                                                                                                                         |
| routing                              | 路由                  | 否   |                                                                                                                                                                                                                         |
| runtime                              | 运行时                | 否   | 指软件；表示时长时写“运行时间”                                                                                                                                                                                          |
| sampling                             | 采样                  | 否   |                                                                                                                                                                                                                         |
| scale to zero                        | 缩容到零              | 否   |                                                                                                                                                                                                                         |
| scaling                              | 扩缩容                | 否   | 指增减实例，不用“弹性伸缩”；量化里的 scaling 写“缩放”                                                                                                                                                                   |
| scheduling                           | 调度                  | 否   |                                                                                                                                                                                                                         |
| self-attention                       | 自注意力              | 否   |                                                                                                                                                                                                                         |
| self-hosted                          | 自托管                | 是   | 不用“私有化部署”                                                                                                                                                                                                        |
| sequence length                      | 序列长度              | 否   |                                                                                                                                                                                                                         |
| serverless                           | 保留英文              | 否   | 每页第一次出现写“Serverless（无服务器）”                                                                                                                                                                                |
| service-level agreement (SLA)        | 服务等级协议          | 是   |                                                                                                                                                                                                                         |
| service-level objective (SLO)        | 服务等级目标          | 是   |                                                                                                                                                                                                                         |
| serving                              | 服务                  | 是   | 和 inference 区分。表里单列的复合词按各自的条目译；其他复合词写“推理服务”，如 LLM serving 写“LLM 推理服务”。专门对比 inference 和 serving 的段落，serving 只写“服务”                                                    |
| serving framework                    | 服务框架              | 是   |                                                                                                                                                                                                                         |
| sharding                             | 切分                  | 否   |                                                                                                                                                                                                                         |
| shared memory                        | 共享内存              | 是   | GPU 的片上内存，不是主机内存                                                                                                                                                                                            |
| speculative decoding                 | 投机解码              | 是   | 也有人译“推测解码”                                                                                                                                                                                                      |
| speculative sampling                 | 投机采样              | 是   |                                                                                                                                                                                                                         |
| SRAM                                 | 保留英文              | 否   |                                                                                                                                                                                                                         |
| static batching                      | 静态批处理            | 是   |                                                                                                                                                                                                                         |
| streaming                            | 流式输出              | 是   | 只用于逐步返回生成结果；读取数据的 streaming 按上下文译，如 streaming weights 写“读取权重”                                                                                                                              |
| streaming multiprocessor (SM)        | 流式多处理器          | 是   |                                                                                                                                                                                                                         |
| structured output                    | 结构化输出            | 否   |                                                                                                                                                                                                                         |
| system prompt                        | 系统提示词            | 否   |                                                                                                                                                                                                                         |
| tail latency                         | 尾延迟                | 是   |                                                                                                                                                                                                                         |
| target model                         | 目标模型              | 是   |                                                                                                                                                                                                                         |
| temperature                          | 温度                  | 否   | 作为参数名时写 `temperature`                                                                                                                                                                                            |
| tensor parallelism                   | 张量并行              | 是   |                                                                                                                                                                                                                         |
| thread block                         | 线程块                | 否   |                                                                                                                                                                                                                         |
| throughput                           | 吞吐量                | 否   |                                                                                                                                                                                                                         |
| tiling                               | 分块                  | 是   | 分出的 tile 写“块”                                                                                                                                                                                                      |
| time per output token (TPOT)         | 每个输出 token 的时间 | 是   | 和 ITL 区分                                                                                                                                                                                                             |
| time to first token (TTFT)           | 首 token 延迟         | 是   |                                                                                                                                                                                                                         |
| token                                | 保留英文              | 否   | 不译作“词元”或“令牌”；写单数，不加反引号                                                                                                                                                                                |
| tokenization                         | 分词                  | 是   |                                                                                                                                                                                                                         |
| tokenizer                            | 分词器                | 是   |                                                                                                                                                                                                                         |
| tokens per second (TPS)              | 每秒 token 数         | 是   |                                                                                                                                                                                                                         |
| tool calling                         | 工具调用              | 否   |                                                                                                                                                                                                                         |
| tracing                              | 链路追踪              | 是   | 可观测性里的 traces 写“链路”；reasoning traces 写“推理过程”                                                                                                                                                             |
| vendor lock-in                       | 供应商锁定            | 否   |                                                                                                                                                                                                                         |
| warp                                 | 线程束                | 是   |                                                                                                                                                                                                                         |
| worker                               | 保留英文              | 否   | 能独立执行推理的单元，不一定是一台机器；不要都写成“节点”                                                                                                                                                                |
| workload                             | 工作负载              | 否   |                                                                                                                                                                                                                         |
| zero-shot                            | 零样本                | 否   |                                                                                                                                                                                                                         |
