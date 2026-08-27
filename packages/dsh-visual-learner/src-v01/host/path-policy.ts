import { existsSync, realpathSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'

export type LearningPathOperation = 'read' | 'write'

export type LearningPathDecision =
  | { allowed: true; canonicalPath: string; root: 'project' | 'skill-resource' }
  | {
      allowed: false
      canonicalPath: string | null
      code: 'PATH_NOT_ABSOLUTE' | 'PATH_OUTSIDE_ROOT' | 'SKILL_RESOURCE_READ_ONLY' | 'ESCALATION_DENIED'
    }

export interface LearningPathPolicyOptions {
  projectRoot: string
  skillResourceRoots: string[]
}

function canonicalKey(path: string): string {
  const normalized = resolve(path)
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized
}

function contains(root: string, candidate: string): boolean {
  const rel = relative(root, candidate)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

/** Resolve an existing path, or the closest existing ancestor plus a normalized missing suffix. */
function canonicalize(path: string): string {
  let cursor = resolve(path)
  const missing: string[] = []
  while (!existsSync(cursor)) {
    const parent = dirname(cursor)
    if (parent === cursor) break
    missing.unshift(cursor.slice(parent.length).replace(/^[/\\]+/, ''))
    cursor = parent
  }
  const real = existsSync(cursor) ? realpathSync.native(cursor) : cursor
  return resolve(real, ...missing)
}

export class LearningPathPolicy {
  private readonly projectRoot: string
  private readonly skillResourceRoots: string[]

  constructor(options: LearningPathPolicyOptions) {
    if (!isAbsolute(options.projectRoot)) throw new Error('projectRoot must be absolute')
    if (options.skillResourceRoots.some(root => !isAbsolute(root))) {
      throw new Error('every skillResourceRoot must be absolute')
    }
    this.projectRoot = canonicalKey(realpathSync.native(options.projectRoot))
    this.skillResourceRoots = options.skillResourceRoots.map(root => canonicalKey(realpathSync.native(root)))
  }

  decide(path: string, operation: LearningPathOperation, options: { escalation?: boolean } = {}): LearningPathDecision {
    if (options.escalation === true) {
      return { allowed: false, canonicalPath: null, code: 'ESCALATION_DENIED' }
    }
    if (!isAbsolute(path)) {
      return { allowed: false, canonicalPath: null, code: 'PATH_NOT_ABSOLUTE' }
    }
    const canonicalPath = canonicalKey(canonicalize(path))
    if (contains(this.projectRoot, canonicalPath)) {
      return { allowed: true, canonicalPath, root: 'project' }
    }
    if (this.skillResourceRoots.some(root => contains(root, canonicalPath))) {
      if (operation === 'read') return { allowed: true, canonicalPath, root: 'skill-resource' }
      return { allowed: false, canonicalPath, code: 'SKILL_RESOURCE_READ_ONLY' }
    }
    return { allowed: false, canonicalPath, code: 'PATH_OUTSIDE_ROOT' }
  }
}
