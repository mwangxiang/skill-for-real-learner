import { describe, expect, it } from 'vitest'
import { commitTransaction } from '../packages/dsh-visual-learner/src-v01/domain/reducer.ts'
import { addLocalDays, nextReviewInterval, recordReviewResult } from '../packages/dsh-visual-learner/src-v01/domain/review.ts'
import { DomainError, type ReviewEntry } from '../packages/dsh-visual-learner/src-v01/domain/types.ts'
import { aggregate, at, evidence, operation, step } from './helpers/m1-fixtures.ts'

function commit(current: ReturnType<typeof aggregate>, id: string, mutations: Parameters<typeof commitTransaction>[1]['mutations']) {
  return commitTransaction(current, { operation: operation(id, current.project.revision), mutations, timestamp: at }).aggregate
}

describe('M1 legal mutations and state machine', () => {
  it('does not auto-start a planned route and advances only through explicit lifecycle actions', () => {
    let state = aggregate()
    expect(state.project.currentStepId).toBeNull()
    state = commit(state, 'op-active', [{ type: 'transition-step', stepId: 'step-1', to: 'active', reason: '用户开始第一步' }])
    state = commit(state, 'op-running', [{ type: 'transition-step', stepId: 'step-1', to: 'running', reason: '用户提交动作' }])
    state = commit(state, 'op-complete', [{ type: 'complete', targetStepId: 'step-1', evidence, reason: '证据达到本步标准' }])
    expect(state.steps['step-1']).toMatchObject({ state: 'completed', resultSummary: evidence.routeExplanation })
    expect(state.project.currentStepId).toBeNull()
    expect(state.steps['step-2']?.state).toBe('conditional')
  })

  it('supports insert, pause/resume, replace, skip, reorder, review scheduling and archive', () => {
    let state = aggregate()
    state = commit(state, 'op-insert', [{ type: 'insert-after', anchorStepId: 'step-1', step: step('step-extra'), reason: '需要一项现实行动' }])
    state = commit(state, 'op-pause', [{ type: 'pause', targetStepId: 'step-extra', reason: '先处理补强' }])
    state = commit(state, 'op-resume', [{ type: 'resume', targetStepId: 'step-extra', reason: '继续原路线' }])
    state = commit(state, 'op-replace', [{ type: 'replace', targetStepId: 'step-extra', step: step('step-replacement'), reason: '换成更小的动作' }])
    state = commit(state, 'op-skip', [{ type: 'skip', targetStepId: 'step-replacement', reason: '用户确认当前不需要' }])
    state = commit(state, 'op-active', [{ type: 'transition-step', stepId: 'step-1', to: 'active', reason: '开始' }])
    state = commit(state, 'op-running', [{ type: 'transition-step', stepId: 'step-1', to: 'running', reason: '提交' }])
    state = commit(state, 'op-complete', [{ type: 'complete', targetStepId: 'step-1', evidence, reason: '达标' }])
    const review: ReviewEntry = {
      id: 'review-1', projectId: 'project-1', sourceStepId: 'step-1', claim: '能独立解释核心判断',
      dueDate: '2026-08-29', timezone: 'Asia/Shanghai', intervalDays: 3, state: 'scheduled', history: [],
    }
    const reviewStep = { ...step('step-review', 'scheduled', ['step-1']), kind: 'review' as const, stage: 'reproduce' as const, sourceStepId: 'step-1' }
    state = commit(state, 'op-review', [{ type: 'schedule-review', review, step: reviewStep, reason: '三天后复现' }])
    state = commit(state, 'op-reorder', [{ type: 'reorder', orderedStepIds: ['step-1', 'step-2', 'step-replacement', 'step-review'], reason: '把复现放到路线末尾' }])
    state = commit(state, 'op-archive', [{ type: 'archive-project', reason: '用户主动归档' }])
    expect(state.project.status).toBe('archived')
    expect(state.reviews['review-1']).toMatchObject({ intervalDays: 3, state: 'scheduled' })
    expect(state.route.stepOrder).toEqual(['step-1', 'step-2', 'step-replacement', 'step-review'])
  })

  it('deduplicates operation replay before CAS and rejects stale or illegal mutations', () => {
    const first = commitTransaction(aggregate(), {
      operation: operation('same-op', 0),
      mutations: [{ type: 'transition-step', stepId: 'step-1', to: 'active', reason: '开始' }],
      timestamp: at,
    })
    const replay = commitTransaction(first.aggregate, {
      operation: operation('same-op', 0),
      mutations: [{ type: 'transition-step', stepId: 'step-1', to: 'active', reason: '重复网络请求' }],
      timestamp: at,
    })
    expect(replay.deduplicated).toBe(true)
    expect(replay.aggregate.project.revision).toBe(1)
    expect(() => commitTransaction(first.aggregate, {
      operation: operation('stale-op', 0), mutations: [], timestamp: at,
    })).toThrow(expect.objectContaining<Partial<DomainError>>({ code: 'REVISION_CONFLICT' }))
    expect(() => commit(aggregate(), 'bad-complete', [{ type: 'complete', targetStepId: 'step-1', evidence, reason: '并未运行' }]))
      .toThrow(expect.objectContaining<Partial<DomainError>>({ code: 'INVALID_TRANSITION' }))
    expect(() => commit(aggregate(), 'bad-duplicate', [{ type: 'insert-after', anchorStepId: 'step-1', step: step('step-2'), reason: '重复' }]))
      .toThrow(expect.objectContaining<Partial<DomainError>>({ code: 'DUPLICATE_ID' }))
    expect(() => commit(aggregate(), 'bad-reorder', [{ type: 'reorder', orderedStepIds: ['step-2', 'step-1'], reason: '破坏前置关系' }]))
      .toThrow(expect.objectContaining<Partial<DomainError>>({ code: 'INVALID_MUTATION' }))
    expect(() => commit(aggregate(), 'bad-reason', [{ type: 'skip', targetStepId: 'step-1', reason: '' }]))
      .toThrow(expect.objectContaining<Partial<DomainError>>({ code: 'INVALID_MUTATION' }))
  })
})

describe('M1 local-date review schedule', () => {
  it('uses local calendar dates and the 3/7/21 ladder', () => {
    expect(addLocalDays('2026-02-27', 3)).toBe('2026-03-02')
    expect(nextReviewInterval(3, 'met')).toBe(7)
    expect(nextReviewInterval(7, 'met')).toBe(21)
    expect(nextReviewInterval(21, 'met')).toBe(21)
    expect(nextReviewInterval(21, 'partial')).toBe(3)
    const review: ReviewEntry = {
      id: 'r', projectId: 'project-1', sourceStepId: 'step-1', claim: 'claim', dueDate: '2026-08-29',
      timezone: 'Asia/Shanghai', intervalDays: 3, state: 'due', history: [],
    }
    expect(recordReviewResult(review, '2026-08-29', 'met')).toMatchObject({ intervalDays: 7, dueDate: '2026-09-05', state: 'scheduled' })
    expect(recordReviewResult({ ...review, intervalDays: 21 }, '2026-08-29', 'insufficient')).toMatchObject({ intervalDays: 3, dueDate: '2026-09-01' })
  })
})
