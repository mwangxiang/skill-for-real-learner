export const LEARNING_SCHEMA_VERSION = '0.2.0' as const

export interface LearningRpcEnvelope<T> {
  schemaVersion: typeof LEARNING_SCHEMA_VERSION
  payload: T
}

export interface LearningRpcError {
  code: 'SCHEMA_MISMATCH' | 'INVALID_REQUEST' | 'PATH_OUTSIDE_ROOT' | 'VIEWMODEL_INTERNAL_LEAK' | 'PROJECT_NOT_FOUND' | 'MODEL_ACTION_FAILED' | 'RESULT_INVALID'
  learnerMessage: string
}

export type LearningRpcResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: LearningRpcError }

export interface ProjectSummaryViewModel {
  schemaVersion: typeof LEARNING_SCHEMA_VERSION
  projectId: string
  title: string
  goal: string
  status: 'active' | 'paused' | 'archived'
  currentStep: null | {
    stepId: string
    title: string
    purpose: string
    primaryActionKey: string
  }
  completedStepCount: number
  reviewDueCount: number
}

export interface RouteStepViewModel {
  stepId: string
  title: string
  purpose: string
  completionEvidence: string
  inputHint: string
  exampleSkeleton: string
  estimatedMinutes: number | null
  state: 'conditional' | 'planned' | 'active' | 'waiting-user' | 'running' | 'completed' | 'needs-reinforcement' | 'scheduled' | 'paused' | 'skipped' | 'failed-recoverable'
  stateLabel: string
  resultSummary: string | null
  primaryActionKey: string | null
}

export interface LearningProjectViewModel {
  schemaVersion: typeof LEARNING_SCHEMA_VERSION
  project: ProjectSummaryViewModel
  route: {
    rationale: string
    notice: 'route-will-adapt'
    steps: RouteStepViewModel[]
  }
  feedback: null | {
    proven: string[]
    notYetProven: string[]
    routeExplanation: string
    nextAction: string
  }
}

export const LEARNER_VIEWMODEL_FORBIDDEN_KEYS = new Set([
  'sessionId', 'skill', 'skillName', 'command', 'rpc', 'rpcName', 'sidecarPath',
  'rawPrompt', 'rawOutput', 'assistantText', 'absolutePath',
])

export function createLearningRequest<T>(payload: T): LearningRpcEnvelope<T> {
  return { schemaVersion: LEARNING_SCHEMA_VERSION, payload }
}

export const WORK_SCHEMA_VERSION = '0.3.0' as const

export interface WorkRpcEnvelope<T> {
  schemaVersion: typeof WORK_SCHEMA_VERSION
  payload: T
}

export type WorkRpcResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: LearningRpcError }

export interface WorkQuestionViewModel {
  id: string
  prompt: string
  recommendedAnswer: string
}

export interface WorkPageViewModel {
  pageNumber: number
  title: string
  purpose: string
  keyPoints: string[]
}

export interface WorkVersionViewModel {
  version: number
  fileName: string
  markdownFileName: string
  createdAt: string
  feedback: string | null
}

export interface WorkProjectViewModel {
  schemaVersion: typeof WORK_SCHEMA_VERSION
  project: {
    projectId: string
    title: string
    request: string
    status: 'active' | 'completed' | 'archived'
    stage: 'brief' | 'clarifying' | 'generating' | 'draft-ready' | 'revising' | 'accepted' | 'distilled'
    stageLabel: string
    revision: number
  }
  brief: {
    audience: string
    desiredAction: string
    materials: string[]
    deliverable: string
    acceptance: string[]
  }
  clarification: {
    round: number
    questions: WorkQuestionViewModel[]
    assumptions: string[]
  }
  artifact: null | {
    version: number
    fileName: string
    markdownFileName: string
    thesis: string
    pages: WorkPageViewModel[]
  }
  versions: WorkVersionViewModel[]
  assets: {
    preferences: string[]
    checklist: string[]
    reusableRules: string[]
    ready: boolean
  }
  learning: {
    offered: boolean
    selected: boolean
    topics: string[]
  }
  primaryAction: 'answer-questions' | 'download-draft' | 'revise-or-accept' | 'finish' | null
}

export interface WorkArtifactDownload {
  schemaVersion: typeof WORK_SCHEMA_VERSION
  fileName: string
  mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' | 'text/markdown'
  chunkBase64: string
  nextOffset: number | null
}

export function createWorkRequest<T>(payload: T): WorkRpcEnvelope<T> {
  return { schemaVersion: WORK_SCHEMA_VERSION, payload }
}
