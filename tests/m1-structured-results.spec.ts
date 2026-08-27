import { describe, expect, it, vi } from 'vitest'
import { projectWithOneStructureRepair, validateStepExecutionResult } from '../packages/dsh-visual-learner/src-v01/domain/structured-results.ts'

const expected = { operationId: 'op-1', projectId: 'project-1', stepId: 'step-1' }
const base = {
  schemaVersion: '0.2.0', operationId: 'op-1', projectId: 'project-1', stepId: 'step-1',
  outcome: 'needs-user-input', artifactRefs: [],
  card: {
    cardId: 'card-1', kind: 'question', title: '先说清问题', purpose: '确定真正目标',
    completionEvidence: '给出一个明确回答', primaryActionKey: 'answer-question', secondaryActionKey: null,
    estimatedMinutes: 3, details: [], prompt: '你今天真正要解决什么？',
    input: { type: 'single-choice', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] },
  },
}

describe('M1 StepExecutionResult adapter validation', () => {
  it('accepts a valid card but rejects model-controlled ids, actions and oversized choices', () => {
    expect(validateStepExecutionResult(base, expected).ok).toBe(true)
    expect(validateStepExecutionResult({ ...base, operationId: 'model-op' }, expected)).toMatchObject({ ok: false })
    expect(validateStepExecutionResult({ ...base, card: { ...base.card, primaryActionKey: 'run-arbitrary-command' } }, expected)).toMatchObject({ ok: false })
    expect(validateStepExecutionResult({ ...base, card: { ...base.card, input: { type: 'single-choice', options: [1, 2, 3, 4] } } }, expected)).toMatchObject({ ok: false })
  })

  it('performs at most one structure-only repair and fails closed when the repair is still invalid', async () => {
    const repair = vi.fn().mockResolvedValue(base)
    await expect(projectWithOneStructureRepair({ bad: true }, expected, repair)).resolves.toMatchObject({ ok: true, repaired: true })
    expect(repair).toHaveBeenCalledTimes(1)
    const badRepair = vi.fn().mockResolvedValue({ still: 'bad' })
    await expect(projectWithOneStructureRepair({ bad: true }, expected, badRepair)).resolves.toMatchObject({ ok: false, repaired: true })
    expect(badRepair).toHaveBeenCalledTimes(1)
  })
})
