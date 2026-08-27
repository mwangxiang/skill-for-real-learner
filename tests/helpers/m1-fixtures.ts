import { DOMAIN_SCHEMA_VERSION, type EvidenceSummary, type LearningAggregate, type Operation, type ProjectManifest, type ProjectRoute, type RouteStep } from '../../packages/dsh-visual-learner/src-v01/domain/types.ts'
import { createAggregate } from '../../packages/dsh-visual-learner/src-v01/domain/reducer.ts'

export const at = '2026-08-26T10:00:00+08:00'

export function step(id: string, state: RouteStep['state'] = 'planned', prerequisites: string[] = []): RouteStep {
  return {
    id,
    projectId: 'project-1',
    stage: 'learn',
    kind: 'guided-learning',
    title: `步骤 ${id}`,
    purpose: '解决一个真实问题',
    completionEvidence: '提交一次独立表现',
    estimatedMinutes: 15,
    state,
    executor: null,
    prerequisites,
    sourceStepId: null,
    resultSummary: null,
    createdBy: 'template',
    revision: 0,
  }
}

export function aggregate(): LearningAggregate {
  const manifest: ProjectManifest = {
    schemaVersion: DOMAIN_SCHEMA_VERSION,
    projectId: 'project-1',
    title: '真实学习项目',
    locale: 'zh-CN',
    createdAt: at,
  }
  const route: ProjectRoute = {
    id: 'route-1',
    template: 'real-problem',
    rationale: '先解决眼前问题，再逐步补齐能力',
    stepOrder: ['step-1', 'step-2'],
    currentStepId: null,
    lastReplannedAt: null,
    revision: 0,
  }
  return createAggregate(manifest, route, [step('step-1'), step('step-2', 'conditional', ['step-1'])], '做出可验证的学习产品')
}

export function operation(id: string, revision: number, action: Operation['action'] = 'start-step'): Operation {
  return {
    id,
    projectId: 'project-1',
    stepId: 'step-1',
    action,
    expectedRevision: revision,
    status: 'running',
    startedAt: at,
    committedAt: null,
    errorCode: null,
  }
}

export const evidence: EvidenceSummary = {
  proven: ['能独立完成一次判断'],
  notYetProven: ['能迁移到另一种材料'],
  independence: 'independent',
  confidence: 'sufficient',
  routeExplanation: '本步证据达标，主线继续并安排复现。',
  evidenceRefs: ['learning-record-1'],
}
