import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { WORK_SCHEMA_VERSION, type DeckProjection, type WorkProject } from '../packages/dsh-visual-learner/src-v01/domain/work-types.ts'
import { normalizeDeckProjection, writeAssets, writePresentationArtifact } from '../packages/dsh-visual-learner/src-v01/host/presentation-artifact.ts'
import { WorkProjectStore } from '../packages/dsh-visual-learner/src-v01/storage/work-project-store.ts'

const temporaryDirectories: string[] = []
afterEach(async () => { await Promise.all(temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true }))) })

async function temporaryProject(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-work-project-'))
  temporaryDirectories.push(root)
  return join(root, 'work-projects', 'project-test')
}

function project(now = '2026-08-27T00:00:00.000Z'): WorkProject {
  return {
    schemaVersion: WORK_SCHEMA_VERSION,
    id: 'project-test',
    title: '项目汇报',
    request: '给部门主管做一份 7 页项目汇报，争取技术支持和资源倾斜。',
    locale: 'zh-CN',
    status: 'active',
    stage: 'brief',
    brief: { audience: '部门主管', desiredAction: '争取技术支持和资源倾斜', materials: ['项目进度'], deliverable: '7 页 PPT', acceptance: ['只需微调'] },
    clarification: { round: 0, questions: [], assumptions: [], response: null },
    artifact: null,
    versions: [],
    assets: { preferences: [], checklist: [], reusableRules: [], relativePath: null },
    learning: { offered: false, selected: false, topics: [] },
    revision: 0,
    recentOperationIds: ['create-1'],
    createdAt: now,
    updatedAt: now,
  }
}

function deck(): DeckProjection {
  return normalizeDeckProjection({
    title: '项目资源支持汇报',
    thesis: '项目已形成阶段成果，但关键技术阻塞需要资源支持才能按期推进。',
    audience: '部门主管',
    desiredAction: '批准技术支持和资源倾斜',
    pages: Array.from({ length: 7 }, (_, index) => ({ title: `第 ${index + 1} 页`, purpose: `目的 ${index + 1}`, keyPoints: ['事实', '证据', '行动'], speakerNote: '讲述提示' })),
    assumptions: ['数据位置使用占位符'], preferences: ['结论先行'], checklist: ['资源请求明确'], reusableRules: ['一页一个判断'], learningTopics: ['如何提出可执行的资源请求'],
  }, '项目汇报')
}

describe('WorkProject 0.3.0', () => {
  it('keeps one project fact source and deduplicates repeated operations', async () => {
    const path = await temporaryProject()
    const store = new WorkProjectStore(path)
    await store.initialize(project(), 'create-1')
    const first = await store.update('accept-1', '接受终稿', current => ({ ...current, status: 'completed', stage: 'distilled' }))
    const duplicate = await store.update('accept-1', '重复接受', current => ({ ...current, title: '不应写入' }))
    expect(first.revision).toBe(1)
    expect(duplicate.revision).toBe(1)
    expect(duplicate.title).toBe('项目汇报')
    expect((await store.load()).status).toBe('completed')
    const events = (await readFile(join(path, '.dsh-work', 'events.jsonl'), 'utf8')).trim().split(/\r?\n/u)
    expect(events).toHaveLength(2)
  })

  it('creates an editable seven-slide PPTX, markdown outline, and reusable assets', async () => {
    const path = await temporaryProject()
    const artifact = await writePresentationArtifact(path, deck(), 1, null)
    expect(artifact.pages).toHaveLength(7)
    const pptx = await readFile(join(path, artifact.relativePath))
    expect(pptx.subarray(0, 2).toString('ascii')).toBe('PK')
    const slideEntries = new Set(pptx.toString('latin1').match(/ppt\/slides\/slide\d+\.xml/gu) ?? [])
    expect(slideEntries.size).toBe(7)
    expect(await readFile(join(path, artifact.markdownRelativePath), 'utf8')).toContain('核心论点')
    const assetsPath = await writeAssets(path, deck(), 1)
    const assets = await readFile(join(path, assetsPath), 'utf8')
    expect(assets).toContain('交付前检查清单')
    expect(assets).toContain('可选学习点')
  })

  it('pads incomplete model output instead of fabricating business facts', () => {
    const normalized = normalizeDeckProjection({ pages: [{ title: '现状' }] }, '汇报需求')
    expect(normalized.pages).toHaveLength(7)
    expect(normalized.pages[0]?.keyPoints.some(point => point.includes('补充'))).toBe(true)
    expect(normalized.pages[6]?.keyPoints).toContain('待补充：数据或截图')
  })
})
