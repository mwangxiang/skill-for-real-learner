import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { LearningPathPolicy, type LearningPathDecision } from './path-policy.ts'

export class LearningPathDeniedError extends Error {
  readonly code: Exclude<LearningPathDecision, { allowed: true }>['code']

  constructor(code: LearningPathDeniedError['code']) {
    super(`learning path access denied: ${code}`)
    this.name = 'LearningPathDeniedError'
    this.code = code
  }
}

/** Host-owned filesystem seam. Client and model never receive canonical paths. */
export class LearningFileAccess {
  constructor(private readonly policy: LearningPathPolicy) {}

  async readUtf8(path: string): Promise<string> {
    const decision = this.policy.decide(path, 'read')
    if (!decision.allowed) throw new LearningPathDeniedError(decision.code)
    return readFile(decision.canonicalPath, 'utf8')
  }

  async writeUtf8(path: string, content: string): Promise<void> {
    const decision = this.policy.decide(path, 'write')
    if (!decision.allowed) throw new LearningPathDeniedError(decision.code)
    await mkdir(dirname(decision.canonicalPath), { recursive: true })
    await writeFile(decision.canonicalPath, content, 'utf8')
  }
}
