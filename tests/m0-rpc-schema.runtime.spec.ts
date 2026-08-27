import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import TypertGateway from '@deepseek-ai/dsh-api-gateway'
import TypertRegistry from '@deepseek-ai/dsh-typert-registry'
import { LearningPanelService } from '../packages/dsh-visual-learner/src-v01/host/learning-panel-service.ts'
import { requestProjectSnapshot } from '../packages/dsh-visual-learner/src-v01/client/learning-rpc.ts'
import { createLearningRequest } from '../packages/dsh-visual-learner/src-v01/protocol/index.ts'

async function harness(): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(TypertRegistry)
  await ctx.plugin(TypertGateway)
  ctx.provide('agents', {} as never)
  ctx.provide('agentDefaultModel', { currentSelection: () => ({ provider: 'test', model: 'test' }) } as never)
  ctx.provide('sessions', { get: () => undefined } as never)
  ctx.provide('sessionPersistence', {} as never)
  await ctx.plugin(LearningPanelService)
  return ctx
}

describe('M0-3 actual Typert RPC boundary', () => {
  it('dispatches the custom Host method through the official gateway and returns only a learner-safe error', async () => {
    const ctx = await harness()
    const result = await ctx.typertGateway.invoke({
      namespace: 'learning-panel',
      method: 'snapshot',
      args: { request: createLearningRequest({ projectId: 'project-one', currentSessionId: 'missing-current' }) },
    })
    expect(result).toMatchObject({ ok: false, error: { code: 'PROJECT_NOT_FOUND' } })
    expect(JSON.stringify(result)).not.toMatch(/sessionId|skillName|rawOutput|absolutePath/u)
    await ctx.fiber.dispose()
  })

  it('keeps schema mismatches in the learner-safe business error union', async () => {
    const ctx = await harness()
    await expect(ctx.typertGateway.invoke({
      namespace: 'learning-panel',
      method: 'snapshot',
      args: { request: { schemaVersion: 'old', payload: { projectId: 'project-one' } } },
    })).resolves.toMatchObject({ ok: false, error: { code: 'SCHEMA_MISMATCH' } })
    await ctx.fiber.dispose()
  })

  it('uses the same endpoint and envelope from the Client helper', async () => {
    const rpc = {
      call: async (_channel: '/api', endpoint: 'learning-panel/snapshot', _payload: { args: { request: unknown } }) => ({
        ok: true as const,
        value: { ok: true as const, value: { schemaVersion: '0.2.0', project: { projectId: 'client-project' }, route: { steps: [] }, feedback: null, endpoint } },
      }),
    }
    await expect(requestProjectSnapshot(rpc, 'client-project', 'current-session')).resolves.toMatchObject({
      ok: true,
      value: { schemaVersion: '0.2.0', project: { projectId: 'client-project' } },
    })
  })
})
