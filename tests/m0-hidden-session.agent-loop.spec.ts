import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import LlmRuntime, { createUserMessage } from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { MockLlmAdapter, textResponse } from './helpers/mock-llm-adapter.ts'

const temporaryRoots: string[] = []

afterEach(async () => {
  for (const root of temporaryRoots.splice(0)) await rm(root, { recursive: true, force: true })
})

async function mount(root: string, adapter: MockLlmAdapter): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(AgentLoop, { agents: [] })
  await ctx.plugin(JsonlSessionPersistence, { root })
  ctx.llm.registerAdapter(['m0-mock'], adapter)
  return ctx
}

describe('M0-1 actual AgentLoop hidden Session lifecycle', () => {
  it('creates from the first frame as subagent-origin, drives through the owned handle, and resumes durably', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-visual-m0-agent-loop-'))
    temporaryRoots.push(root)
    const hiddenId = SessionId('learning-product-session')
    const ownerId = SessionId('learning-product-owner')

    const firstAdapter = new MockLlmAdapter([textResponse('first turn complete')])
    const first = await mount(root, firstAdapter)
    const observed: Array<{ type: string; origin?: string; parent?: string }> = []
    first.on('session/created', session => observed.push({
      type: 'session/created',
      origin: session.header.origin,
      parent: session.header.parentSession,
    }))
    first.on('agent/created', ({ agent }) => observed.push({
      type: 'agent/created',
      origin: agent.session.header.origin,
      parent: agent.session.header.parentSession,
    }))

    const firstHandle = await first.agents.withoutInitiator(() => first.agents.create({
      sessionId: hiddenId,
      meta: {
        cwd: root,
        parentSession: ownerId,
        origin: 'subagent',
        delegationDepth: 1,
      },
      agentOptions: { provider: 'm0-mock', model: 'm0-model' },
    }))

    expect(observed).toEqual([
      { type: 'session/created', origin: 'subagent', parent: ownerId },
      { type: 'agent/created', origin: 'subagent', parent: ownerId },
    ])
    expect(firstHandle.agent.session.header).toMatchObject({
      id: hiddenId,
      origin: 'subagent',
      parentSession: ownerId,
      cwd: root,
    })

    firstHandle.agent.followup(createUserMessage({
      content: [{ type: 'text', text: 'product-owned direct delivery' }],
      source: { kind: 'plugin', plugin: 'dsh-visual-learner' },
    }))
    await firstHandle.agent.whenIdle()
    expect(firstAdapter.requests).toHaveLength(1)
    await first.sessions.flush(firstHandle.agent.session)
    await first.fiber.dispose()

    const secondAdapter = new MockLlmAdapter([textResponse('second turn complete')])
    const second = await mount(root, secondAdapter)
    const resumedHandle = await second.agents.withoutInitiator(() => second.agents.resume({
      resumeSessionId: hiddenId,
      agentOptions: { provider: 'm0-mock', model: 'm0-model' },
    }))
    expect(resumedHandle.agent.session.header).toMatchObject({
      id: hiddenId,
      origin: 'subagent',
      parentSession: ownerId,
      cwd: root,
    })
    expect(resumedHandle.agent.session.deriveMessages()).toHaveLength(2)

    resumedHandle.agent.followup(createUserMessage({
      content: [{ type: 'text', text: 'product-owned delivery after restart' }],
      source: { kind: 'plugin', plugin: 'dsh-visual-learner' },
    }))
    await resumedHandle.agent.whenIdle()
    expect(secondAdapter.requests).toHaveLength(1)
    expect(resumedHandle.agent.session.deriveMessages()).toHaveLength(4)
    await second.fiber.dispose()
  })
})
