import { DOMAIN_SCHEMA_VERSION, type EvidenceSummary, type RouteMutation, type StepKind } from './types.ts'

export const ACTION_KEYS = new Set([
  'answer-question', 'begin-guided-learning', 'submit-learning-response', 'confirm-decision',
  'begin-offline-task', 'submit-evidence', 'begin-review', 'submit-review', 'retry-step', 'continue-route',
])

export interface CardBase {
  cardId: string
  kind: StepKind
  title: string
  purpose: string
  completionEvidence: string
  primaryActionKey: string
  secondaryActionKey: string | null
  estimatedMinutes: number | null
  details: Array<{ label: string; body: string; initiallyExpanded: boolean }>
}

export interface QuestionCardView extends CardBase {
  kind: 'question'
  prompt: string
  input: { type: 'text'; multiline: boolean; maxLength: number }
    | { type: 'single-choice'; options: Array<{ id: string; label: string; detail?: string }> }
}

export interface GuidedLearningCardView extends CardBase {
  kind: 'guided-learning'
  explanation: string
  prompt: string | null
  input: { type: 'text'; multiline: boolean; maxLength: number } | null
}

export interface DecisionCardView extends CardBase {
  kind: 'decision'
  recommendation: string
  basis: string[]
  boundaries: string[]
  editableFields: Array<{ key: string; label: string; value: string }>
}

export interface EvidenceInputSpec {
  allowText: boolean
  allowUrl: boolean
  allowImages: boolean
  textRequired: boolean
  maxTextLength: number
  maxUrls: number
  maxImages: number
}

export interface OfflineTaskCardView extends CardBase {
  kind: 'offline-task'
  instructions: string[]
  dependencies: string[]
  evidenceRequirements: string[]
  evidenceInput: EvidenceInputSpec
}

export interface ReviewCardView extends CardBase {
  kind: 'review'
  claim: string
  prompt: string
  hideReferenceUntilSubmitted: true
  evidenceInput: EvidenceInputSpec
}

export type ActionCardView = QuestionCardView | GuidedLearningCardView | DecisionCardView | OfflineTaskCardView | ReviewCardView

export type StepExecutionResult =
  | { schemaVersion: typeof DOMAIN_SCHEMA_VERSION; operationId: string; projectId: string; stepId: string; outcome: 'needs-user-input'; card: QuestionCardView | GuidedLearningCardView | DecisionCardView; artifactRefs: unknown[] }
  | { schemaVersion: typeof DOMAIN_SCHEMA_VERSION; operationId: string; projectId: string; stepId: string; outcome: 'ready-for-action'; card: GuidedLearningCardView | OfflineTaskCardView | ReviewCardView; artifactRefs: unknown[] }
  | { schemaVersion: typeof DOMAIN_SCHEMA_VERSION; operationId: string; projectId: string; stepId: string; outcome: 'completed'; evidence: EvidenceSummary; proposedMutations: RouteMutation[]; nextActionLabel: string; artifactRefs: unknown[] }
  | { schemaVersion: typeof DOMAIN_SCHEMA_VERSION; operationId: string; projectId: string; stepId: string; outcome: 'needs-reinforcement'; evidence: EvidenceSummary; reinforcement: unknown; proposedMutations: RouteMutation[]; artifactRefs: unknown[] }
  | { schemaVersion: typeof DOMAIN_SCHEMA_VERSION; operationId: string; projectId: string; stepId: string | null; outcome: 'recoverable-error'; errorCode: string; learnerMessage: string; retryActionLabel: string }

export interface ValidationContext {
  operationId: string
  projectId: string
  stepId: string | null
}

export type ProjectionValidation = { ok: true; value: StepExecutionResult } | { ok: false; issues: string[] }

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function validateCard(value: unknown): string[] {
  const card = record(value)
  if (card === null) return ['card must be an object']
  const issues: string[] = []
  for (const key of ['cardId', 'title', 'purpose', 'completionEvidence', 'primaryActionKey']) {
    if (!nonEmpty(card[key])) issues.push(`card.${key} must be non-empty`)
  }
  if (!ACTION_KEYS.has(String(card['primaryActionKey']))) issues.push('card.primaryActionKey is not allowed')
  if (card['secondaryActionKey'] !== null && !ACTION_KEYS.has(String(card['secondaryActionKey']))) {
    issues.push('card.secondaryActionKey is not allowed')
  }
  const kind = card['kind']
  if (!['question', 'guided-learning', 'decision', 'offline-task', 'review'].includes(String(kind))) issues.push('card.kind is invalid')
  if (kind === 'question') {
    const input = record(card['input'])
    if (input?.['type'] === 'single-choice') {
      const options = input['options']
      if (!Array.isArray(options) || options.length < 1 || options.length > 3) issues.push('question options must contain 1-3 items')
    } else if (input?.['type'] !== 'text') issues.push('question input is invalid')
  }
  if (kind === 'review' && card['hideReferenceUntilSubmitted'] !== true) issues.push('review reference must stay hidden')
  return issues
}

function validateEvidence(value: unknown): string[] {
  const evidence = record(value)
  if (evidence === null) return ['evidence must be an object']
  const issues: string[] = []
  if (!Array.isArray(evidence['proven']) || !Array.isArray(evidence['notYetProven']) || !Array.isArray(evidence['evidenceRefs'])) {
    issues.push('evidence arrays are invalid')
  }
  if (!['independent', 'prompted', 'taught-after-attempt', 'unknown'].includes(String(evidence['independence']))) issues.push('evidence independence is invalid')
  if (!['sufficient', 'partial', 'insufficient'].includes(String(evidence['confidence']))) issues.push('evidence confidence is invalid')
  if (!nonEmpty(evidence['routeExplanation'])) issues.push('evidence routeExplanation is required')
  return issues
}

export function validateStepExecutionResult(value: unknown, expected: ValidationContext): ProjectionValidation {
  const result = record(value)
  if (result === null) return { ok: false, issues: ['result must be an object'] }
  const issues: string[] = []
  if (result['schemaVersion'] !== DOMAIN_SCHEMA_VERSION) issues.push('schemaVersion mismatch')
  if (result['operationId'] !== expected.operationId) issues.push('operationId mismatch')
  if (result['projectId'] !== expected.projectId) issues.push('projectId mismatch')
  if (result['stepId'] !== expected.stepId) issues.push('stepId mismatch')
  const outcome = result['outcome']
  if (outcome === 'needs-user-input' || outcome === 'ready-for-action') issues.push(...validateCard(result['card']))
  else if (outcome === 'completed') {
    issues.push(...validateEvidence(result['evidence']))
    if (!Array.isArray(result['proposedMutations'])) issues.push('proposedMutations must be an array')
    if (!nonEmpty(result['nextActionLabel'])) issues.push('nextActionLabel is required')
  } else if (outcome === 'needs-reinforcement') {
    issues.push(...validateEvidence(result['evidence']))
    if (record(result['reinforcement']) === null) issues.push('reinforcement is required')
    if (!Array.isArray(result['proposedMutations'])) issues.push('proposedMutations must be an array')
  } else if (outcome === 'recoverable-error') {
    if (!nonEmpty(result['errorCode']) || !nonEmpty(result['learnerMessage']) || !nonEmpty(result['retryActionLabel'])) {
      issues.push('recoverable error copy is incomplete')
    }
  } else issues.push('outcome is invalid')
  return issues.length === 0 ? { ok: true, value: value as StepExecutionResult } : { ok: false, issues }
}

export async function projectWithOneStructureRepair(
  initial: unknown,
  expected: ValidationContext,
  repair: (invalid: unknown, issues: readonly string[]) => Promise<unknown>,
): Promise<ProjectionValidation & { repaired: boolean }> {
  const first = validateStepExecutionResult(initial, expected)
  if (first.ok) return { ...first, repaired: false }
  const repaired = validateStepExecutionResult(await repair(initial, first.issues), expected)
  return { ...repaired, repaired: true }
}
