import { mkdirSync, mkdtempSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry, { Inbox } from '@deepseek-ai/dsh-agent'
import type { Agent, AgentFactory } from '@deepseek-ai/dsh-agent'
import { createApiProxy } from '@deepseek-ai/dsh-host-apiproxy'
import type { HostFrame, WorkspaceId } from '@deepseek-ai/dsh-host-apiproxy/api'
import type { RpcRequest, RpcResponse } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import { RpcId } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import type { Session, SessionHeader } from '@deepseek-ai/dsh-session'
import Storage from '@deepseek-ai/dsh-storage'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import WorkspaceRegistry from '@deepseek-ai/dsh-workspace'
import { MemoryMediaPool, MemoryStorageBackend } from './helpers/memory-storage-backend.ts'

let nextRpc = 1

function request<P>(payload: P): RpcRequest<P> {
  return { rpcId: RpcId(`m0-hidden-${String(nextRpc++)}`), payload }
}

function expectOk<T>(response: RpcResponse<T>): T {
  expect(response.result.ok).toBe(true)
  if (!response.result.ok) throw new Error(response.result.error.message)
  return response.result.value
}

function stubAgent(session: Session, sent: unknown[]): Agent {
  return {
    id: session.id,
    options: {},
    session,
    inbox: new Inbox(session, { inserted: () => {}, discarded: () => {}, claimed: () => {} }),
    status: 'idle',
    ctx: new Context(),
    send: (message, target, wakeup) => { sent.push({ message, target, wakeup }) },
    followup: () => {},
    steer: () => ({ outcome: Promise.resolve({ status: 'rejected' as const }) }),
    inject: () => {},
    cancel: () => {},
    runMaintenance: job => job(new AbortController().signal),
    whenIdle: () => Promise.resolve(),
  }
}

interface RehydratedSession {
  id: SessionId
  cwd: string
}

async function harness(options: {
  root?: string
  pool?: MemoryMediaPool
  rehydrate?: RehydratedSession[]
} = {}) {
  const root = options.root ?? realpathSync.native(mkdtempSync(join(tmpdir(), 'dsh-visual-m0-hidden-')))
  const pool = options.pool ?? new MemoryMediaPool()
  const sent: unknown[] = []
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(UserQuestionService)
  await ctx.plugin(Storage)
  const backend = new MemoryStorageBackend(pool)
  ctx.storage.backend.register('memory', backend)
  const storageDomain = new DomainFacility(ctx, { backend: 'memory', routes: {} })
  ctx.storage.mount('domain', storageDomain)
  ctx.provide('storageDomain', storageDomain)
  const persisted: SessionHeader[] = (options.rehydrate ?? []).map(item => ({
    version: 0,
    id: item.id,
    cwd: item.cwd,
    createdAt: 0,
  }))
  ctx.provide('sessionPersistence', {
    list: () => Promise.resolve(persisted),
    load: () => { throw new Error('M0 probe does not load event bodies') },
    inspect: () => { throw new Error('M0 probe does not inspect event bodies') },
  } as never)
  await ctx.plugin(WorkspaceRegistry)

  const factory: AgentFactory = {
    async createAgent(_ownerCtx, createOptions) {
      const session = ctx.sessions.create(
        createOptions.sessionId,
        createOptions.meta === undefined ? {} : { meta: createOptions.meta },
      )
      const agent = stubAgent(session, sent)
      const unregister = ctx.agents.register(agent)
      return { agent, dispose: () => { unregister(); return Promise.resolve() } }
    },
    async resume(_ownerCtx, resumeOptions) {
      const restored = options.rehydrate?.find(item => item.id === resumeOptions.resumeSessionId)
      if (restored === undefined) throw new Error(`missing persisted fixture ${resumeOptions.resumeSessionId}`)
      const session = ctx.sessions.create(restored.id, { meta: { cwd: restored.cwd } })
      const agent = stubAgent(session, sent)
      const unregister = ctx.agents.register(agent)
      return { agent, dispose: () => { unregister(); return Promise.resolve() } }
    },
  }
  ctx.agents.setFactory(factory)
  for (const item of options.rehydrate ?? []) {
    const session = ctx.sessions.create(item.id, { meta: { cwd: item.cwd } })
    ctx.agents.register(stubAgent(session, sent))
  }
  ctx.provide('directoryPicker', { capability: () => ({ kind: 'native', pick: async () => null }) } as never)
  const api = createApiProxy(ctx, {
    defaultModelSelection: () => ({ provider: 'test', model: 'test-model' }),
    cwd: root,
  })
  return { api, ctx, pool, root, sent }
}

function stageDir(root: string, name: string): string {
  const path = join(root, name)
  mkdirSync(path)
  return path
}

async function readThroughArchive(stream: AsyncIterator<RpcRequest<HostFrame>>): Promise<HostFrame[]> {
  const frames: HostFrame[] = []
  while (frames.length < 6) {
    const next = await stream.next()
    if (next.done === true) throw new Error('host stream ended before archive frame')
    frames.push(next.value.payload)
    if (next.value.payload.type === 'host/archived-sessions-changed') return frames
  }
  throw new Error('archive frame exceeded bounded event budget')
}

describe('M0-1 hidden learning Session probe', () => {
  it('proves the public create-then-archive sequence is not atomic, while the archived live Session remains promptable', async () => {
    const probe = await harness()
    const workspace = expectOk(await probe.api.workspace.create(request({ path: stageDir(probe.root, 'project') }))).workspace
    const hiddenId = SessionId('visual-learning-hidden-direct')
    const abort = new AbortController()
    const stream: AsyncIterator<RpcRequest<HostFrame>> =
      probe.api.events.host(request({}), abort.signal)[Symbol.asyncIterator]()
    const framesPromise = readThroughArchive(stream)

    expectOk(await probe.api.sessions.create(request({ workspaceId: workspace.workspaceId, sessionId: hiddenId })))
    expectOk(await probe.api.workspace.archiveSession(request({ sessionId: hiddenId })))
    const frames = await framesPromise
    const addedIndex = frames.findIndex(frame => frame.type === 'host/session-added')
    const archivedIndex = frames.findIndex(frame => frame.type === 'host/archived-sessions-changed')
    expect(addedIndex).toBeGreaterThanOrEqual(0)
    expect(archivedIndex).toBeGreaterThan(addedIndex)

    const workspaceList = expectOk(await probe.api.workspace.list(request({})))
    expect(workspaceList.archivedSessionIds).toContain(hiddenId)
    expect(workspaceList.items[0]?.sessionIds).toContain(hiddenId)
    expect(expectOk(await probe.api.sessions.list(request({}))).items.map(item => item.sessionId)).toContain(hiddenId)

    expect(expectOk(await probe.api.sessions.prompt(request({
      sessionId: hiddenId,
      mode: 'queue' as const,
      content: [{ type: 'text' as const, text: 'keyless hidden-session prompt probe' }],
    })))).toEqual({ accepted: true })
    abort.abort()
    await probe.ctx.fiber.dispose()
  })

  it('keeps a subagent-origin candidate out of the native root list from its first frame', async () => {
    const probe = await harness()
    const projectPath = stageDir(probe.root, 'subagent-project')
    const workspace = expectOk(await probe.api.workspace.create(request({ path: projectPath }))).workspace
    const parentId = SessionId('visual-learning-private-owner')
    const hiddenId = SessionId('visual-learning-subagent-candidate')
    const abort = new AbortController()
    const stream: AsyncIterator<RpcRequest<HostFrame>> =
      probe.api.events.host(request({}), abort.signal)[Symbol.asyncIterator]()
    const nextFrame = stream.next()

    const handle = await probe.ctx.agents.create({
      sessionId: hiddenId,
      meta: {
        cwd: projectPath,
        parentSession: parentId,
        origin: 'subagent',
        delegationDepth: 1,
      },
    })
    await probe.ctx.workspaceRegistry.get(workspace.workspaceId)?.attachSession(hiddenId)
    const added = await nextFrame
    expect(added.done).toBe(false)
    if (added.done === true) throw new Error('missing session-added frame')
    expect(added.value.payload).toMatchObject({
      type: 'host/session-added',
      sessionId: hiddenId,
      parentSessionId: parentId,
      origin: 'subagent',
    })

    const listed = expectOk(await probe.api.sessions.list(request({}))).items
    const nativeRootRows = listed.filter(item => item.origin !== 'subagent')
    expect(nativeRootRows).not.toContainEqual(expect.objectContaining({ sessionId: hiddenId }))

    const prompt = await probe.api.sessions.prompt(request({
      sessionId: hiddenId,
      mode: 'queue' as const,
      content: [{ type: 'text' as const, text: 'subagent-origin prompt probe' }],
    }))
    expect(prompt.result).toMatchObject({
      ok: false,
      error: {
        code: 'agent-busy',
        details: { reason: 'use subagent delivery for this child session' },
      },
    })
    handle.agent.send({
      role: 'user',
      content: [{ type: 'text', text: 'product-owned hidden delivery probe' }],
      source: { kind: 'user' },
      id: hiddenId,
    }, 'next-turn', true)
    expect(probe.sent).toHaveLength(1)
    expectOk(await probe.api.workspace.archiveSession(request({ sessionId: hiddenId })))
    abort.abort()
    await probe.ctx.fiber.dispose()
  })

  it('restores the archive set across a reconstructed Host and keeps a rehydrated Session promptable', async () => {
    const pool = new MemoryMediaPool()
    const first = await harness({ pool })
    const projectPath = stageDir(first.root, 'project')
    const workspace = expectOk(await first.api.workspace.create(request({ path: projectPath }))).workspace
    const hiddenId = SessionId('visual-learning-hidden-restart')
    expectOk(await first.api.sessions.create(request({ workspaceId: workspace.workspaceId, sessionId: hiddenId })))
    expectOk(await first.api.workspace.archiveSession(request({ sessionId: hiddenId })))
    await first.ctx.fiber.dispose()

    const second = await harness({ root: first.root, pool, rehydrate: [{ id: hiddenId, cwd: projectPath }] })
    const restored = expectOk(await second.api.workspace.list(request({})))
    expect(restored.archivedSessionIds).toContain(hiddenId)
    expect(restored.items[0]?.sessionIds).toContain(hiddenId)
    expect(expectOk(await second.api.sessions.prompt(request({
      sessionId: hiddenId,
      mode: 'queue' as const,
      content: [{ type: 'text' as const, text: 'restart prompt probe' }],
    })))).toEqual({ accepted: true })
    await second.ctx.fiber.dispose()
  })
})
