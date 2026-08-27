export const WORK_SCHEMA_VERSION = '0.3.0' as const

export type WorkLocale = 'zh-CN' | 'en'
export type WorkStage = 'brief' | 'clarifying' | 'generating' | 'draft-ready' | 'revising' | 'accepted' | 'distilled'
export type WorkStatus = 'active' | 'completed' | 'archived'

export interface WorkQuestion {
  id: string
  prompt: string
  recommendedAnswer: string
}

export interface WorkBrief {
  audience: string
  desiredAction: string
  materials: string[]
  deliverable: string
  acceptance: string[]
}

export interface PresentationPage {
  title: string
  purpose: string
  keyPoints: string[]
  speakerNote: string
}

export interface ArtifactVersion {
  version: number
  fileName: string
  relativePath: string
  markdownFileName: string
  markdownRelativePath: string
  createdAt: string
  feedback: string | null
  thesis: string
  pages: PresentationPage[]
}

export interface WorkAssets {
  preferences: string[]
  checklist: string[]
  reusableRules: string[]
  relativePath: string | null
}

export interface WorkLearning {
  offered: boolean
  selected: boolean
  topics: string[]
}

export interface WorkProject {
  schemaVersion: typeof WORK_SCHEMA_VERSION
  id: string
  title: string
  request: string
  locale: WorkLocale
  status: WorkStatus
  stage: WorkStage
  brief: WorkBrief
  clarification: {
    round: 0 | 1 | 2
    questions: WorkQuestion[]
    assumptions: string[]
    response: string | null
  }
  artifact: ArtifactVersion | null
  versions: ArtifactVersion[]
  assets: WorkAssets
  learning: WorkLearning
  revision: number
  recentOperationIds: string[]
  createdAt: string
  updatedAt: string
}

export interface DeckProjection {
  title: string
  thesis: string
  audience: string
  desiredAction: string
  assumptions: string[]
  pages: PresentationPage[]
  preferences: string[]
  checklist: string[]
  reusableRules: string[]
  learningTopics: string[]
}

export interface WorkEvent {
  schemaVersion: typeof WORK_SCHEMA_VERSION
  event: 'work-project-created' | 'work-project-updated'
  projectId: string
  operationId: string
  revision: number
  timestamp: string
  summary: string
  project: WorkProject
}
