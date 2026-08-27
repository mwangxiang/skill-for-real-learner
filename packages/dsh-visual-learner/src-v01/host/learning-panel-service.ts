import { randomUUID } from 'node:crypto'
import { mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { Context, Service } from '@deepseek-ai/cordis'
import { SessionId } from '@deepseek-ai/dsh-session'
import { bindTypertRemote, type InvocationDescriptor } from '@deepseek-ai/dsh-typert-protocol'
import type {} from '@deepseek-ai/dsh-typert-registry'
import type { TypertContribution } from '@deepseek-ai/dsh-typert-registry/types'
import { z } from 'zod'
import { addLocalDays } from '../domain/review.ts'
import { DOMAIN_SCHEMA_VERSION, type EvidenceSummary, type LearningAggregate, type Operation, type ProjectManifest, type ProjectRoute, type ReviewEntry, type RouteStep } from '../domain/types.ts'
import { ProjectEventStore } from '../storage/project-event-store.ts'
import { LEARNING_SCHEMA_VERSION, type LearningProjectViewModel, type LearningRpcResult, type ProjectSummaryViewModel } from '../protocol/index.ts'
import { validateEnvelope, validateLearnerViewModel } from './rpc-guard.ts'
import { LearningAgentManager } from './learning-agent-manager.ts'

export interface ProjectSnapshotRequest { projectId: string; currentSessionId?: string }
export interface StartProjectRequest { currentSessionId: string; goal: string; locale: 'zh-CN' | 'en'; timezone: string }
export interface ProjectActionRequest { currentSessionId: string; projectId: string; action: 'start-first-step' | 'submit-current-step'; evidence?: string; timezone: string }
export interface ProjectListRequest { currentSessionId: string; timezone: string }

interface SessionContext { sessions: { get(id: SessionId): { header: { cwd?: string } } | undefined } }
declare module '@deepseek-ai/cordis' { interface Context { learningPanel: LearningPanelService } }
function errorMessage(error: unknown): string { return error instanceof Error ? `${error.name}: ${error.message}` : typeof error }

function openOperation(projectId: string, revision: number, action: Operation['action'], stepId: string | null): Operation {
  return { id: `op-${randomUUID()}`, projectId, stepId, action, expectedRevision: revision, status: 'running', startedAt: new Date().toISOString(), committedAt: null, errorCode: null }
}
function requireString(record: Record<string, unknown>, key: string): string { const value = record[key]; if (typeof value !== 'string' || value.trim() === '') throw new Error(`projection field ${key} is missing`); return value.trim() }
function requireStrings(record: Record<string, unknown>, key: string): string[] { const value = record[key]; if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error(`projection field ${key} is invalid`); return value.map(String) }
function localDate(timezone: string): string { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? ''; const value = `${get('year')}-${get('month')}-${get('day')}`; if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) throw new Error('could not resolve local date'); return value }
function contextualExample(goal: string): { inputHint: string; exampleSkeleton: string } {
  if (/PPT|演示|汇报|周报|月报/iu.test(goal)) return {
    inputHint: '先写清这份汇报给谁看、希望对方看完做什么、你已有的材料，以及准备先完成的最小产出。',
    exampleSkeleton: '我要做一份面向___的汇报，希望对方看完后___。\n我现在有这些材料：___。\n我准备先写出“一句核心结论 + 三个要点”，再补证据和页面结构。',
  }
  return {
    inputHint: '写下真实情境、你已经尝试过什么、目前的判断，以及一个别人能够核对的产出。',
    exampleSkeleton: '我正在处理的真实情境是：___。\n我已经尝试过：___。\n我目前的判断是：___。\n我准备提交的可核对产出是：___。',
  }
}
function optionalProjectionString(record: Record<string, unknown>, key: string, fallback: string): string { const value = record[key]; return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback }
function step(projectId: string, id: string, title: string, purpose: string, completionEvidence: string, state: RouteStep['state'], kind: RouteStep['kind'], stage: RouteStep['stage'], prerequisites: string[] = [], guidance?: { inputHint: string; exampleSkeleton: string }): RouteStep { return { id, projectId, title, purpose, completionEvidence, inputHint: guidance?.inputHint ?? null, exampleSkeleton: guidance?.exampleSkeleton ?? null, estimatedMinutes: 10, state, kind, stage, executor: null, prerequisites, sourceStepId: null, resultSummary: null, createdBy: 'adapter', revision: 0 } }
function legacyContinuation(aggregate: LearningAggregate): { source: RouteStep; reinforcement: RouteStep; next: RouteStep } | null {
  if (aggregate.project.currentStepId !== null) return null
  for (let index = 1; index < aggregate.route.stepOrder.length - 1; index += 1) {
    const reinforcement = aggregate.steps[aggregate.route.stepOrder[index]!]!
    const source = aggregate.steps[aggregate.route.stepOrder[index - 1]!]!
    const next = aggregate.steps[aggregate.route.stepOrder[index + 1]!]!
    if (reinforcement.stage === 'stabilize' && reinforcement.state === 'completed' && source.state === 'paused' && next.state === 'conditional') return { source, reinforcement, next }
  }
  return null
}

function toView(aggregate: LearningAggregate, feedback: LearningProjectViewModel['feedback'] = null): LearningProjectViewModel {
  const current = aggregate.project.currentStepId === null ? undefined : aggregate.steps[aggregate.project.currentStepId]
  const summary: ProjectSummaryViewModel = { schemaVersion: LEARNING_SCHEMA_VERSION, projectId: aggregate.project.id, title: aggregate.project.title, goal: aggregate.project.goal, status: aggregate.project.status, currentStep: current === undefined ? null : { stepId: current.id, title: current.title, purpose: current.purpose, primaryActionKey: current.state === 'active' ? 'submit-evidence' : 'start-step' }, completedStepCount: Object.values(aggregate.steps).filter(item => item.state === 'completed').length, reviewDueCount: aggregate.project.reviewDueCount }
  const labels: Record<RouteStep['state'], string> = { conditional: '按需加入', planned: '接下来', active: '现在进行', 'waiting-user': '等待你的回答', running: '正在整理结果', completed: '已完成', 'needs-reinforcement': '需要补一小步', scheduled: '已安排复现', paused: '暂停', skipped: '已跳过', 'failed-recoverable': '可以重试' }
  const legacyNextId = legacyContinuation(aggregate)?.next.id ?? null
  const view: LearningProjectViewModel = { schemaVersion: LEARNING_SCHEMA_VERSION, project: summary, route: { rationale: aggregate.route.rationale, notice: 'route-will-adapt', steps: aggregate.route.stepOrder.map((id) => { const item = aggregate.steps[id]!; const fallback = contextualExample(aggregate.project.goal); return { stepId: item.id, title: item.title, purpose: item.purpose, completionEvidence: item.completionEvidence, inputHint: item.inputHint ?? fallback.inputHint, exampleSkeleton: item.exampleSkeleton ?? fallback.exampleSkeleton, estimatedMinutes: item.estimatedMinutes, state: item.state, stateLabel: labels[item.state], resultSummary: item.resultSummary, primaryActionKey: (item.state === 'planned' || item.id === legacyNextId) && aggregate.project.currentStepId === null ? 'start-step' : item.state === 'active' ? 'submit-evidence' : null } }) }, feedback }
  const safe = validateLearnerViewModel(view); if (!safe.ok) throw new Error(safe.error.code); return view
}

export class LearningPanelService extends Service {
  static inject = ['typert', 'agentDefaultModel', 'agents', 'sessions', 'sessionPersistence']
  readonly typertRemote = bindTypertRemote(this, 'learningPanel', { namespace: 'learning-panel' })
  private readonly agentManager: LearningAgentManager
  private readonly inFlightActions = new Map<string, Promise<LearningRpcResult<LearningProjectViewModel>>>()
  constructor(ctx: Context) { super(ctx, 'learningPanel'); this.agentManager = new LearningAgentManager(ctx); (ctx as Context & { typert: { register(contribution: TypertContribution): unknown } }).typert.register(LEARNING_PANEL_TYPERT) }

  async snapshot(request: unknown): Promise<LearningRpcResult<LearningProjectViewModel>> {
    const envelope = validateEnvelope<ProjectSnapshotRequest>(request); if (!envelope.ok) return envelope
    try { const payload = envelope.value.payload; if (!payload?.projectId || !payload.currentSessionId) throw new Error('missing project selection'); const root = this.workspaceRoot(payload.currentSessionId); return { ok: true, value: toView(await new ProjectEventStore(join(root, 'learning-projects', payload.projectId)).rebuild(localDate('Asia/Shanghai'))) } }
    catch { return { ok: false, error: { code: 'PROJECT_NOT_FOUND', learnerMessage: '没有找到这个学习项目，请返回首页重新选择。' } } }
  }

  async list(request: unknown): Promise<LearningRpcResult<{ schemaVersion: typeof LEARNING_SCHEMA_VERSION; projects: LearningProjectViewModel[] }>> {
    const envelope = validateEnvelope<ProjectListRequest>(request); if (!envelope.ok) return envelope
    try {
      const payload = envelope.value.payload; const root = this.workspaceRoot(payload.currentSessionId); const projectsRoot = join(root, 'learning-projects')
      const entries = await readdir(projectsRoot, { withFileTypes: true }).catch(() => [])
      const projects: LearningProjectViewModel[] = []
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        try { projects.push(toView(await new ProjectEventStore(join(projectsRoot, entry.name)).rebuild(localDate(payload.timezone)))) } catch { /* one damaged project does not hide healthy siblings */ }
      }
      projects.sort((left, right) => left.project.title.localeCompare(right.project.title, 'zh-CN'))
      const value = { schemaVersion: LEARNING_SCHEMA_VERSION, projects }; const safe = validateLearnerViewModel(value); if (!safe.ok) throw new Error(safe.error.code)
      return { ok: true, value }
    } catch { return { ok: false, error: { code: 'PROJECT_NOT_FOUND', learnerMessage: '学习项目暂时无法恢复，请重新选择学习目录。' } } }
  }

  async start(request: unknown): Promise<LearningRpcResult<LearningProjectViewModel>> {
    const envelope = validateEnvelope<StartProjectRequest>(request); if (!envelope.ok) return envelope
    const payload = envelope.value.payload
    if (!payload || typeof payload.goal !== 'string' || payload.goal.trim() === '' || !['zh-CN', 'en'].includes(payload.locale)) return { ok: false, error: { code: 'INVALID_REQUEST', learnerMessage: '请先写下一个真实目标。' } }
    try {
      const root = this.workspaceRoot(payload.currentSessionId); const projectId = `project-${randomUUID()}`; const projectDir = join(root, 'learning-projects', projectId); await mkdir(projectDir, { recursive: true })
      const routeProjection = await this.agentManager.runStructured(projectId, projectDir, `/ask-ming ${payload.goal}`, ['把刚才的导航结论投影为产品路线。不要执行新的能力。只返回一个 JSON 对象，不要代码围栏：', '{"routeRationale":"为什么这样安排","firstStepTitle":"第一步标题","firstStepPurpose":"为什么先做","completionEvidence":"完成标准","inputHint":"告诉普通人应该写哪些信息，不超过45字","exampleSkeleton":"结合目标给一个带空格线的可编辑示例骨架，不替学习者作答"}', '示例骨架必须贴合目标中的对象（例如 PPT、周报、文章或代码），使用___保留需要学习者填写的内容。所有值使用学习者能理解的简体中文，不得出现命令、内部能力名、文件路径或会话信息。'].join('\n'))
      const fallback = contextualExample(payload.goal); const guidance = { inputHint: optionalProjectionString(routeProjection, 'inputHint', fallback.inputHint), exampleSkeleton: optionalProjectionString(routeProjection, 'exampleSkeleton', fallback.exampleSkeleton) }
      const createdAt = new Date().toISOString(); const first = step(projectId, 'step-1', requireString(routeProjection, 'firstStepTitle'), requireString(routeProjection, 'firstStepPurpose'), requireString(routeProjection, 'completionEvidence'), 'planned', 'guided-learning', 'learn', [], guidance); const action = step(projectId, 'step-2', '完成一次真实行动', '把刚学到的判断用于当前问题', '提交可核对的作品、判断或行动记录', 'conditional', 'offline-task', 'act', ['step-1'], guidance); const review = step(projectId, 'step-3', '检查这次学习是否真的有效', '用独立表现确认理解和迁移', '完成一次不看原答案的检验', 'conditional', 'review', 'review', ['step-2'], guidance)
      const manifest: ProjectManifest = { schemaVersion: DOMAIN_SCHEMA_VERSION, projectId, title: payload.goal.slice(0, 42), locale: payload.locale, createdAt }; const route: ProjectRoute = { id: `route-${randomUUID()}`, template: 'real-problem', rationale: requireString(routeProjection, 'routeRationale'), stepOrder: [first.id, action.id, review.id], currentStepId: null, lastReplannedAt: null, revision: 0 }
      const store = new ProjectEventStore(projectDir); let aggregate = await store.initialize({ manifest, goal: payload.goal.trim(), route, steps: [first, action, review] }); aggregate = await store.commit({ operation: openOperation(projectId, 0, 'plan-route', null), mutations: [], timestamp: new Date().toISOString() }); return { ok: true, value: toView(aggregate) }
    } catch (error) { if (process.env.DSH_LEARNING_DEBUG === '1') throw error; this.ctx.logger.warn(`dsh-visual-learner: route planning failed: ${errorMessage(error)}`); return { ok: false, error: { code: 'MODEL_ACTION_FAILED', learnerMessage: '建议路线没有生成成功，你的目标仍然安全保留，请重试。' } } }
  }

  async act(request: unknown): Promise<LearningRpcResult<LearningProjectViewModel>> {
    const envelope = validateEnvelope<ProjectActionRequest>(request); if (!envelope.ok) return envelope; const payload = envelope.value.payload
    if (!payload?.projectId) return { ok: false, error: { code: 'INVALID_REQUEST', learnerMessage: '没有找到要继续的学习项目。' } }
    const existing = this.inFlightActions.get(payload.projectId)
    if (existing !== undefined) return existing
    const action = this.runProjectAction(payload)
    this.inFlightActions.set(payload.projectId, action)
    try { return await action } finally { if (this.inFlightActions.get(payload.projectId) === action) this.inFlightActions.delete(payload.projectId) }
  }

  private async runProjectAction(payload: ProjectActionRequest): Promise<LearningRpcResult<LearningProjectViewModel>> {
    try {
      const root = this.workspaceRoot(payload.currentSessionId); const projectDir = join(root, 'learning-projects', payload.projectId); const store = new ProjectEventStore(projectDir); let aggregate = await store.rebuild(localDate(payload.timezone))
      if (payload.action === 'start-first-step') {
        const current = aggregate.route.stepOrder.map(id => aggregate.steps[id]!).find(item => item.state === 'planned')
        if (current === undefined) {
          const legacy = legacyContinuation(aggregate); if (legacy === null) throw new Error('no planned step')
          const restoredEvidence: EvidenceSummary = { proven: [legacy.reinforcement.resultSummary ?? '已完成补强步骤'], notYetProven: [], independence: 'independent', confidence: 'sufficient', routeExplanation: legacy.reinforcement.resultSummary ?? '补强步骤已完成，恢复主线并继续真实行动。', evidenceRefs: [] }
          aggregate = await store.commit({ operation: openOperation(payload.projectId, aggregate.project.revision, 'start-step', legacy.next.id), mutations: [{ type: 'transition-step', stepId: legacy.source.id, to: 'planned', reason: '兼容旧版补强流转' }, { type: 'transition-step', stepId: legacy.source.id, to: 'active', reason: '恢复已由补强证明的主步骤' }, { type: 'transition-step', stepId: legacy.source.id, to: 'running', reason: '提交旧版补强证据' }, { type: 'complete', targetStepId: legacy.source.id, evidence: restoredEvidence, reason: restoredEvidence.routeExplanation }, { type: 'transition-step', stepId: legacy.next.id, to: 'planned', reason: '补强完成，开放真实行动' }, { type: 'transition-step', stepId: legacy.next.id, to: 'active', reason: '学习者明确继续下一步' }], timestamp: new Date().toISOString() })
          return { ok: true, value: toView(aggregate) }
        }
        await this.agentManager.runStructured(payload.projectId, projectDir, `/teach-me ${aggregate.project.goal}`, ['把当前教学暂停点投影为一张学习卡。只返回 JSON，不要代码围栏：', '{"title":"当前学习标题","purpose":"为什么现在学","completionEvidence":"本步达标表现","prompt":"只问一个需要学习者回答的问题"}', '不得出现命令、内部能力名、文件路径或会话信息。'].join('\n'))
        aggregate = await store.commit({ operation: openOperation(payload.projectId, aggregate.project.revision, 'start-step', current.id), mutations: [{ type: 'transition-step', stepId: current.id, to: 'active', reason: '学习者明确开始第一步' }], timestamp: new Date().toISOString() }); return { ok: true, value: toView(aggregate) }
      }
      if (typeof payload.evidence !== 'string' || payload.evidence.trim() === '') throw new Error('evidence missing'); const currentId = aggregate.project.currentStepId; if (currentId === null) throw new Error('no current step')
      const currentStep = aggregate.steps[currentId]!
      const projection = await this.agentManager.runStructuredSingleTurn(payload.projectId, projectDir, `/study-review 检验当前学习目标。学习者独立表现：${payload.evidence}`, ['完成 study-review 的证据检验后，不要输出过程说明，只返回严格 JSON，不要代码围栏：', '{"proven":["已证明"],"notYetProven":["尚未证明"],"routeExplanation":"路线怎样调整","nextAction":"唯一下一步","confidence":"sufficient|partial|insufficient","needsReinforcement":true}', `当前只判断这一个步骤：${currentStep.title}`, `这个步骤的达标证据是：${currentStep.completionEvidence}`, '如果这一个步骤的达标证据已经出现，confidence 必须为 sufficient、needsReinforcement 必须为 false；未来路线或整个项目尚未完成，不能阻止当前小步完成。', '只能依据学习者表现；不得出现命令、内部能力名、文件路径或会话信息。'].join('\n'))
      const evidence: EvidenceSummary = { proven: requireStrings(projection, 'proven'), notYetProven: requireStrings(projection, 'notYetProven'), independence: 'independent', confidence: ['sufficient', 'partial', 'insufficient'].includes(String(projection['confidence'])) ? projection['confidence'] as EvidenceSummary['confidence'] : 'insufficient', routeExplanation: requireString(projection, 'routeExplanation'), evidenceRefs: [] }; const feedback = { proven: evidence.proven, notYetProven: evidence.notYetProven, routeExplanation: evidence.routeExplanation, nextAction: requireString(projection, 'nextAction') }
      const operation = openOperation(payload.projectId, aggregate.project.revision, 'submit-step', currentId); const mutations: Parameters<ProjectEventStore['commit']>[0]['mutations'] = [{ type: 'transition-step', stepId: currentId, to: 'running', reason: '学习者提交独立表现' }]
      if (projection['needsReinforcement'] === true || evidence.confidence !== 'sufficient') { const sourceStepId = currentStep.sourceStepId ?? currentId; const reinforcement = { ...step(payload.projectId, `step-${randomUUID()}`, '补上一个最小缺口', feedback.nextAction, '完成一次新的独立表现', 'planned', 'guided-learning', 'stabilize', [], { inputHint: currentStep.inputHint ?? contextualExample(aggregate.project.goal).inputHint, exampleSkeleton: currentStep.exampleSkeleton ?? contextualExample(aggregate.project.goal).exampleSkeleton }), sourceStepId }; mutations.push({ type: 'transition-step', stepId: currentId, to: 'needs-reinforcement', reason: evidence.routeExplanation }, { type: 'insert-after', anchorStepId: currentId, step: reinforcement, reason: evidence.routeExplanation }, { type: 'pause', targetStepId: currentId, reason: '先完成补强步骤' }) }
      else {
        const capabilityStepId = currentStep.sourceStepId ?? currentId
        mutations.push({ type: 'complete', targetStepId: currentId, evidence, reason: evidence.routeExplanation })
        if (currentStep.sourceStepId !== null) {
          const source = aggregate.steps[currentStep.sourceStepId]
          if (source?.state === 'paused') mutations.push({ type: 'transition-step', stepId: source.id, to: 'planned', reason: '补强证据已满足原步骤' }, { type: 'transition-step', stepId: source.id, to: 'active', reason: '恢复原步骤以提交补强证据' }, { type: 'transition-step', stepId: source.id, to: 'running', reason: '补强证据已提交' }, { type: 'complete', targetStepId: source.id, evidence, reason: evidence.routeExplanation })
        }
        const nextConditional = aggregate.route.stepOrder.map(id => aggregate.steps[id]!).find(item => item.state === 'conditional' && item.prerequisites.includes(capabilityStepId))
        if (nextConditional !== undefined) mutations.push({ type: 'transition-step', stepId: nextConditional.id, to: 'planned', reason: '当前小步完成，开放下一项真实行动' })
        const today = localDate(payload.timezone); const reviewEntry: ReviewEntry = { id: `review-${randomUUID()}`, projectId: payload.projectId, sourceStepId: capabilityStepId, claim: evidence.proven[0] ?? aggregate.steps[capabilityStepId]!.completionEvidence, dueDate: addLocalDays(today, 3), timezone: payload.timezone, intervalDays: 3, state: 'scheduled', history: [] }; const reviewStep = { ...step(payload.projectId, `step-${randomUUID()}`, '三天后独立复现', '确认这次能力不是刚学完才会', '在不看原答案时完成一次新检验', 'scheduled', 'review', 'reproduce', [capabilityStepId]), sourceStepId: capabilityStepId }; mutations.push({ type: 'schedule-review', review: reviewEntry, step: reviewStep, reason: '按三天间隔安排第一次复现' })
      }
      aggregate = await store.commit({ operation, mutations, timestamp: new Date().toISOString() }); return { ok: true, value: toView(aggregate, feedback) }
    } catch (error) { if (process.env.DSH_LEARNING_DEBUG === '1') throw error; this.ctx.logger.warn(`dsh-visual-learner: step action failed: ${errorMessage(error)}`); return { ok: false, error: { code: 'MODEL_ACTION_FAILED', learnerMessage: '这一步没有整理成功，你的输入和学习记录仍然安全，请重试。' } } }
  }

  private workspaceRoot(currentSessionId: string): string { const session = (this.ctx as unknown as SessionContext).sessions.get(SessionId(currentSessionId)); if (session?.header.cwd === undefined) throw new Error('selected session has no project directory'); return session.header.cwd }
}

const stepSummarySchema = z.object({ stepId: z.string(), title: z.string(), purpose: z.string(), primaryActionKey: z.string() })
const projectSummarySchema = z.object({ schemaVersion: z.literal(LEARNING_SCHEMA_VERSION), projectId: z.string(), title: z.string(), goal: z.string(), status: z.enum(['active', 'paused', 'archived']), currentStep: z.union([z.null(), stepSummarySchema]), completedStepCount: z.number().int().nonnegative(), reviewDueCount: z.number().int().nonnegative() })
const routeStepSchema = z.object({ stepId: z.string(), title: z.string(), purpose: z.string(), completionEvidence: z.string(), inputHint: z.string(), exampleSkeleton: z.string(), estimatedMinutes: z.union([z.number(), z.null()]), state: z.string(), stateLabel: z.string(), resultSummary: z.union([z.string(), z.null()]), primaryActionKey: z.union([z.string(), z.null()]) })
const projectViewSchema = z.object({ schemaVersion: z.literal(LEARNING_SCHEMA_VERSION), project: projectSummarySchema, route: z.object({ rationale: z.string(), notice: z.literal('route-will-adapt'), steps: z.array(routeStepSchema) }), feedback: z.union([z.null(), z.object({ proven: z.array(z.string()), notYetProven: z.array(z.string()), routeExplanation: z.string(), nextAction: z.string() })]) })
const errorSchema = z.object({ code: z.enum(['SCHEMA_MISMATCH', 'INVALID_REQUEST', 'PATH_OUTSIDE_ROOT', 'VIEWMODEL_INTERNAL_LEAK', 'PROJECT_NOT_FOUND', 'MODEL_ACTION_FAILED', 'RESULT_INVALID']), learnerMessage: z.string() })
function strict(typeSymbol: string, schema: z.ZodType): InvocationDescriptor['result'] { return { mode: 'strict', typeSymbol, schema } }
const envelopeSchema = z.object({ schemaVersion: z.string(), payload: z.unknown() }); const resultSchema = z.union([z.object({ ok: z.literal(true), value: z.union([projectViewSchema, z.object({ schemaVersion: z.literal(LEARNING_SCHEMA_VERSION), projects: z.array(projectViewSchema) })]) }), z.object({ ok: z.literal(false), error: errorSchema })])
function descriptor(method: 'snapshot' | 'list' | 'start' | 'act'): InvocationDescriptor { return { id: `@mwangxiang/dsh-visual-learner#learning-panel/${method}`, service: 'learningPanel', namespace: 'learning-panel', method, invocation: { kind: 'direct' }, parameters: [{ name: 'request', wire: 'request', source: 'json', codec: strict(`@mwangxiang/dsh-visual-learner#${method}Request`, envelopeSchema) }], result: strict(`@mwangxiang/dsh-visual-learner#${method}Result`, resultSchema) } }
const LEARNING_PANEL_TYPERT: TypertContribution = { package: '@mwangxiang/dsh-visual-learner', face: 'host', schemas: [], model: { services: [], events: [], objects: [] }, invocations: [descriptor('snapshot'), descriptor('list'), descriptor('start'), descriptor('act')] }
export async function apply(ctx: Context): Promise<void> { await ctx.plugin(LearningPanelService) }
