import { describe, expect, it } from 'vitest'
import { CAPABILITY_ROUTE_MAP, LOCKED_CAPABILITY_NAMES } from '../packages/dsh-visual-learner/src-v01/domain/capability-map.ts'
import { validateLearnerViewModel } from '../packages/dsh-visual-learner/src-v01/host/rpc-guard.ts'

describe('M4 internal capability coverage registry', () => {
  it('maps every locked capability exactly once into learner route concepts', () => {
    expect(CAPABILITY_ROUTE_MAP.map(item => item.capability).sort()).toEqual([...LOCKED_CAPABILITY_NAMES].sort())
    expect(new Set(CAPABILITY_ROUTE_MAP.map(item => item.capability)).size).toBe(10)
    expect(new Set(CAPABILITY_ROUTE_MAP.flatMap(item => item.templates))).toEqual(new Set(['concept', 'real-problem', 'long-capability', 'recovered']))
  })

  it('keeps internal capability vocabulary out of a learner projection', () => {
    for (const mapping of CAPABILITY_ROUTE_MAP) {
      const view = { title: mapping.learnerPurpose, stage: mapping.stage, kind: mapping.kind }
      expect(validateLearnerViewModel(view)).toMatchObject({ ok: true })
      expect(JSON.stringify(view)).not.toContain(mapping.capability)
    }
  })
})
