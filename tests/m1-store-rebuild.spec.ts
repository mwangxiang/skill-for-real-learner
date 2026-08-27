import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { rebuildFromEvents } from '../packages/dsh-visual-learner/src-v01/domain/reducer.ts'
import { DOMAIN_SCHEMA_VERSION, DomainError } from '../packages/dsh-visual-learner/src-v01/domain/types.ts'
import { ProjectEventStore, migrateManifestV01 } from '../packages/dsh-visual-learner/src-v01/storage/project-event-store.ts'
import { aggregate, at, operation } from './helpers/m1-fixtures.ts'

const roots: string[] = []
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }) })

describe('M1 append event store and deterministic rebuild', () => {
  it('rebuilds current step, order, review count and revision after a new store instance', async () => {
    const projectDir = await mkdtemp(join(tmpdir(), 'dsh-visual-m1-store-'))
    roots.push(projectDir)
    const initial = aggregate()
    const first = new ProjectEventStore(projectDir)
    await first.initialize({
      manifest: {
        schemaVersion: DOMAIN_SCHEMA_VERSION,
        projectId: initial.project.id,
        title: initial.project.title,
        locale: initial.project.locale,
        createdAt: initial.project.createdAt,
      },
      goal: initial.project.goal,
      route: initial.route,
      steps: Object.values(initial.steps),
    })
    const active = await first.commit({
      operation: operation('op-active', 0),
      mutations: [{ type: 'transition-step', stepId: 'step-1', to: 'active', reason: '用户开始' }],
      timestamp: at,
    })
    expect(active.project.currentStepId).toBe('step-1')

    const restarted = new ProjectEventStore(projectDir)
    expect(await restarted.rebuild('2026-08-26')).toEqual(active)
    expect((await restarted.readEvents()).map(event => event.event)).toEqual(['project-created', 'transaction-committed'])
  })

  it('ignores duplicate operation records during rebuild and rejects unknown schema', async () => {
    const projectDir = await mkdtemp(join(tmpdir(), 'dsh-visual-m1-dedupe-'))
    roots.push(projectDir)
    const initial = aggregate()
    const store = new ProjectEventStore(projectDir)
    await store.initialize({
      manifest: { schemaVersion: DOMAIN_SCHEMA_VERSION, projectId: initial.project.id, title: initial.project.title, locale: initial.project.locale, createdAt: initial.project.createdAt },
      goal: initial.project.goal, route: initial.route, steps: Object.values(initial.steps),
    })
    await store.commit({ operation: operation('op-once', 0), mutations: [{ type: 'transition-step', stepId: 'step-1', to: 'active', reason: '开始' }], timestamp: at })
    const events = await store.readEvents()
    const rebuilt = rebuildFromEvents([...events, events[1]!])
    expect(rebuilt.project.revision).toBe(1)
    expect(() => rebuildFromEvents([{ ...events[0]!, schemaVersion: '9.0.0' } as never]))
      .toThrow(expect.objectContaining<Partial<DomainError>>({ code: 'UNKNOWN_SCHEMA' }))
  })

  it('migrates the known v0.1 manifest without touching learning artifacts', () => {
    expect(migrateManifestV01({ schemaVersion: '0.1.0', projectId: 'p', title: '旧项目', createdAt: at }))
      .toEqual({ schemaVersion: '0.2.0', projectId: 'p', title: '旧项目', locale: 'zh-CN', createdAt: at })
  })
})
