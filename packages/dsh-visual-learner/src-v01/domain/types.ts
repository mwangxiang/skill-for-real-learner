import type { LearningRpcError } from '../protocol/index.ts'

export const DOMAIN_SCHEMA_VERSION = '0.2.0' as const

export type ProjectStatus = 'active' | 'paused' | 'archived'
export type RouteTemplate = 'concept' | 'real-problem' | 'long-capability' | 'recovered'
export type StepStage = 'orient' | 'clarify' | 'direction' | 'model' | 'learn' | 'act' | 'review' | 'stabilize' | 'plan' | 'reproduce' | 'complete'
export type StepKind = 'question' | 'guided-learning' | 'decision' | 'offline-task' | 'review' | 'summary'
export type StepState = 'conditional' | 'planned' | 'active' | 'waiting-user' | 'running' | 'completed' | 'needs-reinforcement' | 'scheduled' | 'paused' | 'skipped' | 'failed-recoverable'

export interface ProjectState {
  schemaVersion: typeof DOMAIN_SCHEMA_VERSION
  id: string
  title: string
  goal: string
  locale: 'zh-CN' | 'en'
  status: ProjectStatus
  routeId: string
  currentStepId: string | null
  reviewDueCount: number
  revision: number
  createdAt: string
  updatedAt: string
}

export interface ProjectRoute {
  id: string
  template: RouteTemplate
  rationale: string
  stepOrder: string[]
  currentStepId: string | null
  lastReplannedAt: string | null
  revision: number
}

export interface RouteStep {
  id: string
  projectId: string
  stage: StepStage
  kind: StepKind
  title: string
  purpose: string
  completionEvidence: string
  inputHint?: string | null
  exampleSkeleton?: string | null
  estimatedMinutes: number | null
  state: StepState
  executor: string | null
  prerequisites: string[]
  sourceStepId: string | null
  resultSummary: string | null
  createdBy: 'template' | 'adapter' | 'review' | 'user' | 'rebuild'
  revision: number
}

export interface ReviewHistoryItem {
  localDate: string
  result: 'met' | 'partial' | 'not-met' | 'insufficient'
}

export interface ReviewEntry {
  id: string
  projectId: string
  sourceStepId: string
  claim: string
  dueDate: string
  timezone: string
  intervalDays: 3 | 7 | 21
  state: 'scheduled' | 'due' | 'running' | 'completed' | 'deferred'
  history: ReviewHistoryItem[]
}

export interface Operation {
  id: string
  projectId: string
  stepId: string | null
  action: 'plan-route' | 'start-step' | 'submit-step' | 'adjust-route' | 'start-review' | 'submit-review'
  expectedRevision: number
  status: 'queued' | 'running' | 'waiting-user' | 'committed' | 'failed' | 'cancelled'
  startedAt: string
  committedAt: string | null
  errorCode: string | null
}

export interface EvidenceSummary {
  proven: string[]
  notYetProven: string[]
  independence: 'independent' | 'prompted' | 'taught-after-attempt' | 'unknown'
  confidence: 'sufficient' | 'partial' | 'insufficient'
  routeExplanation: string
  evidenceRefs: string[]
}

export interface RouteStepProposal {
  proposalId: string
  stage: StepStage
  kind: StepKind
  title: string
  purpose: string
  completionEvidence: string
  estimatedMinutes: number | null
  executor: string | null
  prerequisiteProposalIds: string[]
  initialState: 'conditional' | 'planned' | 'scheduled'
  triggerCondition: string | null
}

export type RouteMutation =
  | { type: 'insert-before'; anchorStepId: string; step: RouteStep; reason: string }
  | { type: 'insert-after'; anchorStepId: string; step: RouteStep; reason: string }
  | { type: 'replace'; targetStepId: string; step: RouteStep; reason: string }
  | { type: 'pause'; targetStepId: string; reason: string }
  | { type: 'resume'; targetStepId: string; reason: string }
  | { type: 'skip'; targetStepId: string; reason: string }
  | { type: 'complete'; targetStepId: string; evidence: EvidenceSummary; reason: string }
  | { type: 'schedule-review'; review: ReviewEntry; step: RouteStep; reason: string }
  | { type: 'reorder'; orderedStepIds: string[]; reason: string }
  | { type: 'archive-project'; reason: string }

export type DomainMutation = RouteMutation
  | { type: 'transition-step'; stepId: string; to: StepState; reason: string }
  | { type: 'record-review-result'; reviewId: string; localDate: string; result: ReviewHistoryItem['result']; reason: string }

export interface LearningAggregate {
  project: ProjectState
  route: ProjectRoute
  steps: Record<string, RouteStep>
  reviews: Record<string, ReviewEntry>
  operations: Record<string, Operation>
}

export interface ProjectManifest {
  schemaVersion: typeof DOMAIN_SCHEMA_VERSION
  projectId: string
  title: string
  locale: 'zh-CN' | 'en'
  createdAt: string
}

export interface TransactionEvent {
  schemaVersion: typeof DOMAIN_SCHEMA_VERSION
  event: 'transaction-committed'
  projectId: string
  operationId: string
  expectedRevision: number
  revision: number
  timestamp: string
  mutations: DomainMutation[]
  operation: Operation
}

export interface ProjectCreatedEvent {
  schemaVersion: typeof DOMAIN_SCHEMA_VERSION
  event: 'project-created'
  projectId: string
  timestamp: string
  manifest: ProjectManifest
  goal: string
  route: ProjectRoute
  steps: RouteStep[]
}

export type LearningEvent = ProjectCreatedEvent | TransactionEvent

export type DomainErrorCode = LearningRpcError['code'] | 'REVISION_CONFLICT' | 'DUPLICATE_ID' | 'INVALID_MUTATION' | 'INVALID_TRANSITION' | 'UNKNOWN_SCHEMA'

export class DomainError extends Error {
  constructor(readonly code: DomainErrorCode, message: string) {
    super(message)
    this.name = 'DomainError'
  }
}
