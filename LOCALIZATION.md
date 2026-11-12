# Localization Guide

This document explains how translations of the LLM Inference Handbook are
organized, reviewed, and kept in sync with the English source.

English in `docs/` is the source of truth. Translations live in `i18n/<locale>/`
and may lag behind it.

## Supported locales

| Locale                       | Status  | Coordinator | Tracking issue                                                       |
|------------------------------|---------|-------------|----------------------------------------------------------------------|
| `zh-CN` (Simplified Chinese) | Preview | @yaokaiy    | [#221](https://github.com/modular/llm-inference-handbook/issues/221) |

Each locale has one coordinator and one tracking issue. The coordinator owns the
locale's conventions and glossary and keeps its pages in sync. Contributors
claim a chapter or page on the tracking issue, and the entry is ticked when the
PR merges.

## Where files live

Locale directories follow the
[Docusaurus i18n layout](https://docusaurus.io/docs/i18n/introduction):

| Content                                    | Path                                                                          |
|--------------------------------------------|-------------------------------------------------------------------------------|
| Doc pages                                  | `i18n/<locale>/docusaurus-plugin-content-docs/current/<same-path-as-English>` |
| Sidebar category labels                    | `i18n/<locale>/docusaurus-plugin-content-docs/current.json`                   |
| Navbar and footer labels                   | `i18n/<locale>/docusaurus-theme-classic/*.json`                               |
| Other UI strings                           | `i18n/<locale>/code.json`                                                     |
| Language-specific conventions and glossary | `i18n/<locale>/CONVENTIONS.md`                                                |

A page with no translation is served from the English source, so a locale can be
translated one chapter at a time.

Interactive components (`src/components/`) and diagrams stay in English for now.

## Translation conventions

General rules for every locale:

- Translate prose, headings, and UI-visible text. Keep code blocks, commands,
  and inline code in English.
- Keep math unchanged, except words inside `\text{...}`, which you translate.
- Translate the `# H1` heading, which is the page title. Most pages have no
  `title` key in front matter.
- Front matter:
  - Translate `description` and `keywords`, plus `title` and `sidebar_label`
    if present.
  - Leave `sidebar_position`, `sidebar_custom_props`, and other keys unchanged.
  - Add `source_commit` (see
    [The `source_commit` marker](#the-source_commit-marker)).
- Keep MDX components, imports, and JSX properties unchanged, except image paths
  (see below). Only translate text that readers see.
- Keep the same structure, images, and links as the English page. If a link
  targets a page with no translated version yet, leave the link as is.
- If the English page looks wrong, translate it as it is and report the problem
  in an issue.
- Keep the English heading IDs. End each translated H2–H6 heading with the
  English ID, for example
  `## 如何计算 KV 缓存大小 {#how-to-calculate-the-kv-cache-size}`. Links from
  other pages use the English IDs, and the build fails on broken anchors
  (`onBrokenAnchors: 'throw'`).
- In image paths, replace `./` with the English page's folder under
  `@site/docs/`, for example
  `require('@site/docs/getting-started/img/gpt-cost-drop.png')`. A relative
  `require('./img/...')` resolves from the `i18n/` folder and fails the build.

Language-specific rules, such as reader address and terminology, go in each
locale's `CONVENTIONS.md`. For zh-CN, see
[`i18n/zh-CN/CONVENTIONS.md`](i18n/zh-CN/CONVENTIONS.md).

## Keeping translations in sync

### The `source_commit` marker

Each translated page records the English commit it was last verified against in
its front matter:

```md
---
sidebar_position: 1
description: ...
source_commit: 4b20ab2ffbf35ce03f3fc0f9d010099e2c6d968f
---
```

Rules:

- It's the **full SHA** of a commit on `main`. Never use a commit from your own
  branch, which may disappear after a squash or rebase.
- It's updated **only after the whole page is in sync** with English, never
  after a partial update.
- The front matter is the **only** place it's stored. Don't copy it into tables,
  issues, or comments.
- It must be in front matter, not in an HTML comment. The `l10n` scripts only
  read front matter, and front matter must be the first thing in the file.
- Only `pnpm l10n:write` sets it.

### The `l10n` scripts

`scripts/l10n.mjs` compares each marker with the English history. Always pass
`--locale`, so you only see the locale you work on.

| Command                                    | What it does                                                                               |
|--------------------------------------------|--------------------------------------------------------------------------------------------|
| `pnpm l10n:status --locale <locale>`       | Lists translated pages by state. `--verbose` also lists up-to-date and untranslated pages. |
| `pnpm l10n:diff <page> --locale <locale>`  | Shows the English changes since the page's `source_commit`.                                |
| `pnpm l10n:write <page> --locale <locale>` | Sets `source_commit` to the latest English commit for the page.                            |

`<page>` is a path relative to `docs/`, for example
`llm-inference-basics/what-is-llm-inference.md`. The scripts compare with the
first of `upstream/main`, `origin/main`, and `main` that exists; `--ref`
overrides it.

| State           | Meaning                                                                               |
|-----------------|---------------------------------------------------------------------------------------|
| ✅ up to date   | English page unchanged since `source_commit`                                          |
| 🟡 stale        | English page changed since `source_commit` (shows commit count and lines changed)     |
| ❌ no marker    | Translated page has no `source_commit`                                                |
| ❌ bad marker   | Not a full SHA, an unknown commit, or not on `main`                                   |
| ❌ orphaned     | English page was renamed or deleted (suggests the new path when git detects a rename) |
| ⚪ untranslated | English page with no translation yet (count only; list with `--verbose`)              |

Example:

```text
$ pnpm l10n:status --locale zh-CN
zh-CN  2 translated · 55 untranslated (compared with upstream/main)
  🟡 stale        llm-inference-basics/what-is-llm-inference.md (1 commit, +2 -2)
  ✅ 1 up to date
```

`--ci` makes `l10n:status` exit 1 on no marker, bad marker, or orphaned pages.
Stale pages never fail it.

### Translating or updating a page

1. Update your branch to the latest `main`, then run
   `pnpm l10n:status --locale <locale>` to find stale pages. Add `--verbose` to
   also list untranslated pages. If the locale has no translated pages yet,
   create `i18n/<locale>/docusaurus-plugin-content-docs/current/` first.
2. For a stale page, run `pnpm l10n:diff <page> --locale <locale>` and port only
   the changed parts. For a new page, copy the English file to the same path
   under `i18n/<locale>/docusaurus-plugin-content-docs/current/`, run
   `pnpm write-heading-ids . <copied file>` to add the heading IDs, and
   translate it. In both cases, follow `i18n/<locale>/CONVENTIONS.md`.
3. When the whole page matches English, run
   `pnpm l10n:write <page> --locale <locale>`.
4. Run `pnpm lint:md:fix` and `pnpm lint:md`, then build the locale with
   `L10N_PREVIEW=1 pnpm build --locale <locale>` and fix any errors, such as
   broken links or anchors. In a list that contains a `$$` math block,
   `lint:md:fix` can join the block onto one line, which breaks the formula.
   Wrap such a list in `<!-- rumdl-disable MD013 -->` and
   `<!-- rumdl-enable MD013 -->` comments, and check the diff.
5. A native speaker reviews the PR for accuracy, terminology, and fluency, and
   checks that code and heading IDs are unchanged. The reviewer owns quality and
   runs the build in step 4 before approving.

## PR conventions

- Keep PRs small: at most one chapter per PR.
- Titles: `docs(i18n): add <locale> <chapter or page>` for new translations, and
  `docs(i18n): resync <locale> <page>` for updates.
- Every translated page has a `source_commit` set by `pnpm l10n:write`.

## Adding and launching a locale

A new locale builds only in preview until it launches, so production never shows
a half-translated site. Add it to `docusaurus.config.ts` behind `L10N_PREVIEW`:

```ts
i18n: {
  defaultLocale: 'en',
  // Unlaunched locales build only with L10N_PREVIEW=1
  locales: process.env.L10N_PREVIEW ? ['en', 'zh-CN'] : ['en'],
  localeConfigs: {
    'zh-CN': {
      label: '简体中文'
    }
  }
},
```

Then generate the UI string files with
`L10N_PREVIEW=1 pnpm write-translations --locale <locale>` and translate their
`message` values. Add `i18n/<locale>/CONVENTIONS.md` and add the locale to the
table above. Preview it with `L10N_PREVIEW=1 pnpm start --locale <locale>`.

A locale goes live when all of these are true:

- At least 90% of pages are translated.
- Every chapter is complete, with at most one or two recently added English
  pages missing.
- Stale pages have been resynced.
- UI strings are translated.

To launch, a maintainer adds the locale to `locales` without the flag and turns
on the language switcher and search for it.

If fewer than 80% of a live locale's pages are up to date for three months and
nobody is coordinating it, the locale is taken out of the build. Its files stay
in the repo.
