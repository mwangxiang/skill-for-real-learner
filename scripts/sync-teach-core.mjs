import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lockPath = join(repoRoot, 'SOURCE_LOCK.json')
const targetRoot = join(repoRoot, 'skills', 'teach-core')
const files = [
  'SKILL.md',
  'MISSION-FORMAT.md',
  'RESOURCES-FORMAT.md',
  'GLOSSARY-FORMAT.md',
  'LEARNING-RECORD-FORMAT.md',
  'agents/openai.yaml',
]

function usage() {
  return [
    'Usage:',
    '  node scripts/sync-teach-core.mjs --source <matt-teach-dir>',
    '  node scripts/sync-teach-core.mjs --source <matt-teach-dir> --check',
    '',
    'The source directory must be the locked Matt skills/productivity/teach directory.',
  ].join('\n')
}

function parseArgs(argv) {
  let source
  let check = false
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--check') {
      check = true
      continue
    }
    if (arg === '--source') {
      source = argv[index + 1]
      index += 1
      continue
    }
    throw new Error(`Unknown argument: ${arg}\n\n${usage()}`)
  }
  if (source === undefined || source.trim() === '') throw new Error(usage())
  return { source: resolve(source), check }
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex')
}

function replaceExactly(text, pattern, replacement, label) {
  const matches = text.match(pattern)
  if (matches === null || matches.length !== 1) {
    throw new Error(`${label}: expected exactly one allowed transformation match, got ${matches?.length ?? 0}`)
  }
  return text.replace(pattern, replacement)
}

function transform(name, source) {
  if (name === 'SKILL.md') {
    let text = source.toString('utf8')
    text = replaceExactly(text, /^name: teach$/m, 'name: teach-core', 'SKILL.md name')
    text = replaceExactly(
      text,
      /^disable-model-invocation: true\r?\n/m,
      '',
      'SKILL.md invocation policy',
    )
    return Buffer.from(text, 'utf8')
  }

  if (name === 'agents/openai.yaml') {
    let text = source.toString('utf8')
    text = replaceExactly(
      text,
      /display_name: "Teach"/,
      'display_name: "Teach Core"',
      'openai.yaml display name',
    )
    text = replaceExactly(
      text,
      /policy:\r?\n  allow_implicit_invocation: false\r?\n?/,
      '',
      'openai.yaml invocation policy',
    )
    return Buffer.from(text, 'utf8')
  }

  return source
}

const { source, check } = parseArgs(process.argv.slice(2))
const lock = JSON.parse(await readFile(lockPath, 'utf8'))
const lockedFiles = lock.teach_core_comparison?.files
if (lockedFiles === undefined) throw new Error('SOURCE_LOCK.json has no teach_core_comparison.files')

const results = []
let mismatch = false
for (const name of files) {
  const sourcePath = join(source, name)
  const sourceBytes = await readFile(sourcePath)
  const actualUpstream = sha256(sourceBytes)
  const expectedUpstream = lockedFiles[name]?.upstream_sha256
  if (actualUpstream !== expectedUpstream) {
    throw new Error(
      `${name}: upstream hash mismatch; expected ${expectedUpstream}, got ${actualUpstream}`,
    )
  }

  const transformed = transform(name, sourceBytes)
  const actualTransformed = sha256(transformed)
  const expectedTransformed = lockedFiles[name]?.transformed_sha256
  if (check && expectedTransformed !== undefined && actualTransformed !== expectedTransformed) {
    throw new Error(
      `${name}: transformed hash mismatch; expected ${expectedTransformed}, got ${actualTransformed}`,
    )
  }
  const targetPath = join(targetRoot, name)
  let target
  try {
    target = await readFile(targetPath)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }

  const equal = target !== undefined && target.equals(transformed)
  if (check) {
    mismatch ||= !equal
  } else if (!equal) {
    await mkdir(dirname(targetPath), { recursive: true })
    await writeFile(targetPath, transformed)
  }

  results.push({
    file: name,
    upstream_sha256: actualUpstream,
    transformed_sha256: actualTransformed,
    status: check ? (equal ? 'match' : 'mismatch') : (equal ? 'unchanged' : 'updated'),
  })
}

process.stdout.write(`${JSON.stringify({ mode: check ? 'check' : 'sync', ok: !mismatch, results }, null, 2)}\n`)
if (mismatch) process.exitCode = 1
