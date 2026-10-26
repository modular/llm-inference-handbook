# Localization Guide

This document explains how translations of the LLM Inference Handbook are organized, reviewed, and kept in sync with the English source.

## Supported locales

| Locale | Path | Coordinator |
|---|---|---|
| `zh-CN` (Simplified Chinese) | `i18n/zh-CN/` | @assassinationss |

Locale directories follow the [Docusaurus i18n layout](https://docusaurus.io/docs/i18n/introduction): a translated page lives at `i18n/<locale>/docusaurus-plugin-content-docs/current/<same-path-as-English>`.

A locale joins this table together with its coordinator once its first chapter is merged.

## Translation conventions

General rules for every locale:

- Translate prose, headings, and UI-visible text. **Keep code blocks, commands, and inline code in English.**
- Translate the `title` and `description` in frontmatter; leave other frontmatter keys unchanged.
- Keep the same structure, images, and links as the English page. If a link targets a page with no translated version yet, let it point to the English page.

Language-specific conventions — reader address, terminology, glossary — are decided by each localization's coordinator and live in the locale's own conventions file. For zh-CN: [`i18n/zh-CN/CONVENTIONS.md`](i18n/zh-CN/CONVENTIONS.md).

## Keeping translations in sync

Each translated page records the English commit it was last verified against in its front matter:

```md
---
sidebar_label: Introduction
source_commit: 4b20ab2ffbf35ce03f3fc0f9d010099e2c6d968f
---
```

`source_commit` is the full SHA of a `main` commit that touches the English page, and the front matter is the only place it is stored.

When an English page changes:

1. Port the diff into the translation — not a full rewrite.
2. Bump `source_commit` to the new SHA.
3. PR title: `docs(i18n): resync zh-CN <page>`.

Staleness is measured against `source_commit`: a check run by hand or in CI compares each marker with the latest `main` commit for that page, lists the stale ones, and flags translations whose English page was renamed or removed.

## Tracking progress

Each language has one tracking issue with a checklist of chapters. A contributor comments on it to claim a chapter; the entry is ticked when the PR merges. Maintainers open the tracking issue when a language starts.

## PR conventions

- One chapter per PR; title: `docs(i18n): add zh-CN <chapter>`.
- Include the `source_commit` marker from the first translated page.
- Expect a native-speaker review pass before merge.
