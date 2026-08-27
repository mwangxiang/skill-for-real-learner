import type { Context } from '@deepseek-ai/cordis'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'

const DIRECT_FILE_OR_SHELL_TOOLS = new Set([
  'bash',
  'edit',
  'glob',
  'grep',
  'pwsh',
  'read',
  'write',
])

/**
 * Keep product Sessions on the product Host boundary: Skills/model reasoning
 * may run, but direct filesystem and shell tools cannot bypass LearningFileAccess.
 */
export function installLearningAgentBoundary(agentCtx: Context): () => void {
  const tools = (agentCtx as Context & {
    tools: { guard(guard: (execution: Readonly<ToolExecution>) => string | undefined): () => void }
  }).tools
  return tools.guard((execution: Readonly<ToolExecution>) => {
    if (!DIRECT_FILE_OR_SHELL_TOOLS.has(execution.name)) return undefined
    return '学习会话只能通过产品受控文件接口访问学习项目。'
  })
}
