import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { WORK_SCHEMA_VERSION, type WorkEvent, type WorkProject } from '../domain/work-types.ts'

async function atomicWrite(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${randomUUID()}.tmp`
  await writeFile(temporary, content, 'utf8')
  await rename(temporary, path)
}

function assertProject(value: unknown): WorkProject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('work project is invalid')
  const project = value as WorkProject
  if (project.schemaVersion !== WORK_SCHEMA_VERSION) throw new Error(`unsupported work schema ${String(project.schemaVersion)}`)
  return project
}

export class WorkProjectStore {
  private tail: Promise<void> = Promise.resolve()
  private readonly sidecar: string
  private readonly snapshotPath: string
  private readonly eventPath: string

  constructor(readonly projectDir: string) {
    this.sidecar = join(projectDir, '.dsh-work')
    this.snapshotPath = join(this.sidecar, 'project.json')
    this.eventPath = join(this.sidecar, 'events.jsonl')
  }

  async initialize(project: WorkProject, operationId: string): Promise<WorkProject> {
    await Promise.all([
      mkdir(join(this.projectDir, 'deliverables'), { recursive: true }),
      mkdir(join(this.projectDir, 'assets'), { recursive: true }),
      mkdir(this.sidecar, { recursive: true }),
    ])
    const event: WorkEvent = {
      schemaVersion: WORK_SCHEMA_VERSION,
      event: 'work-project-created',
      projectId: project.id,
      operationId,
      revision: project.revision,
      timestamp: project.createdAt,
      summary: '创建真实工作项目',
      project,
    }
    await atomicWrite(this.snapshotPath, `${JSON.stringify(project, null, 2)}\n`)
    await atomicWrite(this.eventPath, `${JSON.stringify(event)}\n`)
    return structuredClone(project)
  }

  async load(): Promise<WorkProject> {
    return assertProject(JSON.parse(await readFile(this.snapshotPath, 'utf8')))
  }

  update(operationId: string, summary: string, mutate: (current: WorkProject) => WorkProject): Promise<WorkProject> {
    const result = this.tail.then(async () => {
      const current = await this.load()
      if (current.recentOperationIds.includes(operationId)) return current
      const next = mutate(structuredClone(current))
      next.schemaVersion = WORK_SCHEMA_VERSION
      next.revision = current.revision + 1
      next.updatedAt = new Date().toISOString()
      next.recentOperationIds = [...current.recentOperationIds, operationId].slice(-32)
      const event: WorkEvent = {
        schemaVersion: WORK_SCHEMA_VERSION,
        event: 'work-project-updated',
        projectId: next.id,
        operationId,
        revision: next.revision,
        timestamp: next.updatedAt,
        summary,
        project: next,
      }
      const previousEvents = await readFile(this.eventPath, 'utf8')
      await atomicWrite(this.eventPath, `${previousEvents.trimEnd()}\n${JSON.stringify(event)}\n`)
      await atomicWrite(this.snapshotPath, `${JSON.stringify(next, null, 2)}\n`)
      return structuredClone(next)
    })
    this.tail = result.then(() => undefined, () => undefined)
    return result
  }
}

