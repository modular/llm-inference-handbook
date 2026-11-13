#!/usr/bin/env node
// Track translated docs against the English source.
//
//   pnpm l10n:status [--locale <code>] [--verbose] [--ci] [--ref <ref>]
//   pnpm l10n:diff <page> [--locale <code>] [--ref <ref>]
//   pnpm l10n:write <page> [--locale <code>] [--ref <ref>]
//
// <page> is a path relative to docs/, for example
// llm-inference-basics/what-is-llm-inference.md. Each translated page records
// the English commit it was last synced to as `source_commit` in its front
// matter. Only `l10n:write` changes that value.

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'

const DOCS_DIR = 'docs'
const I18N_DIR = 'i18n'
const DOCS_PLUGIN_DIR = 'docusaurus-plugin-content-docs/current'
// Same exclusions as the docs plugin in docusaurus.config.ts.
const EXCLUDED = [/(^|\/)README\.md$/, /(^|\/)LICENSE$/, /^adr\//]
const REF_CANDIDATES = ['upstream/main', 'origin/main', 'main']
const FULL_SHA = /^[0-9a-f]{40}$/
const BLOCKING = new Set(['no-marker', 'bad-marker', 'orphaned'])
const ICONS = {
  'up-to-date': '✅',
  stale: '🟡',
  'no-marker': '❌',
  'bad-marker': '❌',
  orphaned: '❌',
  untranslated: '⚪'
}
const LABELS = {
  'up-to-date': 'up to date',
  stale: 'stale',
  'no-marker': 'no marker',
  'bad-marker': 'bad marker',
  orphaned: 'orphaned',
  untranslated: 'untranslated'
}
const USAGE = `Usage:
  pnpm l10n:status [--locale <code>] [--verbose] [--ci] [--ref <ref>]
  pnpm l10n:diff <page> [--locale <code>] [--ref <ref>]
  pnpm l10n:write <page> [--locale <code>] [--ref <ref>]

status  List translated pages as up to date, stale, no marker, bad marker,
        or orphaned. --ci exits 1 on no marker, bad marker, or orphaned.
diff    Show the English changes since the page's source_commit.
write   Set source_commit to the latest English commit for the page. Run it
        only after the whole page matches English.

<page> is relative to docs/. --ref defaults to the first of
${REF_CANDIDATES.join(', ')} that exists.`

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim()
}

function gitSucceeds(args) {
  try {
    git(args)
    return true
  } catch {
    return false
  }
}

function fail(message) {
  console.error(message)
  process.exit(2)
}

function resolveRef(ref) {
  const exists = (name) =>
    gitSucceeds(['rev-parse', '--verify', '--quiet', `${name}^{commit}`])
  if (ref) {
    if (!exists(ref)) fail(`Unknown ref: ${ref}`)
    return ref
  }
  const found = REF_CANDIDATES.find(exists)
  if (!found) fail(`None of ${REF_CANDIDATES.join(', ')} exists; pass --ref.`)
  return found
}

function isPage(rel) {
  return /\.mdx?$/.test(rel) && !EXCLUDED.some((re) => re.test(rel))
}

function listFiles(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    return entry.isDirectory()
      ? listFiles(path.join(dir, entry.name), rel)
      : [rel]
  })
}

function localeDir(locale) {
  return path.join(I18N_DIR, locale, DOCS_PLUGIN_DIR)
}

function listLocales() {
  if (!existsSync(I18N_DIR)) return []
  return readdirSync(I18N_DIR)
    .filter((locale) => existsSync(localeDir(locale)))
    .sort()
}

function englishPages(ref) {
  const out = git(['ls-tree', '-r', '--name-only', ref, '--', `${DOCS_DIR}/`])
  if (!out) return []
  return out
    .split('\n')
    .map((file) => file.slice(DOCS_DIR.length + 1))
    .filter(isPage)
}

// Same rules as gray-matter, which Docusaurus uses: an optional BOM, an
// opening `---` line, and the block ends at the next line that starts with
// `---`. The body keeps its trailing newline, so empty front matter gives an
// empty body that starts right after the opening line.
function splitFrontMatter(text) {
  const match = /^(\uFEFF?---[ \t]*(\r?\n))((?:[\s\S]*?\r?\n)??)---/.exec(text)
  if (!match) return null
  const start = match[1].length
  const end = start + match[3].length
  return { start, end, body: match[3], eol: match[2] }
}

function readMarker(file) {
  const frontMatter = splitFrontMatter(readFileSync(file, 'utf8'))
  if (!frontMatter) return null
  const match = /^source_commit:[ \t]*['"]?([^'"\s#]*)/m.exec(frontMatter.body)
  return match && match[1] ? match[1] : null
}

function markerProblem(marker, ref) {
  if (!FULL_SHA.test(marker)) return 'not a full 40-character SHA'
  if (!gitSucceeds(['cat-file', '-e', `${marker}^{commit}`])) {
    return 'commit not found'
  }
  if (!gitSucceeds(['merge-base', '--is-ancestor', marker, ref])) {
    return `not on ${ref}`
  }
  return null
}

function findRename(marker, ref, englishPath) {
  const out = git([
    'diff',
    '-M',
    '--name-status',
    '--diff-filter=R',
    marker,
    ref,
    '--',
    `${DOCS_DIR}/`
  ])
  for (const line of out.split('\n')) {
    const [, from, to] = line.split('\t')
    if (from === englishPath) return to.slice(DOCS_DIR.length + 1)
  }
  return null
}

function pageState(page, file, ref, english) {
  const marker = readMarker(file)
  const englishPath = `${DOCS_DIR}/${page}`
  if (!english.has(page)) {
    const renamed =
      marker && !markerProblem(marker, ref)
        ? findRename(marker, ref, englishPath)
        : null
    return { page, state: 'orphaned', renamed }
  }
  if (!marker) return { page, state: 'no-marker' }
  const problem = markerProblem(marker, ref)
  if (problem) return { page, state: 'bad-marker', problem }
  const commits = Number(
    git(['rev-list', '--count', `${marker}..${ref}`, '--', englishPath])
  )
  if (commits === 0) return { page, state: 'up-to-date' }
  const numstat = git(['diff', '--numstat', marker, ref, '--', englishPath])
  // Commits that were later reverted leave nothing to translate.
  if (!numstat) return { page, state: 'up-to-date' }
  const [added, deleted] = numstat.split('\t')
  return { page, state: 'stale', commits, added, deleted }
}

function describe(result) {
  let detail = ''
  if (result.state === 'stale') {
    const s = result.commits === 1 ? '' : 's'
    detail = ` (${result.commits} commit${s}, +${result.added} -${result.deleted})`
  } else if (result.state === 'bad-marker') {
    detail = ` (${result.problem})`
  } else if (result.state === 'orphaned') {
    detail = result.renamed
      ? ` (English page renamed to ${result.renamed}?)`
      : ' (English page removed)'
  }
  const label = LABELS[result.state].padEnd(12)
  return `  ${ICONS[result.state]} ${label} ${result.page}${detail}`
}

function status(options) {
  const ref = resolveRef(options.ref)
  const english = new Set(englishPages(ref))
  const locales = options.locale ? [options.locale] : listLocales()
  if (locales.length === 0) {
    console.log('No translated docs under i18n/.')
    return 0
  }
  let blocking = 0
  for (const locale of locales) {
    const dir = localeDir(locale)
    if (!existsSync(dir)) fail(`No translated docs for ${locale} in ${dir}.`)
    const translated = listFiles(dir).filter(isPage).sort()
    const translatedSet = new Set(translated)
    const results = translated.map((page) =>
      pageState(page, path.join(dir, page), ref, english)
    )
    const untranslated = [...english]
      .filter((page) => !translatedSet.has(page))
      .sort()
    console.log(
      `${locale}  ${translated.length} translated · ${untranslated.length} untranslated (compared with ${ref})`
    )
    const order = ['stale', 'no-marker', 'bad-marker', 'orphaned']
    for (const state of order) {
      for (const result of results.filter((r) => r.state === state)) {
        console.log(describe(result))
      }
    }
    const upToDate = results.filter((r) => r.state === 'up-to-date')
    if (options.verbose) {
      upToDate.forEach((result) => console.log(describe(result)))
      untranslated.forEach((page) =>
        console.log(describe({ page, state: 'untranslated' }))
      )
    } else if (upToDate.length > 0) {
      console.log(`  ${ICONS['up-to-date']} ${upToDate.length} up to date`)
    }
    blocking += results.filter((r) => BLOCKING.has(r.state)).length
  }
  return options.ci && blocking > 0 ? 1 : 0
}

function locate(page, options) {
  const rel = page.replace(/^\.?\/?docs\//, '')
  const locales = options.locale ? [options.locale] : listLocales()
  if (locales.length !== 1) {
    fail(
      locales.length === 0
        ? 'No translated docs under i18n/.'
        : `Several locales found (${locales.join(', ')}); pass --locale.`
    )
  }
  const file = path.join(localeDir(locales[0]), rel)
  if (!existsSync(file)) fail(`No translated page at ${file}.`)
  return { rel, file, ref: resolveRef(options.ref) }
}

function diff(page, options) {
  const { rel, file, ref } = locate(page, options)
  const marker = readMarker(file)
  if (!marker) {
    fail(
      `${file} has no source_commit. Run pnpm l10n:write ${rel} once it matches English.`
    )
  }
  const problem = markerProblem(marker, ref)
  if (problem) fail(`source_commit in ${file} is invalid: ${problem}.`)
  const englishPath = `${DOCS_DIR}/${rel}`
  if (!gitSucceeds(['cat-file', '-e', `${ref}:${englishPath}`])) {
    fail(`${englishPath} no longer exists on ${ref}; run pnpm l10n:status.`)
  }
  const out = git(['--no-pager', 'diff', marker, ref, '--', englishPath])
  console.log(out || `No English changes since ${marker.slice(0, 7)}.`)
  return 0
}

function setMarker(text, sha) {
  const line = `source_commit: ${sha}`
  const frontMatter = splitFrontMatter(text)
  if (!frontMatter) {
    const bom = text.startsWith('\uFEFF') ? '\uFEFF' : ''
    return `${bom}---\n${line}\n---\n\n${text.slice(bom.length)}`
  }
  const pattern = /^source_commit:.*$/m
  const body = pattern.test(frontMatter.body)
    ? frontMatter.body.replace(pattern, line)
    : `${frontMatter.body}${line}${frontMatter.eol}`
  return text.slice(0, frontMatter.start) + body + text.slice(frontMatter.end)
}

function write(page, options) {
  const { rel, file, ref } = locate(page, options)
  const englishPath = `${DOCS_DIR}/${rel}`
  const sha = git(['log', '-1', '--format=%H', ref, '--', englishPath])
  if (!sha || !gitSucceeds(['cat-file', '-e', `${ref}:${englishPath}`])) {
    fail(`${englishPath} does not exist on ${ref}.`)
  }
  writeFileSync(file, setMarker(readFileSync(file, 'utf8'), sha))
  console.log(`${file}: source_commit ${sha}`)
  return 0
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    locale: { type: 'string' },
    ref: { type: 'string' },
    verbose: { type: 'boolean', short: 'v' },
    ci: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' }
  }
})
const [command = 'status', page] = positionals
const commands = { status, diff, write }

if (values.help || !commands[command]) {
  console.log(USAGE)
  process.exit(values.help ? 0 : 2)
}
if (command !== 'status' && !page) fail(USAGE)

process.chdir(git(['rev-parse', '--show-toplevel']))
process.exitCode =
  command === 'status' ? status(values) : commands[command](page, values)
