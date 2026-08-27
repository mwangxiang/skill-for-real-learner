import { markReviewDue, recordReviewResult } from './review.ts'
import {
  DOMAIN_SCHEMA_VERSION,
  DomainError,
  type DomainMutation,
  type LearningAggregate,
  type LearningEvent,
  type Operation,
  type ProjectManifest,
  type ProjectRoute,
  type RouteStep,
  type StepState,
  type TransactionEvent,
} from './types.ts'

const transitions: Record<StepState, ReadonlySet<StepState>> = {
  conditional: new Set(['planned', 'skipped']),
  planned: new Set(['active', 'skipped', 'paused']),
  active: new Set(['running', 'waiting-user', 'paused', 'failed-recoverable']),
  'waiting-user': new Set(['running', 'paused', 'failed-recoverable']),
  running: new Set(['completed', 'needs-reinforcement', 'failed-recoverable', 'paused']),
  completed: new Set(),
  'needs-reinforcement': new Set(['paused', 'completed']),
  scheduled: new Set(['planned', 'skipped']),
  paused: new Set(['planned']),
  skipped: new Set(),
  'failed-recoverable': new Set(['running', 'paused']),
}

export interface CommitInput {
  operation: Operation
  mutations: DomainMutation[]
  timestamp: string
}

export interface CommitResult {
  aggregate: LearningAggregate
  event: TransactionEvent | null
  deduplicated: boolean
}

export function createAggregate(
  manifest: ProjectManifest,
  route: ProjectRoute,
  steps: RouteStep[],
  goal = '',
): LearningAggregate {
  if (manifest.schemaVersion !== DOMAIN_SCHEMA_VERSION) throw new DomainError('UNKNOWN_SCHEMA', manifest.schemaVersion)
  if (route.stepOrder.length !== steps.length || new Set(route.stepOrder).size !== steps.length) {
    throw new DomainError('INVALID_MUTATION', 'initial route order must name every step exactly once')
  }
  const byId = Object.fromEntries(steps.map(step => [step.id, structuredClone(step)]))
  for (const id of route.stepOrder) if (byId[id] === undefined) throw new DomainError('INVALID_MUTATION', `missing initial step ${id}`)
  validatePrerequisites(route.stepOrder, byId)
  return {
    project: {
      schemaVersion: DOMAIN_SCHEMA_VERSION,
      id: manifest.projectId,
      title: manifest.title,
      goal,
      locale: manifest.locale,
      status: 'active',
      routeId: route.id,
      currentStepId: route.currentStepId,
      reviewDueCount: 0,
      revision: route.revision,
      createdAt: manifest.createdAt,
      updatedAt: manifest.createdAt,
    },
    route: structuredClone(route),
    steps: byId,
    reviews: {},
    operations: {},
  }
}

function requireReason(mutation: DomainMutation): void {
  if ('reason' in mutation && mutation.reason.trim() === '') {
    throw new DomainError('INVALID_MUTATION', `${mutation.type} requires a reason`)
  }
}

function requireStep(aggregate: LearningAggregate, id: string): RouteStep {
  const step = aggregate.steps[id]
  if (step === undefined) throw new DomainError('INVALID_MUTATION', `unknown step ${id}`)
  return step
}

function validateNewStep(aggregate: LearningAggregate, step: RouteStep): void {
  if (aggregate.steps[step.id] !== undefined) throw new DomainError('DUPLICATE_ID', `duplicate step ${step.id}`)
  if (step.projectId !== aggregate.project.id) throw new DomainError('INVALID_MUTATION', 'step belongs to another project')
  if (!['conditional', 'planned', 'scheduled'].includes(step.state)) {
    throw new DomainError('INVALID_TRANSITION', `new step cannot start at ${step.state}`)
  }
  for (const prerequisite of step.prerequisites) requireStep(aggregate, prerequisite)
}

function validatePrerequisites(order: string[], steps: Record<string, RouteStep>): void {
  const position = new Map(order.map((id, index) => [id, index]))
  for (const id of order) {
    const step = steps[id]
    if (step === undefined) throw new DomainError('INVALID_MUTATION', `route references missing step ${id}`)
    for (const prerequisite of step.prerequisites) {
      const prerequisitePosition = position.get(prerequisite)
      if (prerequisitePosition === undefined || prerequisitePosition >= position.get(id)!) {
        throw new DomainError('INVALID_MUTATION', `prerequisite ${prerequisite} must precede ${id}`)
      }
    }
  }
}

function insertAt(aggregate: LearningAggregate, step: RouteStep, index: number): void {
  validateNewStep(aggregate, step)
  aggregate.steps[step.id] = structuredClone(step)
  aggregate.route.stepOrder.splice(index, 0, step.id)
  validatePrerequisites(aggregate.route.stepOrder, aggregate.steps)
}

function transitionStep(aggregate: LearningAggregate, stepId: string, to: StepState): void {
  const step = requireStep(aggregate, stepId)
  if (!transitions[step.state].has(to)) {
    throw new DomainError('INVALID_TRANSITION', `${step.state} cannot transition to ${to}`)
  }
  if (to === 'active') {
    if (aggregate.project.currentStepId !== null && aggregate.project.currentStepId !== stepId) {
      throw new DomainError('INVALID_TRANSITION', 'another step is already current')
    }
    for (const prerequisite of step.prerequisites) {
      const state = requireStep(aggregate, prerequisite).state
      if (state !== 'completed' && state !== 'skipped') {
        throw new DomainError('INVALID_TRANSITION', `prerequisite ${prerequisite} is incomplete`)
      }
    }
    aggregate.project.currentStepId = stepId
    aggregate.route.currentStepId = stepId
  }
  if (to === 'completed' || to === 'skipped' || to === 'paused') {
    if (aggregate.project.currentStepId === stepId) {
      aggregate.project.currentStepId = null
      aggregate.route.currentStepId = null
    }
  }
  step.state = to
  step.revision += 1
}

function applyMutation(aggregate: LearningAggregate, mutation: DomainMutation): void {
  requireReason(mutation)
  switch (mutation.type) {
    case 'insert-before': {
      const index = aggregate.route.stepOrder.indexOf(mutation.anchorStepId)
      if (index < 0) throw new DomainError('INVALID_MUTATION', 'insert anchor not found')
      insertAt(aggregate, mutation.step, index)
      return
    }
    case 'insert-after': {
      const index = aggregate.route.stepOrder.indexOf(mutation.anchorStepId)
      if (index < 0) throw new DomainError('INVALID_MUTATION', 'insert anchor not found')
      insertAt(aggregate, mutation.step, index + 1)
      return
    }
    case 'replace': {
      const index = aggregate.route.stepOrder.indexOf(mutation.targetStepId)
      if (index < 0) throw new DomainError('INVALID_MUTATION', 'replace target not found')
      const old = requireStep(aggregate, mutation.targetStepId)
      if (old.state === 'completed' || old.state === 'skipped') throw new DomainError('INVALID_TRANSITION', 'settled step cannot be replaced')
      validateNewStep(aggregate, mutation.step)
      old.state = 'paused'
      old.revision += 1
      aggregate.steps[mutation.step.id] = structuredClone(mutation.step)
      aggregate.route.stepOrder[index] = mutation.step.id
      if (aggregate.project.currentStepId === old.id) {
        aggregate.project.currentStepId = null
        aggregate.route.currentStepId = null
      }
      validatePrerequisites(aggregate.route.stepOrder, aggregate.steps)
      return
    }
    case 'pause':
      transitionStep(aggregate, mutation.targetStepId, 'paused')
      return
    case 'resume':
      transitionStep(aggregate, mutation.targetStepId, 'planned')
      return
    case 'skip':
      transitionStep(aggregate, mutation.targetStepId, 'skipped')
      return
    case 'complete': {
      transitionStep(aggregate, mutation.targetStepId, 'completed')
      const step = requireStep(aggregate, mutation.targetStepId)
      step.resultSummary = mutation.evidence.routeExplanation
      return
    }
    case 'schedule-review':
      if (mutation.review.projectId !== aggregate.project.id || mutation.step.projectId !== aggregate.project.id) {
        throw new DomainError('INVALID_MUTATION', 'review belongs to another project')
      }
      if (aggregate.reviews[mutation.review.id] !== undefined) throw new DomainError('DUPLICATE_ID', 'duplicate review')
      if (requireStep(aggregate, mutation.review.sourceStepId).state !== 'completed') {
        throw new DomainError('INVALID_TRANSITION', 'review source must be completed')
      }
      if (mutation.step.state !== 'scheduled' || mutation.step.sourceStepId !== mutation.review.sourceStepId) {
        throw new DomainError('INVALID_MUTATION', 'review step must be scheduled and linked to its source')
      }
      aggregate.reviews[mutation.review.id] = structuredClone(mutation.review)
      insertAt(aggregate, mutation.step, aggregate.route.stepOrder.length)
      return
    case 'reorder':
      if (mutation.orderedStepIds.length !== aggregate.route.stepOrder.length
        || new Set(mutation.orderedStepIds).size !== aggregate.route.stepOrder.length
        || mutation.orderedStepIds.some(id => !aggregate.route.stepOrder.includes(id))) {
        throw new DomainError('INVALID_MUTATION', 'reorder must contain the exact route step set')
      }
      validatePrerequisites(mutation.orderedStepIds, aggregate.steps)
      aggregate.route.stepOrder = [...mutation.orderedStepIds]
      aggregate.route.lastReplannedAt = aggregate.project.updatedAt
      return
    case 'archive-project':
      aggregate.project.status = 'archived'
      aggregate.project.currentStepId = null
      aggregate.route.currentStepId = null
      return
    case 'transition-step':
      transitionStep(aggregate, mutation.stepId, mutation.to)
      return
    case 'record-review-result': {
      const review = aggregate.reviews[mutation.reviewId]
      if (review === undefined) throw new DomainError('INVALID_MUTATION', 'review not found')
      aggregate.reviews[review.id] = recordReviewResult(review, mutation.localDate, mutation.result)
      return
    }
  }
}

export function commitTransaction(current: LearningAggregate, input: CommitInput): CommitResult {
  const prior = current.operations[input.operation.id]
  if (prior !== undefined) return { aggregate: structuredClone(current), event: null, deduplicated: true }
  if (input.operation.projectId !== current.project.id) throw new DomainError('INVALID_MUTATION', 'operation belongs to another project')
  if (input.operation.expectedRevision !== current.project.revision) {
    throw new DomainError('REVISION_CONFLICT', `expected ${input.operation.expectedRevision}, current ${current.project.revision}`)
  }
  if (input.operation.status !== 'queued' && input.operation.status !== 'running' && input.operation.status !== 'waiting-user') {
    throw new DomainError('INVALID_MUTATION', 'only an open operation can commit')
  }
  const next = structuredClone(current)
  for (const mutation of input.mutations) applyMutation(next, mutation)
  const revision = current.project.revision + 1
  next.project.revision = revision
  next.project.updatedAt = input.timestamp
  next.route.revision = revision
  const committed: Operation = { ...structuredClone(input.operation), status: 'committed', committedAt: input.timestamp, errorCode: null }
  next.operations[committed.id] = committed
  next.project.reviewDueCount = Object.values(next.reviews).filter(review => review.state === 'due').length
  return {
    aggregate: next,
    deduplicated: false,
    event: {
      schemaVersion: DOMAIN_SCHEMA_VERSION,
      event: 'transaction-committed',
      projectId: current.project.id,
      operationId: committed.id,
      expectedRevision: current.project.revision,
      revision,
      timestamp: input.timestamp,
      mutations: structuredClone(input.mutations),
      operation: committed,
    },
  }
}

export function rebuild(initial: LearningAggregate, events: readonly TransactionEvent[], today?: string): LearningAggregate {
  let aggregate = structuredClone(initial)
  const seen = new Set<string>()
  for (const event of events) {
    if (event.schemaVersion !== DOMAIN_SCHEMA_VERSION) throw new DomainError('UNKNOWN_SCHEMA', event.schemaVersion)
    if (seen.has(event.operationId)) continue
    const result = commitTransaction(aggregate, {
      operation: { ...event.operation, status: 'running', committedAt: null },
      mutations: event.mutations,
      timestamp: event.timestamp,
    })
    if (result.event?.revision !== event.revision) throw new DomainError('REVISION_CONFLICT', 'event revision is not contiguous')
    aggregate = result.aggregate
    seen.add(event.operationId)
  }
  if (today !== undefined) {
    aggregate.reviews = Object.fromEntries(Object.entries(aggregate.reviews).map(([id, review]) => [id, markReviewDue(review, today)]))
    aggregate.project.reviewDueCount = Object.values(aggregate.reviews).filter(review => review.state === 'due').length
  }
  return aggregate
}

export function rebuildFromEvents(events: readonly LearningEvent[], today?: string): LearningAggregate {
  const first = events[0]
  if (first === undefined || first.event !== 'project-created') {
    throw new DomainError('INVALID_MUTATION', 'event log must start with project-created')
  }
  if (first.schemaVersion !== DOMAIN_SCHEMA_VERSION) throw new DomainError('UNKNOWN_SCHEMA', first.schemaVersion)
  if (events.slice(1).some(event => event.event === 'project-created')) {
    throw new DomainError('INVALID_MUTATION', 'event log contains multiple project-created records')
  }
  return rebuild(
    createAggregate(first.manifest, first.route, first.steps, first.goal),
    events.slice(1) as TransactionEvent[],
    today,
  )
}
