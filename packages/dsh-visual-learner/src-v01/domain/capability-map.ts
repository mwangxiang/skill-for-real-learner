import type { RouteTemplate, StepKind, StepStage } from './types.ts'

export const LOCKED_CAPABILITY_NAMES = [
  'ask-ming', 'grill-with-learn', 'learn-modeling', 'learn-one-concept', 'strategyfinder',
  'study-review', 'teach-core', 'teach-me', 'to-sop', 'to-task',
] as const

export type LockedCapabilityName = typeof LOCKED_CAPABILITY_NAMES[number]

export interface CapabilityRouteMapping {
  capability: LockedCapabilityName
  templates: RouteTemplate[]
  stage: StepStage
  kind: StepKind
  learnerPurpose: string
  trigger: 'route-plan' | 'explicit-step' | 'evidence-review' | 'conditional-artifact'
}

/** Internal adapter registry. This vocabulary never crosses the learner ViewModel boundary. */
export const CAPABILITY_ROUTE_MAP: readonly CapabilityRouteMapping[] = [
  { capability: 'ask-ming', templates: ['concept', 'real-problem', 'long-capability', 'recovered'], stage: 'orient', kind: 'question', learnerPurpose: '判断现在最值得先解决什么', trigger: 'route-plan' },
  { capability: 'grill-with-learn', templates: ['real-problem', 'long-capability', 'recovered'], stage: 'clarify', kind: 'question', learnerPurpose: '把目标、约束和证据说清楚', trigger: 'explicit-step' },
  { capability: 'learn-modeling', templates: ['concept', 'real-problem'], stage: 'model', kind: 'guided-learning', learnerPurpose: '把指定材料整理成可回溯的概念关系', trigger: 'conditional-artifact' },
  { capability: 'learn-one-concept', templates: ['concept'], stage: 'learn', kind: 'guided-learning', learnerPurpose: '围绕一个概念完成解释、判断和行动', trigger: 'explicit-step' },
  { capability: 'strategyfinder', templates: ['long-capability', 'recovered'], stage: 'direction', kind: 'decision', learnerPurpose: '确认长期方向和阶段取舍', trigger: 'explicit-step' },
  { capability: 'study-review', templates: ['concept', 'real-problem', 'long-capability', 'recovered'], stage: 'review', kind: 'review', learnerPurpose: '用独立表现检验证据并调整路线', trigger: 'evidence-review' },
  { capability: 'teach-core', templates: ['concept', 'real-problem', 'long-capability'], stage: 'learn', kind: 'guided-learning', learnerPurpose: '支撑一小块有达标标准的教学', trigger: 'conditional-artifact' },
  { capability: 'teach-me', templates: ['real-problem', 'long-capability'], stage: 'learn', kind: 'guided-learning', learnerPurpose: '从真实问题推进一个最小学习块', trigger: 'explicit-step' },
  { capability: 'to-sop', templates: ['long-capability', 'recovered'], stage: 'stabilize', kind: 'decision', learnerPurpose: '把有效方法整理成稳定步骤', trigger: 'conditional-artifact' },
  { capability: 'to-task', templates: ['real-problem', 'long-capability', 'recovered'], stage: 'plan', kind: 'offline-task', learnerPurpose: '把已确认的方法变成下一批真实任务', trigger: 'explicit-step' },
]
