import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { commitTransaction, rebuildFromEvents, type CommitInput } from '../domain/reducer.ts'
import {
  DOMAIN_SCHEMA_VERSION,
  DomainError,
  type LearningAggregate,
  type LearningEvent,
  type ProjectCreatedEvent,
  type ProjectManifest,
  type ProjectRoute,
  type RouteStep,
} from '../domain/types.ts'

export interface CreateProjectInput {
  manifest: ProjectManifest
  goal: string
  route: ProjectRoute
  steps: RouteStep[]
}

async function atomicWrite(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${randomUUID()}.tmp`
  await writeFile(temporary, content, 'utf8')
  await rename(temporary, path)
}

function parseJsonObject(text: string, source: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text)
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new DomainError('INVALID_MUTATION', `${source} is not an object`)
  }
  return value as Record<string, unknown>
}

export class ProjectEventStore {
  private tail: Promise<void> = Promise.resolve()
  private readonly sidecar: string
  private readonly manifestPath: string
  private readonly eventPath: string

  constructor(readonly projectDir: string) {
    this.sidecar = join(projectDir, '.dsh-learning')
    this.manifestPath = join(this.sidecar, 'manifest.json')
    this.eventPath = join(this.sidecar, 'route-events.jsonl')
  }

  async initialize(input: CreateProjectInput): Promise<LearningAggregate> {
    if (input.manifest.schemaVersion !== DOMAIN_SCHEMA_VERSION) throw new DomainError('UNKNOWN_SCHEMA', input.manifest.schemaVersion)
    const bootstrap: ProjectCreatedEvent = {
      schemaVersion: DOMAIN_SCHEMA_VERSION,
      event: 'project-created',
      projectId: input.manifest.projectId,
      timestamp: input.manifest.createdAt,
      manifest: structuredClone(input.manifest),
      goal: input.goal,
      route: structuredClone(input.route),
      steps: structuredClone(input.steps),
    }
    await Promise.all([
      mkdir(join(this.sidecar, 'operations'), { recursive: true }),
      mkdir(join(this.sidecar, 'drafts'), { recursive: true }),
      mkdir(join(this.sidecar, 'evidence-assets'), { recursive: true }),
    ])
    await atomicWrite(this.manifestPath, `${JSON.stringify(input.manifest, null, 2)}\n`)
    await atomicWrite(this.eventPath, `${JSON.stringify(bootstrap)}\n`)
    return rebuildFromEvents([bootstrap])
  }

  async readManifest(): Promise<ProjectManifest> {
    const raw = parseJsonObject(await readFile(this.manifestPath, 'utf8'), 'manifest')
    if (raw['schemaVersion'] !== DOMAIN_SCHEMA_VERSION) throw new DomainError('UNKNOWN_SCHEMA', String(raw['schemaVersion']))
    return raw as unknown as ProjectManifest
  }

  async readEvents(): Promise<LearningEvent[]> {
    const text = await readFile(this.eventPath, 'utf8')
    return text.split(/\r?\n/u).filter(Boolean).map((line, index) => {
      const value = parseJsonObject(line, `route-events line ${index + 1}`)
      if (value['schemaVersion'] !== DOMAIN_SCHEMA_VERSION) throw new DomainError('UNKNOWN_SCHEMA', String(value['schemaVersion']))
      return value as unknown as LearningEvent
    })
  }

  async rebuild(today?: string): Promise<LearningAggregate> {
    await this.readManifest()
    return rebuildFromEvents(await this.readEvents(), today)
  }

  commit(input: CommitInput): Promise<LearningAggregate> {
    const result = this.tail.then(async () => {
      const events = await this.readEvents()
      const current = rebuildFromEvents(events)
      const committed = commitTransaction(current, input)
      if (committed.event === null) return committed.aggregate
      const nextEvents = [...events, committed.event]
      await atomicWrite(this.eventPath, `${nextEvents.map(event => JSON.stringify(event)).join('\n')}\n`)
      await atomicWrite(join(this.sidecar, 'projection.json'), `${JSON.stringify(committed.aggregate, null, 2)}\n`)
      return committed.aggregate
    })
    this.tail = result.then(() => undefined, () => undefined)
    return result
  }
}

export interface LegacyManifestV01 {
  schemaVersion: '0.1.0'
  projectId: string
  title: string
  createdAt: string
  locale?: 'zh-CN' | 'en'
}

export function migrateManifestV01(value: LegacyManifestV01): ProjectManifest {
  return {
    schemaVersion: DOMAIN_SCHEMA_VERSION,
    projectId: value.projectId,
    title: value.title,
    locale: value.locale ?? 'zh-CN',
    createdAt: value.createdAt,
  }
}
