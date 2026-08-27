import { randomUUID } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { Context, Service } from '@deepseek-ai/cordis'
import { SessionId } from '@deepseek-ai/dsh-session'
import { bindTypertRemote, type InvocationDescriptor } from '@deepseek-ai/dsh-typert-protocol'
import type {} from '@deepseek-ai/dsh-typert-registry'
import type { TypertContribution } from '@deepseek-ai/dsh-typert-registry/types'
import { z } from 'zod'
import {
  WORK_SCHEMA_VERSION,
  type DeckProjection,
  type WorkBrief,
  type WorkProject,
  type WorkQuestion,
} from '../domain/work-types.ts'
import {
  WORK_SCHEMA_VERSION as WORK_RPC_SCHEMA_VERSION,
  type WorkArtifactDownload,
  type WorkProjectViewModel,
  type WorkRpcResult,
} from '../protocol/index.ts'
import { WorkProjectStore } from '../storage/work-project-store.ts'
import { LearningAgentManager } from './learning-agent-manager.ts'
import { normalizeDeckProjection, writeAssets, writePresentationArtifact } from './presentation-artifact.ts'
import { validateLearnerViewModel, validateWorkEnvelope } from './rpc-guard.ts'

interface SessionContext { sessions: { get(id: SessionId): { header: { cwd?: string } } | undefined } }
declare module '@deepseek-ai/cordis' { interface Context { workPanel: WorkPanelService } }

interface SnapshotRequest { currentSessionId: string; projectId: string }
interface ListRequest { currentSessionId: string }
interface StartRequest { currentSessionId: string; request: string; locale: 'zh-CN' | 'en'; operationId: string }
interface ActionRequest {
  currentSessionId: string
  projectId: string
  operationId: string
  action: 'answer-questions' | 'continue-with-defaults' | 'revise-draft' | 'accept-draft' | 'select-learning'
  response?: string
}
interface DownloadRequest { currentSessionId: string; projectId: string; version: number; format: 'pptx' | 'markdown'; offset?: number }

function errorText(error: unknown): string { return error instanceof Error ? `${error.name}: ${error.message}` : String(error) }
function nonEmpty(value: unknown, fallback: string): string { return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback }
function stringArray(value: unknown, fallback: string[] = []): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '').map(item => item.trim()) : fallback }

function extractBrief(request: string): WorkBrief {
  const isPresentation = /PPT|幻灯|演示|汇报|周报|月报/iu.test(request)
  const audience = request.match(/(?:面向|给|汇报给)([^，。；\n]{2,18})/u)?.[1]?.trim() ?? (/主管|领导/u.test(request) ? '部门主管' : '待确认的主要读者')
  const desiredAction = /技术支援|技术支持|资源倾斜|资源分配|协调资源/u.test(request)
    ? '获得技术支持与必要的资源配置'
    : '让读者理解现状并确认下一步行动'
  const materials = ['项目进度', '时间与资源流向', '工作完成情况', '困难与阻塞'].filter(item => request.includes(item.slice(0, 2)))
  return {
    audience,
    desiredAction,
    materials: materials.length > 0 ? materials : ['用户提供的文字、数据、截图或现有文件'],
    deliverable: isPresentation ? '一份可编辑的 7 页左右 PPT 汇报' : '一份可编辑的工作汇报 PPT 初稿',
    acceptance: ['最好可直接发送给目标读者', '合格版本只需少量修改', '尽量在三轮修改内确认终稿'],
  }
}

function clarificationQuestions(brief: WorkBrief): WorkQuestion[] {
  return [
    { id: 'audience', prompt: '这份成品主要给谁看？', recommendedAnswer: brief.audience === '待确认的主要读者' ? '先按部门主管处理' : brief.audience },
    { id: 'action', prompt: '希望对方看完后采取什么行动？', recommendedAnswer: brief.desiredAction },
    { id: 'materials', prompt: '目前有哪些文字、数据、截图或旧文件可用？', recommendedAnswer: brief.materials.join('、') },
  ]
}

function needsClarification(request: string): boolean {
  return request.trim().length < 28 || !/PPT|幻灯|演示|汇报|周报|月报/iu.test(request)
}

function emptyProject(projectId: string, request: string, locale: 'zh-CN' | 'en', operationId: string): WorkProject {
  const now = new Date().toISOString()
  return {
    schemaVersion: WORK_SCHEMA_VERSION,
    id: projectId,
    title: request.trim().slice(0, 42),
    request: request.trim(),
    locale,
    status: 'active',
    stage: 'brief',
    brief: extractBrief(request),
    clarification: { round: 0, questions: [], assumptions: [], response: null },
    artifact: null,
    versions: [],
    assets: { preferences: [], checklist: [], reusableRules: [], relativePath: null },
    learning: { offered: false, selected: false, topics: [] },
    revision: 0,
    recentOperationIds: [`create-${operationId}`],
    createdAt: now,
    updatedAt: now,
  }
}

function stageLabel(stage: WorkProject['stage'], locale: WorkProject['locale']): string {
  const zh: Record<WorkProject['stage'], string> = { brief: '需求已保存', clarifying: '还需确认少量信息', generating: 'AI 正在制作初稿', 'draft-ready': '初稿已完成', revising: 'AI 正在修改', accepted: '终稿已确认', distilled: '成果与方法已沉淀' }
  const en: Record<WorkProject['stage'], string> = { brief: 'Brief saved', clarifying: 'A few details needed', generating: 'AI is creating the draft', 'draft-ready': 'Draft ready', revising: 'AI is revising', accepted: 'Final accepted', distilled: 'Work and method saved' }
  return (locale === 'zh-CN' ? zh : en)[stage]
}

function toView(project: WorkProject): WorkProjectViewModel {
  const view: WorkProjectViewModel = {
    schemaVersion: WORK_RPC_SCHEMA_VERSION,
    project: { projectId: project.id, title: project.title, request: project.request, status: project.status, stage: project.stage, stageLabel: stageLabel(project.stage, project.locale), revision: project.revision },
    brief: structuredClone(project.brief),
    clarification: { round: project.clarification.round, questions: structuredClone(project.clarification.questions), assumptions: [...project.clarification.assumptions] },
    artifact: project.artifact === null ? null : { version: project.artifact.version, fileName: project.artifact.fileName, markdownFileName: project.artifact.markdownFileName, thesis: project.artifact.thesis, pages: project.artifact.pages.map((page, index) => ({ pageNumber: index + 1, title: page.title, purpose: page.purpose, keyPoints: [...page.keyPoints] })) },
    versions: project.versions.map(item => ({ version: item.version, fileName: item.fileName, markdownFileName: item.markdownFileName, createdAt: item.createdAt, feedback: item.feedback })),
    assets: { preferences: [...project.assets.preferences], checklist: [...project.assets.checklist], reusableRules: [...project.assets.reusableRules], ready: project.assets.relativePath !== null },
    learning: structuredClone(project.learning),
    primaryAction: project.stage === 'clarifying' ? 'answer-questions' : project.stage === 'draft-ready' ? 'revise-or-accept' : project.stage === 'distilled' ? 'finish' : null,
  }
  const safe = validateLearnerViewModel(view)
  if (!safe.ok) throw new Error(safe.error.code)
  return view
}

function deckPrompt(project: WorkProject, feedback?: string): string {
  const current = project.artifact === null ? '尚无初稿' : JSON.stringify({ thesis: project.artifact.thesis, pages: project.artifact.pages })
  return [
    '你是一个直接完成真实工作的汇报设计师。现在生成可编辑 PPT 的结构化内容，不要教学，不要考试。',
    `用户原始需求：${project.request}`,
    `工作简报：${JSON.stringify(project.brief)}`,
    `补充回答：${project.clarification.response ?? '无；按合理默认值继续'}`,
    `当前版本：${current}`,
    feedback ? `本轮集中修改意见：${feedback}` : '这是第一版。',
    '只返回一个严格 JSON 对象，不要代码围栏。格式：',
    '{"title":"标题","thesis":"一句核心论点","audience":"对象","desiredAction":"希望对方采取的行动","assumptions":["可逆假设"],"pages":[{"title":"页标题","purpose":"本页目的","keyPoints":["要点1","要点2","要点3"],"speakerNote":"讲述提示"}],"preferences":["从需求识别出的偏好"],"checklist":["交付前检查项"],"reusableRules":["下次可复用规则"],"learningTopics":["任务完成后才值得学习的一个问题"]}',
    'pages 必须正好 7 页；结论先行；每页一个中心判断；明确项目进度、成果、时间/资源流向、困难、所需支持与下一步。没有数据时写“待补充：具体数据/截图”，不得捏造事实。所有内容使用简体中文。',
  ].join('\n')
}

function deckFromProject(project: WorkProject): DeckProjection {
  if (project.artifact === null) throw new Error('artifact missing')
  return {
    title: project.title,
    thesis: project.artifact.thesis,
    audience: project.brief.audience,
    desiredAction: project.brief.desiredAction,
    assumptions: project.clarification.assumptions,
    pages: project.artifact.pages,
    preferences: project.assets.preferences,
    checklist: project.assets.checklist,
    reusableRules: project.assets.reusableRules,
    learningTopics: project.learning.topics,
  }
}

export class WorkPanelService extends Service {
  static inject = ['typert', 'agentDefaultModel', 'agents', 'sessions', 'sessionPersistence']
  readonly typertRemote = bindTypertRemote(this, 'workPanel', { namespace: 'work-panel' })
  private readonly agentManager: LearningAgentManager
  private readonly inFlight = new Map<string, Promise<WorkRpcResult<WorkProjectViewModel>>>()

  constructor(ctx: Context) {
    super(ctx, 'workPanel')
    this.agentManager = new LearningAgentManager(ctx)
    ;(ctx as Context & { typert: { register(contribution: TypertContribution): unknown } }).typert.register(WORK_PANEL_TYPERT)
  }

  async snapshot(request: unknown): Promise<WorkRpcResult<WorkProjectViewModel>> {
    const envelope = validateWorkEnvelope<SnapshotRequest>(request); if (!envelope.ok) return envelope
    try { return { ok: true, value: toView(await this.store(envelope.value.payload.currentSessionId, envelope.value.payload.projectId).load()) } }
    catch { return { ok: false, error: { code: 'PROJECT_NOT_FOUND', learnerMessage: '没有找到这个工作项目，请返回工作首页重新选择。' } } }
  }

  async list(request: unknown): Promise<WorkRpcResult<{ schemaVersion: typeof WORK_RPC_SCHEMA_VERSION; projects: WorkProjectViewModel[] }>> {
    const envelope = validateWorkEnvelope<ListRequest>(request); if (!envelope.ok) return envelope
    try {
      const root = this.workspaceRoot(envelope.value.payload.currentSessionId)
      const entries = await readdir(join(root, 'work-projects'), { withFileTypes: true }).catch(() => [])
      const projects: WorkProjectViewModel[] = []
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        try { projects.push(toView(await new WorkProjectStore(join(root, 'work-projects', entry.name)).load())) } catch { /* damaged sibling stays isolated */ }
      }
      projects.sort((a, b) => b.project.revision - a.project.revision)
      return { ok: true, value: { schemaVersion: WORK_RPC_SCHEMA_VERSION, projects } }
    } catch { return { ok: false, error: { code: 'PROJECT_NOT_FOUND', learnerMessage: '工作项目暂时无法恢复，请确认当前会话已经选择工作区。' } } }
  }

  async start(request: unknown): Promise<WorkRpcResult<WorkProjectViewModel>> {
    const envelope = validateWorkEnvelope<StartRequest>(request); if (!envelope.ok) return envelope
    const payload = envelope.value.payload
    if (!payload || typeof payload.request !== 'string' || payload.request.trim() === '' || !['zh-CN', 'en'].includes(payload.locale) || typeof payload.operationId !== 'string') return { ok: false, error: { code: 'INVALID_REQUEST', learnerMessage: '请先告诉我你想完成什么工作。' } }
    const root = this.workspaceRoot(payload.currentSessionId)
    const projectId = `project-${randomUUID()}`
    const projectDir = join(root, 'work-projects', projectId)
    const store = new WorkProjectStore(projectDir)
    let project = await store.initialize(emptyProject(projectId, payload.request, payload.locale, payload.operationId), `create-${payload.operationId}`)
    if (needsClarification(payload.request)) {
      project = await store.update(`clarify-${payload.operationId}`, '集中确认高影响信息', current => ({ ...current, stage: 'clarifying', clarification: { ...current.clarification, round: 1, questions: clarificationQuestions(current.brief) } }))
      return { ok: true, value: toView(project) }
    }
    try {
      project = await store.update(`generating-${payload.operationId}`, '开始生成真实初稿', current => ({ ...current, stage: 'generating' }))
      return { ok: true, value: toView(await this.generateDraft(store, projectDir, project, `draft-${payload.operationId}`, null)) }
    } catch (error) {
      await store.update(`recover-${payload.operationId}`, '生成失败，安全返回需求阶段', current => ({ ...current, stage: 'brief' })).catch(() => undefined)
      this.ctx.logger.warn(`dsh-work-panel: draft generation failed: ${errorText(error)}`)
      return { ok: false, error: { code: 'MODEL_ACTION_FAILED', learnerMessage: '初稿暂时没有生成成功。你的需求已安全保存，请稍后重试。' } }
    }
  }

  async act(request: unknown): Promise<WorkRpcResult<WorkProjectViewModel>> {
    const envelope = validateWorkEnvelope<ActionRequest>(request); if (!envelope.ok) return envelope
    const payload = envelope.value.payload
    if (!payload?.projectId || !payload.operationId) return { ok: false, error: { code: 'INVALID_REQUEST', learnerMessage: '没有找到要继续的工作项目。' } }
    const existing = this.inFlight.get(payload.projectId)
    if (existing !== undefined) return existing
    const running = this.runAction(payload)
    this.inFlight.set(payload.projectId, running)
    try { return await running } finally { if (this.inFlight.get(payload.projectId) === running) this.inFlight.delete(payload.projectId) }
  }

  private async runAction(payload: ActionRequest): Promise<WorkRpcResult<WorkProjectViewModel>> {
    const root = this.workspaceRoot(payload.currentSessionId)
    const projectDir = join(root, 'work-projects', payload.projectId)
    const store = new WorkProjectStore(projectDir)
    try {
      let project = await store.load()
      if (project.recentOperationIds.includes(payload.operationId)) return { ok: true, value: toView(project) }
      if (payload.action === 'answer-questions' || payload.action === 'continue-with-defaults') {
        if (project.stage !== 'clarifying' && project.stage !== 'brief') throw new Error('project is not waiting for a brief')
        const response = payload.action === 'continue-with-defaults' ? project.clarification.questions.map(item => `${item.prompt} ${item.recommendedAnswer}`).join('\n') : nonEmpty(payload.response, '')
        if (response === '') throw new Error('clarification response missing')
        project = await store.update(`prepare-${payload.operationId}`, '确认工作简报并开始生成', current => ({ ...current, stage: 'generating', clarification: { ...current.clarification, response, assumptions: payload.action === 'continue-with-defaults' ? ['用户选择按推荐答案继续'] : current.clarification.assumptions } }))
        return { ok: true, value: toView(await this.generateDraft(store, projectDir, project, payload.operationId, null)) }
      }
      if (payload.action === 'revise-draft') {
        if (project.stage !== 'draft-ready' || project.artifact === null) throw new Error('no draft to revise')
        const feedback = nonEmpty(payload.response, '')
        if (feedback === '') throw new Error('feedback missing')
        project = await store.update(`revising-${payload.operationId}`, '根据集中反馈修改成品', current => ({ ...current, stage: 'revising' }))
        return { ok: true, value: toView(await this.generateDraft(store, projectDir, project, payload.operationId, feedback)) }
      }
      if (payload.action === 'accept-draft') {
        if (project.stage !== 'draft-ready' || project.artifact === null) throw new Error('no draft to accept')
        const deck = deckFromProject(project)
        const assetPath = await writeAssets(projectDir, deck, project.artifact.version)
        project = await store.update(payload.operationId, '接受终稿并沉淀可复用资产', current => ({ ...current, stage: 'distilled', status: 'completed', assets: { ...current.assets, relativePath: assetPath }, learning: { ...current.learning, offered: true } }))
        return { ok: true, value: toView(project) }
      }
      if (payload.action === 'select-learning') {
        if (project.status !== 'completed') throw new Error('work is not completed')
        project = await store.update(payload.operationId, '用户选择继续学习', current => ({ ...current, learning: { ...current.learning, selected: true } }))
        return { ok: true, value: toView(project) }
      }
      throw new Error('unknown action')
    } catch (error) {
      this.ctx.logger.warn(`dsh-work-panel: work action failed: ${errorText(error)}`)
      if (payload.action === 'revise-draft') await store.update(`recover-${payload.operationId}`, '修改失败，保留上一可用版本', current => ({ ...current, stage: 'draft-ready' })).catch(() => undefined)
      return { ok: false, error: { code: 'MODEL_ACTION_FAILED', learnerMessage: '这次操作没有完成，但上一版成品和你的输入仍然安全，请重试。' } }
    }
  }

  private async generateDraft(store: WorkProjectStore, projectDir: string, project: WorkProject, operationId: string, feedback: string | null): Promise<WorkProject> {
    const projection = await this.agentManager.runStructuredSingleTurn(project.id, projectDir, deckPrompt(project, feedback ?? undefined), '只输出上述 JSON。')
    const deck = normalizeDeckProjection(projection, project.request)
    const artifact = await writePresentationArtifact(projectDir, deck, project.versions.length + 1, feedback)
    return store.update(operationId, feedback === null ? '生成第一版可编辑成品' : '生成新的成品版本', current => ({
      ...current,
      title: deck.title,
      stage: 'draft-ready',
      brief: { ...current.brief, audience: deck.audience, desiredAction: deck.desiredAction },
      clarification: { ...current.clarification, assumptions: deck.assumptions },
      artifact,
      versions: [...current.versions, artifact],
      assets: { ...current.assets, preferences: deck.preferences, checklist: deck.checklist, reusableRules: deck.reusableRules },
      learning: { ...current.learning, topics: deck.learningTopics },
    }))
  }

  async download(request: unknown): Promise<WorkRpcResult<WorkArtifactDownload>> {
    const envelope = validateWorkEnvelope<DownloadRequest>(request); if (!envelope.ok) return envelope
    try {
      const payload = envelope.value.payload
      const project = await this.store(payload.currentSessionId, payload.projectId).load()
      const version = project.versions.find(item => item.version === payload.version)
      if (version === undefined) throw new Error('version not found')
      const relativePath = payload.format === 'pptx' ? version.relativePath : version.markdownRelativePath
      const fileName = payload.format === 'pptx' ? version.fileName : version.markdownFileName
      const path = join(this.workspaceRoot(payload.currentSessionId), 'work-projects', payload.projectId, relativePath)
      const bytes = await readFile(path)
      const offset = Number.isInteger(payload.offset) && (payload.offset ?? 0) >= 0 ? payload.offset ?? 0 : 0
      const end = Math.min(bytes.length, offset + 24 * 1024)
      return { ok: true, value: { schemaVersion: WORK_RPC_SCHEMA_VERSION, fileName, mimeType: payload.format === 'pptx' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : 'text/markdown', chunkBase64: bytes.subarray(offset, end).toString('base64'), nextOffset: end < bytes.length ? end : null } }
    } catch { return { ok: false, error: { code: 'PROJECT_NOT_FOUND', learnerMessage: '没有找到这个成品版本，请刷新后重试。' } } }
  }

  private store(currentSessionId: string, projectId: string): WorkProjectStore { return new WorkProjectStore(join(this.workspaceRoot(currentSessionId), 'work-projects', projectId)) }
  private workspaceRoot(currentSessionId: string): string { const session = (this.ctx as unknown as SessionContext).sessions.get(SessionId(currentSessionId)); if (session?.header.cwd === undefined) throw new Error('selected session has no project directory'); return session.header.cwd }
}

const questionSchema = z.object({ id: z.string(), prompt: z.string(), recommendedAnswer: z.string() })
const pageSchema = z.object({ pageNumber: z.number().int(), title: z.string(), purpose: z.string(), keyPoints: z.array(z.string()) })
const versionSchema = z.object({ version: z.number().int(), fileName: z.string(), markdownFileName: z.string(), createdAt: z.string(), feedback: z.union([z.string(), z.null()]) })
const viewSchema = z.object({
  schemaVersion: z.literal(WORK_RPC_SCHEMA_VERSION),
  project: z.object({ projectId: z.string(), title: z.string(), request: z.string(), status: z.enum(['active', 'completed', 'archived']), stage: z.enum(['brief', 'clarifying', 'generating', 'draft-ready', 'revising', 'accepted', 'distilled']), stageLabel: z.string(), revision: z.number().int() }),
  brief: z.object({ audience: z.string(), desiredAction: z.string(), materials: z.array(z.string()), deliverable: z.string(), acceptance: z.array(z.string()) }),
  clarification: z.object({ round: z.number().int(), questions: z.array(questionSchema), assumptions: z.array(z.string()) }),
  artifact: z.union([z.null(), z.object({ version: z.number().int(), fileName: z.string(), markdownFileName: z.string(), thesis: z.string(), pages: z.array(pageSchema) })]),
  versions: z.array(versionSchema),
  assets: z.object({ preferences: z.array(z.string()), checklist: z.array(z.string()), reusableRules: z.array(z.string()), ready: z.boolean() }),
  learning: z.object({ offered: z.boolean(), selected: z.boolean(), topics: z.array(z.string()) }),
  primaryAction: z.union([z.literal('answer-questions'), z.literal('download-draft'), z.literal('revise-or-accept'), z.literal('finish'), z.null()]),
})
const listSchema = z.object({ schemaVersion: z.literal(WORK_RPC_SCHEMA_VERSION), projects: z.array(viewSchema) })
const downloadSchema = z.object({ schemaVersion: z.literal(WORK_RPC_SCHEMA_VERSION), fileName: z.string(), mimeType: z.enum(['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/markdown']), chunkBase64: z.string(), nextOffset: z.union([z.number().int(), z.null()]) })
const errorSchema = z.object({ code: z.enum(['SCHEMA_MISMATCH', 'INVALID_REQUEST', 'PATH_OUTSIDE_ROOT', 'VIEWMODEL_INTERNAL_LEAK', 'PROJECT_NOT_FOUND', 'MODEL_ACTION_FAILED', 'RESULT_INVALID']), learnerMessage: z.string() })
const envelopeSchema = z.object({ schemaVersion: z.string(), payload: z.unknown() })
const resultSchema = z.union([z.object({ ok: z.literal(true), value: z.union([viewSchema, listSchema, downloadSchema]) }), z.object({ ok: z.literal(false), error: errorSchema })])
function strict(typeSymbol: string, schema: z.ZodType): InvocationDescriptor['result'] { return { mode: 'strict', typeSymbol, schema } }
function descriptor(method: 'snapshot' | 'list' | 'start' | 'act' | 'download'): InvocationDescriptor { return { id: `@mwangxiang/dsh-visual-learner#work-panel/${method}`, service: 'workPanel', namespace: 'work-panel', method, invocation: { kind: 'direct' }, parameters: [{ name: 'request', wire: 'request', source: 'json', codec: strict(`@mwangxiang/dsh-visual-learner#work-${method}Request`, envelopeSchema) }], result: strict(`@mwangxiang/dsh-visual-learner#work-${method}Result`, resultSchema) } }
const WORK_PANEL_TYPERT: TypertContribution = { package: '@mwangxiang/dsh-visual-learner', face: 'host', schemas: [], model: { services: [], events: [], objects: [] }, invocations: [descriptor('snapshot'), descriptor('list'), descriptor('start'), descriptor('act'), descriptor('download')] }
