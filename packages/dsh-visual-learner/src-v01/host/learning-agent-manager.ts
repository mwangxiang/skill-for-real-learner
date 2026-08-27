import type { Context } from '@deepseek-ai/cordis'
import { dirname } from 'node:path'
import type { AgentHandle } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { SessionPersistence } from '@deepseek-ai/dsh-session-persistence'
import { installLearningAgentBoundary } from './agent-boundary.ts'

interface AgentContext {
  agents: {
    withoutInitiator<T>(operation: () => T): T
    create(options: unknown): Promise<AgentHandle>
    resume(options: unknown): Promise<AgentHandle>
  }
  sessionPersistence: SessionPersistence
  sessions: { flush(session: AgentHandle['agent']['session']): Promise<void> }
  agentDefaultModel: { currentSelection(): { provider: string; model: string } }
}

function hiddenSessionId(projectId: string): SessionId {
  return SessionId(`dsh-learning-${projectId}`)
}

function ownerSessionId(projectId: string): SessionId {
  return SessionId(`dsh-learning-owner-${projectId}`)
}

function lastAssistantText(handle: AgentHandle): string {
  const messages = handle.agent.session.deriveMessages()
  for (const message of messages.toReversed()) {
    if (message.role !== 'assistant') continue
    const text = message.content.filter(block => block.type === 'text').map(block => block.text).join('\n').trim()
    if (text !== '') return text
    const reasoning = message.content.filter(block => block.type === 'reasoning').map(block => block.text).join('\n').trim()
    if (reasoning !== '') return reasoning
  }
  throw new Error('learning model returned no assistant text')
}

function parseJsonObject(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/iu)?.[1]?.trim()
  const candidate = fenced ?? text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
  const parsed: unknown = JSON.parse(candidate)
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('projection is not an object')
  return parsed as Record<string, unknown>
}

export class LearningAgentManager {
  private readonly handles = new Map<string, AgentHandle>()

  constructor(private readonly ctx: Context) {}

  async ensure(projectId: string, projectDir: string): Promise<AgentHandle> {
    const existing = this.handles.get(projectId)
    if (existing !== undefined) return existing
    const ctx = this.ctx as unknown as AgentContext
    const id = hiddenSessionId(projectId)
    const sessionCwd = dirname(dirname(projectDir))
    const persisted = (await ctx.sessionPersistence.list()).some(header => header.id === id)
    const agentOptions = ctx.agentDefaultModel.currentSelection()
    const handle = await ctx.agents.withoutInitiator(() => persisted
      ? ctx.agents.resume({
          resumeSessionId: id,
          agentOptions,
          setup: (agentCtx: Context) => { installLearningAgentBoundary(agentCtx) },
        })
      : ctx.agents.create({
          sessionId: id,
          meta: {
            cwd: sessionCwd,
            parentSession: ownerSessionId(projectId),
            origin: 'subagent',
            delegationDepth: 1,
          },
          agentOptions,
          setup: (agentCtx: Context) => { installLearningAgentBoundary(agentCtx) },
        }))
    this.handles.set(projectId, handle)
    return handle
  }

  async runStructured(
    projectId: string,
    projectDir: string,
    command: string,
    projectionInstruction: string,
  ): Promise<Record<string, unknown>> {
    const handle = await this.ensure(projectId, projectDir)
    handle.agent.followup(createUserMessage({
      content: [{ type: 'text', text: command }],
      source: { kind: 'user' },
    }))
    await handle.agent.whenIdle()
    handle.agent.followup(createUserMessage({
      content: [{ type: 'text', text: projectionInstruction }],
      source: { kind: 'plugin', plugin: 'dsh-visual-learner' },
    }))
    await handle.agent.whenIdle()
    await (this.ctx as unknown as AgentContext).sessions.flush(handle.agent.session)
    return parseJsonObject(lastAssistantText(handle))
  }

  async runStructuredSingleTurn(
    projectId: string,
    projectDir: string,
    command: string,
    projectionInstruction: string,
  ): Promise<Record<string, unknown>> {
    const handle = await this.ensure(projectId, projectDir)
    handle.agent.followup(createUserMessage({
      content: [{ type: 'text', text: `${command}\n\n${projectionInstruction}` }],
      source: { kind: 'user' },
    }))
    await handle.agent.whenIdle()
    await (this.ctx as unknown as AgentContext).sessions.flush(handle.agent.session)
    return parseJsonObject(lastAssistantText(handle))
  }
}
