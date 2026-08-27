import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime, { type ToolDefinition } from '@deepseek-ai/dsh-tools'
import { installLearningAgentBoundary } from '../packages/dsh-visual-learner/src-v01/host/agent-boundary.ts'
import { LearningFileAccess, LearningPathDeniedError } from '../packages/dsh-visual-learner/src-v01/host/file-access.ts'
import { LearningPathPolicy } from '../packages/dsh-visual-learner/src-v01/host/path-policy.ts'
import { MockLlmAdapter } from './helpers/mock-llm-adapter.ts'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

function tool(name: string): ToolDefinition {
  return {
    name,
    description: `${name} test tool`,
    parameters: { type: 'object', properties: {} },
    output: {
      schema: { type: 'string' },
      render: value => [{ type: 'text', text: String(value) }],
    },
    execute: () => Promise.resolve(`ran:${name}`),
  }
}

describe('M0-2 runtime boundary', () => {
  it('makes project writes and Skill reads pass only through the Host facade', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-visual-m0-access-'))
    roots.push(root)
    const project = join(root, 'project')
    const skill = join(root, 'skill')
    const outside = join(root, 'outside')
    await Promise.all([mkdir(project), mkdir(skill), mkdir(outside)])
    await writeFile(join(skill, 'guide.md'), 'skill resource', 'utf8')
    await writeFile(join(outside, 'secret.md'), 'secret', 'utf8')
    const access = new LearningFileAccess(new LearningPathPolicy({
      projectRoot: project,
      skillResourceRoots: [skill],
    }))

    await access.writeUtf8(join(project, 'evidence', 'answer.md'), 'learner evidence')
    expect(await readFile(join(project, 'evidence', 'answer.md'), 'utf8')).toBe('learner evidence')
    expect(await access.readUtf8(join(skill, 'guide.md'))).toBe('skill resource')
    await expect(access.writeUtf8(join(skill, 'guide.md'), 'overwrite'))
      .rejects.toEqual(expect.objectContaining<Partial<LearningPathDeniedError>>({ code: 'SKILL_RESOURCE_READ_ONLY' }))
    await expect(access.readUtf8(join(outside, 'secret.md')))
      .rejects.toEqual(expect.objectContaining<Partial<LearningPathDeniedError>>({ code: 'PATH_OUTSIDE_ROOT' }))
  })

  it('installs a real Agent-scoped monotonic guard that blocks direct file/shell bypasses', async () => {
    const ctx = new Context()
    await ctx.plugin(LlmRuntime)
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(AgentRegistry)
    await ctx.plugin(AgentLoop, { agents: [] })
    ctx.llm.registerAdapter(['m0-mock'], new MockLlmAdapter([]))
    for (const name of ['read', 'write', 'pwsh', 'skill']) ctx.tools.register(tool(name))

    const handle = await ctx.agents.create({
      sessionId: SessionId('m0-path-runtime-agent'),
      agentOptions: { provider: 'm0-mock', model: 'm0-model' },
      setup: (agentCtx) => { installLearningAgentBoundary(agentCtx) },
    })
    const controller = new AbortController()
    const execute = (name: string) => ctx.tools.execute({
      callId: `m0-${name}` as never,
      name,
      arguments: {},
      agent: handle.agent,
      signal: controller.signal,
    })

    await expect(execute('read')).resolves.toMatchObject({ isError: true })
    await expect(execute('write')).resolves.toMatchObject({ isError: true })
    await expect(execute('pwsh')).resolves.toMatchObject({ isError: true })
    await expect(execute('skill')).resolves.toMatchObject({ isError: false })
    await ctx.fiber.dispose()
  })
})
