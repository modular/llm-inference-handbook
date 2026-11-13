import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const SCRIPT = fileURLToPath(new URL('./l10n.mjs', import.meta.url))
const ZH = 'i18n/zh-CN/docusaurus-plugin-content-docs/current'
const repos = []

function createRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'l10n-'))
  repos.push(dir)
  const git = (...args) =>
    execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim()
  git('init', '-q', '-b', 'main')
  git('config', 'user.email', 'test@example.com')
  git('config', 'user.name', 'Test')
  git('config', 'commit.gpgsign', 'false')
  const put = (rel, text) => {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
    writeFileSync(path.join(dir, rel), text)
  }
  const commit = (message) => {
    git('add', '-A')
    git('commit', '-q', '-m', message)
    return git('rev-parse', 'HEAD')
  }
  const run = (...args) =>
    spawnSync(process.execPath, [SCRIPT, ...args], {
      cwd: dir,
      encoding: 'utf8'
    })
  const read = (rel) => readFileSync(path.join(dir, rel), 'utf8')
  return { dir, git, put, commit, run, read }
}

function page(title, marker) {
  const line = marker ? `source_commit: ${marker}\n` : ''
  return `---\nsidebar_position: 1\n${line}---\n\n# ${title}\n\nBody of ${title}.\n`
}

afterEach(() => {
  while (repos.length > 0) {
    rmSync(repos.pop(), { recursive: true, force: true })
  }
})

test('status reports every state', () => {
  const repo = createRepo()
  for (const name of ['fresh', 'stale', 'gone', 'old-name', 'plain', 'bad']) {
    repo.put(`docs/${name}.md`, page(name))
  }
  repo.put('docs/untranslated.md', page('untranslated'))
  repo.put('docs/README.md', '# Not a page\n')
  const base = repo.commit('English pages')

  for (const name of ['fresh', 'stale', 'gone', 'old-name']) {
    repo.put(`${ZH}/${name}.md`, page(`zh ${name}`, base))
  }
  repo.put(`${ZH}/plain.md`, page('zh plain'))
  repo.put(`${ZH}/bad.md`, page('zh bad', 'abc1234'))
  repo.commit('Translations')

  repo.put('docs/stale.md', page('stale') + 'New paragraph.\n')
  repo.git('rm', '-q', 'docs/gone.md')
  repo.git('mv', 'docs/old-name.md', 'docs/new-name.md')
  repo.commit('Update English')

  const result = repo.run('status')
  assert.equal(result.status, 0, result.stderr)
  const out = result.stdout
  assert.match(
    out,
    /^zh-CN {2}6 translated · 2 untranslated \(compared with main\)/
  )
  assert.match(out, /🟡 stale +stale\.md \(1 commit, \+1 -0\)/)
  assert.match(out, /❌ no marker +plain\.md/)
  assert.match(out, /❌ bad marker +bad\.md \(not a full 40-character SHA\)/)
  assert.match(out, /❌ orphaned +gone\.md \(English page removed\)/)
  assert.match(
    out,
    /❌ orphaned +old-name\.md \(English page renamed to new-name\.md\?\)/
  )
  assert.match(out, /✅ 1 up to date/)
  assert.doesNotMatch(out, /README/)

  assert.equal(repo.run('status', '--ci').status, 1)

  const verbose = repo.run('status', '--verbose').stdout
  assert.match(verbose, /✅ up to date +fresh\.md/)
  assert.match(verbose, /⚪ untranslated +new-name\.md/)
  assert.match(verbose, /⚪ untranslated +untranslated\.md/)
})

test('markers must be commits on the compared ref', () => {
  const repo = createRepo()
  repo.put('docs/a.md', page('a'))
  repo.put('docs/b.md', page('b'))
  repo.commit('English pages')
  repo.git('switch', '-q', '-c', 'side')
  repo.put('docs/a.md', page('a') + 'Side change.\n')
  const side = repo.commit('Side branch')
  repo.git('switch', '-q', 'main')
  repo.put(`${ZH}/a.md`, page('zh a', side))
  repo.put(`${ZH}/b.md`, page('zh b', 'f'.repeat(40)))
  repo.commit('Translations')

  const out = repo.run('status').stdout
  assert.match(out, /❌ bad marker +a\.md \(not on main\)/)
  assert.match(out, /❌ bad marker +b\.md \(commit not found\)/)
  assert.match(repo.run('status', '--ref', 'side').stdout, /✅ 1 up to date/)
})

test('stale pages alone do not fail --ci', () => {
  const repo = createRepo()
  repo.put('docs/a.md', page('a'))
  const base = repo.commit('English')
  repo.put(`${ZH}/a.md`, page('zh a', base))
  repo.put('docs/a.md', page('a') + 'More.\n')
  repo.commit('Update')
  const result = repo.run('status', '--ci')
  assert.equal(result.status, 0)
  assert.match(result.stdout, /🟡 stale/)
})

test('diff shows English changes and write updates the marker', () => {
  const repo = createRepo()
  repo.put('docs/guide/a.md', page('a'))
  const base = repo.commit('English')
  repo.put(`${ZH}/guide/a.md`, page('zh a', base))
  repo.put(`${ZH}/guide/b.md`, '---\nsidebar_position: 2\n---\n\n# zh b\n')
  repo.put('docs/guide/b.md', page('b'))
  repo.put('docs/guide/a.md', page('a') + 'Added line.\n')
  const latest = repo.commit('Update')

  const diff = repo.run('diff', 'guide/a.md')
  assert.equal(diff.status, 0, diff.stderr)
  assert.match(diff.stdout, /^\+Added line\.$/m)

  const written = repo.run('write', 'docs/guide/a.md')
  assert.equal(written.status, 0, written.stderr)
  const text = repo.read(`${ZH}/guide/a.md`)
  assert.match(text, new RegExp(`^source_commit: ${latest}$`, 'm'))
  assert.equal(text.match(/source_commit/g).length, 1)
  assert.match(text, /^sidebar_position: 1$/m)
  assert.match(text, /# zh a/)

  repo.run('write', 'guide/b.md')
  assert.match(
    repo.read(`${ZH}/guide/b.md`),
    new RegExp(`^---\nsidebar_position: 2\nsource_commit: ${latest}\n---\n`)
  )
  assert.match(repo.run('status').stdout, /✅ 2 up to date/)
  assert.match(
    repo.run('diff', 'guide/a.md').stdout,
    /No English changes since/
  )
})

test('write keeps empty front matter valid', () => {
  const repo = createRepo()
  repo.put('docs/a.md', page('a'))
  repo.put('docs/b.md', page('b'))
  const latest = repo.commit('English')
  repo.put(`${ZH}/a.md`, '---\n\n---\n\n# zh a\n')
  repo.put(`${ZH}/b.md`, '---\n---\n\n# zh b\n\n---\n\nAfter\n')

  repo.run('write', 'a.md')
  repo.run('write', 'b.md')
  assert.equal(
    repo.read(`${ZH}/a.md`),
    `---\n\nsource_commit: ${latest}\n---\n\n# zh a\n`
  )
  assert.equal(
    repo.read(`${ZH}/b.md`),
    `---\nsource_commit: ${latest}\n---\n\n# zh b\n\n---\n\nAfter\n`
  )
  assert.match(repo.run('status').stdout, /✅ 2 up to date/)
})

test('write accepts the front matter shapes Docusaurus accepts', () => {
  const repo = createRepo()
  const shapes = {
    bom: ['﻿---\nid: x\n---\n\n# zh\n', '﻿---\nid: x\nMARKER\n---\n\n# zh\n'],
    spaces: [
      '---  \nid: x\n---  \n\nIntro\n\n---\n\nAfter\n',
      '---  \nid: x\nMARKER\n---  \n\nIntro\n\n---\n\nAfter\n'
    ],
    crlf: [
      '---\r\nid: x\r\n---\r\n\r\n# zh\r\n',
      '---\r\nid: x\r\nMARKER\r\n---\r\n\r\n# zh\r\n'
    ],
    none: ['# zh\n', '---\nMARKER\n---\n\n# zh\n'],
    'bom-none': ['﻿# zh\n', '﻿---\nMARKER\n---\n\n# zh\n']
  }
  for (const name of Object.keys(shapes))
    repo.put(`docs/${name}.md`, page(name))
  const latest = repo.commit('English')
  for (const [name, [before]] of Object.entries(shapes)) {
    repo.put(`${ZH}/${name}.md`, before)
  }

  for (const [name, [, after]] of Object.entries(shapes)) {
    const result = repo.run('write', `${name}.md`)
    assert.equal(result.status, 0, result.stderr)
    const expected = after.replace('MARKER', `source_commit: ${latest}`)
    assert.equal(repo.read(`${ZH}/${name}.md`), expected, name)
  }
  assert.match(repo.run('status').stdout, /✅ 5 up to date/)
})

test('no translations is not an error', () => {
  const repo = createRepo()
  repo.put('docs/a.md', page('a'))
  repo.commit('English')
  const result = repo.run('status', '--ci')
  assert.equal(result.status, 0)
  assert.match(result.stdout, /No translated docs/)
})

test('usage errors exit 2', () => {
  const repo = createRepo()
  repo.put('docs/a.md', page('a'))
  repo.commit('English')
  assert.equal(repo.run('diff').status, 2)
  assert.equal(repo.run('nope').status, 2)
  assert.equal(repo.run('status', '--ref', 'missing').status, 2)
})
