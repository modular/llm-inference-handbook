---
sidebar_position: 7
description: An agent harness is the runtime around a model that turns an LLM into an agent. Learn why LLMs need one, which harnesses are popular, and how to run them on open-source models.
keywords:
    - Agent harness, harness engineering
    - LLM agents, agentic inference, agent loop
    - Tool calling, agent context management
    - Coding agents, Claude Code, Codex
    - Open-source LLMs, self-hosted agents
---

import LinkList from '@site/src/components/LinkList';

# Agent harnesses

An agent harness is the system around the model that turns it into an agent. It
maintains state, exposes tools, executes approved actions, returns observations,
and decides whether the model should keep going. Those jobs typically live in
the control loop, the tool interface, the context assembled for each turn, the
checks on what the model produced, and the rules about what it's allowed to
touch.

A harness doesn't make the model inherently more intelligent. It gives the model
an environment where useful work can happen safely and repeatedly. The relation
is often summarized as:

> Agent = Model + Harness

## Why do you need an agent harness?

Many models today can process text, images, audio, and video themselves.
However, without support from the application around it, they can't run a
tool, execute code, set up an environment, remember a previous call, or judge
whether the larger task is finished.

[Function calling](/model-interaction/function-calling/) closes part of that gap
by letting a model request an action, but a request is not an execution. The
[Model Context Protocol (MCP)](/model-interaction/model-context-protocol/)
standardizes how tools and data sources connect, but it doesn't define the agent
loop. Something still has to run the tools, feed the results back, and decide
whether to continue or stop.

Without a deliberate harness, a model fails in predictable ways:

- **Unbounded loops**. It repeats an action or keeps revising without making
  progress.
- **Context overload**. Logs, files, and tool results crowd out the instructions
  that matter.
- **Unsafe actions**. A valid tool call reaches a system the model shouldn't
  have direct authority over.
- **False completion**. It reports success with no test or external check
  confirming the result.
- **Brittle recovery**. A timeout or malformed response ends the task because no
  checkpoint or retry policy exists.
- **Opaque failures**. The answer is wrong, but no trace shows which call or
  tool result caused it.

These are mainly runtime problems. A stronger model can reduce some mistakes,
but a model upgrade does not replace control flow, permissions, or verification.

## Use cases

Agent harnesses work best when a task needs several model calls, external
actions, and feedback from the environment. Common use cases include:

- **Coding agents**. Read a repository, edit files, run tests, and iterate on
  failures. This is the highest-volume harness workload today and among the most
  demanding, with large
  [context windows](/llm-inference-basics/how-does-llm-inference-work/#what-is-a-context-window-and-how-does-it-work-in-llm-inference)
  and tool calls on multiple steps.
- **Deep research**. Search, read, cross-check, and synthesize sources. These
  runs last a long time, fan out to parallel sub-agents, and fill context with
  retrieved documents rather than reasoning from the agent itself.
- **Customer support services**. A support agent can read account data, apply
  policy, draft a response, and request approval before a refund or account
  change.
- **Browser and computer use**. The harness can translate model decisions into
  clicks or keystrokes, enforcing domain restrictions and confirmation rules.
- **Multi-agent pipelines**. A planner delegates to specialized sub-agents and
  merges their results, which is the agentic form of the patterns covered in
  [multi-model inference pipelines](/infrastructure-and-operations/multi-model-inference-pipelines/).

## Popular agent harnesses

The boundary between a harness, an agent framework, and an end-user product
isn't sharp. The following projects are representative rather than ranked, and
they fall into two rough groups.

### Coding harnesses

These harnesses are generally invoked per task, run in a terminal or editor, and
scope their actions to a repository and the commands needed to build and test
it.

- **Claude Code**. The terminal harness from Anthropic, built around deep MCP
  support and sub-agents for parallel work.
- **Codex**. An open-source, sandbox-first terminal harness from OpenAI, and one
  of the most widely installed.
- **OpenCode**. An open-source terminal coding agent with provider selection,
  permissions, and specialized agents.
- **Cline**. Started as an editor extension and grew a standalone open-source AI
  coding agent, with support for parallel agents and SDK workflows.
- **Letta Code**. An open-source, model-agnostic harness built around persistent
  memory. Agents persist across sessions rather than starting fresh each time,
  with skills, subagents, and git-backed memory.

Some model providers ship harnesses optimized for their own models, such as Qwen
Code, ZCode, and Kimi Code.

### General-purpose assistant harnesses

These often run continuously rather than per task. They reach users through
messaging apps instead of a terminal and act across a whole environment (e.g.,
email, calendar, browser, and filesystem) rather than a single repository. That
wider scope is also the risk. A prompt injection or a malicious skill can
trigger real actions on the host or expose sensitive data.

- **OpenClaw**. An open-source personal assistant that runs on hardware you
  control. A local gateway acts as the control plane for sessions, tools,
  events, and channel connections. A primary agent spawns subagents as needed.
  Plugins and skills extend the agent to different channels, such as email,
  browser control, calendar, and the filesystem.
- **Hermes Agent**. An open-source, self-hosted assistant harness from Nous
  Research, built around a learning loop. The agent creates skills from
  completed tasks, then refines them in use. Curated memory persists across
  sessions. A single gateway carries one conversation across a terminal UI,
  Telegram, Discord, Slack, WhatsApp, and Signal.

## Leveraging harnesses with open-source LLMs

The best-known harnesses ship pointed at models from the vendor that built them,
but the harness and the model are separable. Many harnesses allow you to connect
to an open-source or open-weight model through a local or self-hosted inference
endpoint. This provides more privacy and customization, and helps control your
cost.

API compatibility makes the connection possible, but protocol compatibility
alone does not guarantee good agent behavior. To connect a harness to a model
and verify that the pairing works, work through the following steps:

1. **Choose a model trained for tool use**. Confirm that the model can select
   tools, produce valid arguments, and recover after a tool error.
2. **Match the API protocol**. A harness may require
   [OpenAI-compatible](/model-interaction/openai-compatible-api/) Chat
   Completions or the Responses API, an
   [Anthropic-compatible](/model-interaction/anthropic-compatible-api/) Messages
   API, or a provider SDK.
3. **Configure the server for the model**. Use the correct chat template,
   tool-call parser, reasoning parser, stop tokens, and maximum context length.
4. **Point the harness at the endpoint**. Configure the base URL, model name,
   and required credentials (or a placeholder). You can often do this by
   starting a server with an
   [inference framework](/getting-started/choosing-the-right-inference-framework/)
   like MAX or vLLM, and point your harness at that server.
5. **Test the full loop**. Measure tool call accuracy, task completion,
   recovery, context growth, and permission behavior rather than only text
   quality.
6. **Optimize repeated prefixes**. Keep stable instructions and tool definitions
   near the front of the prompt, then monitor prefix cache reuse.

An OpenAI-compatible API or Anthropic-compatible API often provides the easiest
integration path for harnesses. Some vendor harnesses require a different or
larger API surface, so check the current integration documentation before
choosing a server.

Open models also change capacity planning. Long context and several concurrent
agent sessions can consume more GPU memory than the model weights suggest. Test
with realistic trajectories and tool output before setting production limits.

## Serving agentic workloads with MAX

A harness turns one task into a chain of planning, reasoning, execution, and
verification calls, so latency compounds with every step.
[MAX](https://www.modular.com/open-source/max?utm_source=llm_handbook) is built
for that pattern:

- **Predictable multi-step latency**. Compiled inference and continuous batching
  keep each step in the loop fast, so a 30-step task doesn't accumulate delay.
- **Faster tool calls**.
  [Tool calling](https://docs.modular.com/serve/function-calling/) is
  compiler-optimized, and the time saved on each round trip adds up across an
  agentic loop.
- **Structured output at compiler speed**. Constrained decoding is compiled into
  the graph, so the JSON, function signatures, and typed tool calls a harness
  depends on stay both valid and fast.
- **Hardware-portable agents**. The same containers run on NVIDIA, AMD and other
  accelerators, so you can mix vendors across agent roles for cost and
  resilience without changing the serving interface.
- **On-device agents**. MAX compiles agent models natively for Apple Silicon and
  ARM CPUs, so agents can reason offline and scale to the cloud when needed.

Learn more about our
[agentic AI solutions](https://www.modular.com/solutions/agentic?utm_source=llm_handbook)
or discuss a deployment for a specific harness and workload.

<div style={{ margin: '3rem 0' }}>
<a className="btn-outline" href="https://www.modular.com/request-demo?utm_source=llm_handbook">Talk to us</a>
</div>

## FAQs

### What is harness engineering?

Harness engineering is the practice of improving agent results by changing the
system around the model instead of the model itself. This includes the loop, the
tool definitions, what enters context on each turn, the stopping and retry
rules, the verification steps, and the permission boundary. It treats those
pieces as things you measure and iterate on, evaluated end to end on real tasks
rather than on single-response quality. This is important because the same model
can score very differently on the same benchmark depending on the harness it
runs in.

### What is the difference between an agent harness and an agent framework?

A harness is the runtime layer that surrounds the model. A framework is a
software package used to build some or all of that layer. A ready-to-use agent
product may contain a harness without exposing the harness as a library.

### Can any open-source LLM work with any harness?

No. The API shape must match, and the model needs the tool use behavior expected
by the harness. Chat templates, parsers, context limits, and reasoning formats
can also differ. Test the combination rather than assuming that a compatible
endpoint makes every model interchangeable.

<LinkList>

## Additional resources

- [Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/)
- [Inside the Codex harness](https://openai.com/index/unlocking-the-codex-harness/)
- [Harness Engineering for Self-Improvement](https://lilianweng.github.io/posts/2026-07-04-harness/)
</LinkList>
