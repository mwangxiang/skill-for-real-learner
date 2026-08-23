import { cp, mkdir, rm, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = resolve(packageRoot, '..', '..')
const source = resolve(repositoryRoot, 'skills')
const target = resolve(packageRoot, 'embedded-skills')
if (!target.startsWith(`${packageRoot}\\`) && !target.startsWith(`${packageRoot}/`)) {
  throw new Error(`embedded Skill target leaves package: ${target}`)
}
if (!(await stat(source)).isDirectory()) throw new Error(`Skill source is not a directory: ${source}`)

await rm(target, { recursive: true, force: true })
await mkdir(target, { recursive: true })
await cp(source, target, { recursive: true, force: true })
