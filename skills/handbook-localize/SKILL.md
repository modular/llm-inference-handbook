---
name: handbook-localize
description: >
  Translate a handbook page from docs/ into a locale, or resync a translated
  page with the English changes since its source_commit. Works for any locale
  and follows LOCALIZATION.md, the locale's CONVENTIONS.md, and the l10n
  scripts. Use when asked to translate, localize, or update a handbook page for
  a locale (for example --locale zh-CN), or to find stale translations.
compatibility: Run from the repository root with dependencies installed (pnpm install) and the original repository's main branch fetched.
---

# Localize a handbook page

This skill does steps 1–4 of "Translating or updating a page" in
`LOCALIZATION.md` (at the repository root) for one page: it translates the page
or ports the English changes, sets the `source_commit` marker, lints, and
builds. It stops before the pull request. A person reviews the draft and opens
the PR.

The rules live in `LOCALIZATION.md` and the locale's `CONVENTIONS.md`. This
skill points to them instead of repeating them, so read them. Run every command
from the repository root.

## Inputs

- `--locale <locale>`, for example `zh-CN`. Required; ask if it's missing.
- `<page>`: a path relative to `docs/`, for example
  `llm-inference-basics/what-is-llm-inference.md`. If no page is given, run step
  1, report the result, and ask which page to work on.

For several pages, do steps 2–4 for each page, then run step 5 once for all of
them. Keep a PR to one chapter at most.

## Before you start

Read these files:

- `LOCALIZATION.md`, at least "Translation conventions", "Keeping translations
  in sync", and "AI-assisted translation".
- `i18n/<locale>/CONVENTIONS.md`, including its glossary, or the glossary file
  it links to.
- The English page. Skim the pages it links to if you need context.
- `scripts/l10n.mjs`, if you need details of how the `l10n` commands work.

Stop and tell the user if `i18n/<locale>/CONVENTIONS.md` doesn't exist or
`docusaurus.config.ts` doesn't list the locale. The locale isn't set up yet; see
"Adding and launching a locale" in `LOCALIZATION.md`.

## Steps

1. **Check the status.** Fetch the remote that points to
   `modular/llm-inference-handbook` (often `upstream`). Your branch must be up
   to date with that remote's `main` and must not change `docs/`. `l10n:write`
   records the latest English commit on that `main`, so the English you
   translate must be that version. If your branch is behind or your local
   `docs/` differs from `<remote>/main`, ask the user how to proceed. Then run
   `pnpm l10n:status --locale <locale> --verbose --ref <remote>/main`, and pass
   the same `--ref` to every `l10n` command. If it says there are no translated
   docs for the locale, create
   `i18n/<locale>/docusaurus-plugin-content-docs/current/` and run it again. The
   page's state sets the next step:

   | State                      | Next step                                                                       |
   |----------------------------|---------------------------------------------------------------------------------|
   | ⚪ untranslated            | 2a, unless an orphaned page was renamed to this path: then see the orphaned row |
   | 🟡 stale                   | 2b                                                                              |
   | ✅ up to date              | Nothing to do for this page                                                     |
   | ❌ no marker or bad marker | 2c                                                                              |
   | ❌ orphaned                | Follow "Fixing orphaned pages" in `LOCALIZATION.md`. A moved page then needs 2c |

2. **Translate.** Follow `LOCALIZATION.md` and `CONVENTIONS.md` for every line
   you write.

   - **2a. New page.** Copy `docs/<page>` to
     `i18n/<locale>/docusaurus-plugin-content-docs/current/<page>`, run
     `pnpm write-heading-ids . <copied file>` to add the English heading IDs,
     then translate the copy in place.
   - **2b. Stale page.** Run
     `pnpm l10n:diff <page> --locale <locale> --ref <remote>/main` and port only
     the changed English lines. Leave the rest of the translation as it is. If
     the diff changes an H2–H6 heading, its ID may change. An explicit `{#id}`
     is in the English line. Otherwise, to get the ID, copy the English page to
     a temporary file outside `docs/` and `i18n/`, run
     `pnpm write-heading-ids . <temporary file>`, read the ID, and delete the
     file. If the ID changed, search `docs/` and `i18n/<locale>/` for links to
     the old ID on this page. Translated links must use the new ID. A translated
     page with such a link is usually stale from the same English change, so
     resync it too. A link in `docs/` that still uses the old ID means the
     English source is broken: report it.
   - **2c. No marker, bad marker, or moved page.** Compare the whole translation
     with the current English page and bring all of it in sync.

3. **Check the draft against the English page**, paragraph by paragraph:

   - The structure matches: the same headings, paragraphs, list items, tables,
     code blocks, math, images, links, and MDX components, in the same order.
   - The points in "AI-assisted translation" in `LOCALIZATION.md` hold, and so
     does any review list in `CONVENTIONS.md`.
   - If the English page looks wrong, such as a wrong number or a broken
     sentence, translate what it says and don't fix it in the translation. Tell
     the user as soon as you notice it, so they can report it upstream.

4. **Set the marker.** Only when the whole page matches the English page, run
   `pnpm l10n:write <page> --locale <locale> --ref <remote>/main`. Never edit
   `source_commit` by hand, and never set it after a partial update.

5. **Lint and build.**

   - If a list in your page contains a `$$` math block, wrap the list in
     `<!-- rumdl-disable MD013 -->` and `<!-- rumdl-enable MD013 -->` comments
     first. Otherwise `pnpm lint:md:fix` can join the block onto one line, which
     breaks the formula.
   - Run `pnpm lint:md:fix`, check that it changed only your translated pages
     and left their formulas intact, and run `pnpm lint:md`.
   - Run `L10N_PREVIEW=1 pnpm build --locale <locale>` and fix every error. The
     build reports a broken anchor on the page that holds the link, but the
     cause can be the target page's heading ID, so check both. Fix only
     translated pages. Never edit `docs/`; report an error in an English page
     instead.
   - Run
     `pnpm l10n:status --locale <locale> --verbose --ci --ref <remote>/main`.
     Every page you translated or resynced must be ✅ up to date. The command
     must exit 0; if it fails because of a page you didn't touch, report it.

6. **Report.** Don't commit, push, or open a PR unless the user asks. Tell the
   user:

   - the page, the step you took (2a, 2b, 2c, or deleting an orphaned page), and
     the `source_commit` that `l10n:write` set, if it ran;
   - each command in step 5 and its result;
   - technical terms that aren't in the glossary, with the translation you chose
     and why, for the coordinator to confirm;
   - sentences you weren't sure about, and problems you found in the English
     page.

   Then remind the user to read the draft against the English page before opening
   the PR (see "AI-assisted translation"), and to use the PR title format from "PR
   conventions" in `LOCALIZATION.md`.
