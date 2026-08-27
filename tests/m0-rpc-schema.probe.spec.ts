import { describe, expect, it } from 'vitest'
import {
  createLearningRequest,
  LEARNING_SCHEMA_VERSION,
  type ProjectSummaryViewModel,
} from '../packages/dsh-visual-learner/src-v01/protocol/index.ts'
import {
  validateEnvelope,
  validateLearnerViewModel,
  validateRelativePath,
} from '../packages/dsh-visual-learner/src-v01/host/rpc-guard.ts'

describe('M0-3 RPC and schema probe', () => {
  it('uses one schemaVersion for Client requests and Host validation', () => {
    const request = createLearningRequest({ projectId: 'project-1' })
    expect(request.schemaVersion).toBe('0.2.0')
    expect(validateEnvelope(request)).toEqual({ ok: true, value: request })
    expect(validateEnvelope({ schemaVersion: '0.1.0', payload: {} })).toMatchObject({
      ok: false,
      error: { code: 'SCHEMA_MISMATCH' },
    })
  })

  it('rejects absolute and traversal paths while normalizing an allowed relative path', () => {
    expect(validateRelativePath('learning-records/0001.md')).toEqual({ ok: true, value: 'learning-records/0001.md' })
    expect(validateRelativePath('learning-records\\0001.md')).toEqual({ ok: true, value: 'learning-records/0001.md' })
    expect(validateRelativePath('C:\\private\\secret.txt')).toMatchObject({ ok: false, error: { code: 'PATH_OUTSIDE_ROOT' } })
    expect(validateRelativePath('/private/secret.txt')).toMatchObject({ ok: false, error: { code: 'PATH_OUTSIDE_ROOT' } })
    expect(validateRelativePath('../secret.txt')).toMatchObject({ ok: false, error: { code: 'PATH_OUTSIDE_ROOT' } })
  })

  it('accepts a learner ViewModel and rejects internal Session, Skill, RPC, raw-output, and path fields', () => {
    const view: ProjectSummaryViewModel = {
      schemaVersion: LEARNING_SCHEMA_VERSION,
      projectId: 'project-1',
      title: '学会判断一手资料',
      goal: '完成一篇可靠的研究文章',
      status: 'active',
      currentStep: {
        stepId: 'step-4',
        title: '用三条真实材料做判断',
        purpose: '验证是否能把规则用于真实材料',
        primaryActionKey: 'start-step',
      },
      completedStepCount: 3,
      reviewDueCount: 0,
    }
    expect(validateLearnerViewModel(view)).toEqual({ ok: true, value: view })
    for (const leaked of [
      { ...view, sessionId: 'hidden-session' },
      { ...view, skillName: 'teach-me' },
      { ...view, rawOutput: 'model text' },
      { ...view, nested: { rpcName: 'project.read' } },
      { ...view, nested: { absolutePath: 'C:\\secret' } },
    ]) {
      expect(validateLearnerViewModel(leaked)).toMatchObject({
        ok: false,
        error: { code: 'VIEWMODEL_INTERNAL_LEAK' },
      })
    }
  })
})
