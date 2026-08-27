import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const argument = process.argv.indexOf('--pilot-root')
const pilotRoot = resolve(
  argument >= 0 && process.argv[argument + 1]
    ? process.argv[argument + 1]
    : process.env.PILOT_HARNESS_ROOT ?? 'D:\\DeepSeek-Harness-Lab\\pilot-harness',
)
const lock = JSON.parse(await readFile(new URL('../SOURCE_LOCK.json', import.meta.url), 'utf8'))
const source = lock.sources.pilot_harness

if (source.commit !== 'd1fa9c15fc00c05ea6931aafd724554ca34d5a6d') {
  throw new Error(`Unexpected Pilot source lock: ${source.commit}`)
}

async function matches(files) {
  for (const [relative, expected] of Object.entries(files)) {
    const content = await readFile(resolve(pilotRoot, relative))
    const actual = createHash('sha256').update(content).digest('hex')
    if (actual !== expected) return false
  }
  return true
}

const mode = await matches(source.abi_files)
  ? 'upstream-base'
  : await matches(source.alpha23_integration.files)
    ? 'alpha23-integration'
    : null
if (mode === null) throw new Error('Pilot ABI source drift: neither frozen upstream nor alpha.23 integration hashes match')

const patchContent = await readFile(new URL(`../${source.alpha23_integration.patch}`, import.meta.url))
const patchHash = createHash('sha256').update(patchContent).digest('hex')
if (patchHash !== source.alpha23_integration.patch_sha256) throw new Error(`Pilot integration patch drift: ${patchHash}`)

const layout = await readFile(resolve(pilotRoot, 'packages/client/ui-layout/src/client/index.ts'), 'utf8')
const conversation = await readFile(resolve(pilotRoot, 'packages/client/ui-conversation/src/client/contract/slots.ts'), 'utf8')
const service = await readFile(resolve(pilotRoot, 'packages/client/ui-layout/src/client/service.ts'), 'utf8')

for (const witness of [
  "'shell.right-sidebar': { kind: 'list'; scope: 'root' }",
  "'conversation.session.header.utilities':",
  'openRightSidebar?(): void',
  'closeRightSidebar?(): void',
]) {
  const haystack = witness.includes('header.utilities') ? conversation : witness.includes('Sidebar?') ? service : layout
  if (!haystack.includes(witness)) throw new Error(`Pilot ABI witness missing: ${witness}`)
}

if (mode === 'alpha23-integration') {
  const frame = await readFile(resolve(pilotRoot, 'packages/client/ui-layout/src/client/AppFrame.tsx'), 'utf8')
  for (const witness of ['setRightSidebarWidth?(px: number): void', "side=\"right-sidebar\"", 'actions.setRightSidebar']) {
    const haystack = witness.includes('Width?') ? service : frame
    if (!haystack.includes(witness)) throw new Error(`Pilot alpha.23 integration witness missing: ${witness}`)
  }
}

console.log(JSON.stringify({
  ok: true,
  pilotRoot,
  commit: source.commit,
  mode,
  abiFiles: Object.keys(mode === 'upstream-base' ? source.abi_files : source.alpha23_integration.files).length,
  slots: ['conversation.session.header.utilities', 'shell.right-sidebar'],
  layoutActions: mode === 'upstream-base'
    ? ['openRightSidebar', 'closeRightSidebar']
    : ['openRightSidebar', 'closeRightSidebar', 'setRightSidebarWidth'],
}, null, 2))
