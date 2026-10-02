# Localization Guide

This document explains how translations of the LLM Inference Handbook are organized, reviewed, and kept in sync with the English source.

## Supported locales

| Locale | Path | Status |
|---|---|---|
| `zh-CN` (Simplified Chinese) | `i18n/zh-CN/` | pilot |

Locale directories follow the [Docusaurus i18n layout](https://docusaurus.io/docs/i18n/introduction): a translated page lives at `i18n/<locale>/docusaurus-plugin-content-docs/current/<same-path-as-English>`.

## Translation conventions

- Translate prose, headings, and UI-visible text. **Keep code blocks, commands, and inline code in English.**
- Translate the `title` and `description` in frontmatter; leave other frontmatter keys unchanged.
- Keep the same structure, images, and links as the English page. If a link targets a page with no translated version yet, let it point to the English page.
- Reader address: use **你**; keep a concise technical register; do not localize product names (CUDA, vLLM, TensorRT). "KV cache" stays in English on first mention; `KV 缓存` afterwards is fine.

### Starter glossary

| English | zh-CN |
|---|---|
| inference | 推理 |
| serving | 服务 / 部署（依上下文） |
| throughput | 吞吐量 |
| latency | 延迟 |
| batching | 批处理 |
| quantization | 量化 |
| sharding / parallelism | 切分 / 并行 |
| overhead | 开销 |

## Keeping translations in sync

Every translated file carries a marker comment at the top pointing at the English commit it was last verified against:

```md
<!-- synced-through: 5bddc17b97 -->
```

When an English page changes:

1. `git log --oneline <english-page>` — see what changed since `synced-through`.
2. Port the diff into the translation (not a full rewrite).
3. Bump `synced-through` to the new commit.
4. PR title: `docs(i18n): resync zh-CN <page>`.

## Status table

Maintainers update on merge:

| Page | Locale | Status | Synced through |
|---|---|---|---|
| `llm-inference-basics/what-is-llm-inference.md` | zh-CN | in review (#225) | `5bddc17b97` |

## PR conventions

- One chapter per PR; title: `docs(i18n): add zh-CN <chapter>`.
- Include `synced-through` markers from the first translated page.
- Expect a native-speaker review pass before merge.
