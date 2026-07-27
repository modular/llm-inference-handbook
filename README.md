# LLM Inference Handbook

This repository contains the source for the
[LLM Inference Handbook](https://handbook.modular.com), a practical guide for
understanding, optimizing, scaling, and operating LLM inference systems.

The handbook is a standalone Docusaurus site styled with the Modular design
language system. Its future canonical source home is
[`modular/llm-inference-handbook`](https://github.com/modular/llm-inference-handbook).

## Local preview

Install dependencies and start the local development server:

```bash
pnpm install
pnpm start
```

The site runs at [http://localhost:3000/](http://localhost:3000/).

To build or serve the production output locally:

```bash
pnpm build
pnpm serve
```

## Markdown linting

Markdown files are linted with [rumdl](https://rumdl.dev/). Prose is wrapped at
80 characters. Run the same checks as CI locally:

```bash
pnpm lint:md       # check for issues
pnpm lint:md:fix   # auto-fix
```

Some line-length violations (long URLs, API references) may need manual reflow
or `<!-- rumdl-disable MD013 -->` blocks.

### Editor integration

rumdl supports in-editor linting via:

- [VS Code extension](https://rumdl.dev/vscode-extension/): Install from the
  marketplace, or run `pnpm exec rumdl vscode`. See [VS Code setup](#vs-code-setup)
  below to match CI rules and enable fix-on-save.
- [LSP server](https://rumdl.dev/lsp/): Run `pnpm exec rumdl server` and point
  your editor's LSP client at it.

#### VS Code setup

By default the extension uses its own built-in rules, not this repo's config. To
match CI, point it at [`.rumdl.toml`](.rumdl.toml) and apply rumdl fixes on save.

This repo ships recommended settings in
[`.vscode/recommended_settings.json`](.vscode/recommended_settings.json). Either
copy those keys into `.vscode/settings.json` (workspace-scoped, gitignored) or
into your user settings (`~/Library/Application Support/Cursor/User/settings.json`
on macOS):

```json
{
  "rumdl.configPath": ".rumdl.toml",
  "[markdown]": {
    "editor.formatOnSave": false,
    "editor.codeActionsOnSave": { "source.fixAll.rumdl": "explicit" }
  },
  "[mdx]": {
    "editor.formatOnSave": false,
    "editor.codeActionsOnSave": { "source.fixAll.rumdl": "explicit" }
  },
  "editor.rulers": [80]
}
```

Install the recommended extensions when prompted, or open the Extensions view
and run **Extensions: Show Recommended Extensions**.

## Contributing

Contributions are welcome! Feel free to open issues, suggest improvements, or
submit pull requests.

## Licenses

This handbook follows the upstream dual-license posture:

- All files in the `docs/` folder are licensed under the
  [Creative Commons Attribution 4.0 International (CC BY 4.0) License](https://creativecommons.org/licenses/by/4.0/).
- All other files are licensed under the
  [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).
