import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { LearningPathPolicy } from '../packages/dsh-visual-learner/src-v01/host/path-policy.ts'

const scratch: string[] = []

afterEach(async () => {
  await Promise.all(scratch.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'dsh-visual-m0-path-')))
  scratch.push(root)
  const project = join(root, 'project')
  const skill = join(root, 'skill-resource')
  const outside = join(root, 'outside')
  await Promise.all([mkdir(project), mkdir(skill), mkdir(outside)])
  await Promise.all([
    writeFile(join(project, 'work.md'), 'project'),
    writeFile(join(skill, 'SKILL.md'), 'skill'),
    writeFile(join(outside, 'secret.txt'), 'outside'),
  ])
  return { root, project, skill, outside, policy: new LearningPathPolicy({ projectRoot: project, skillResourceRoots: [skill] }) }
}

describe('M0-2 learning Session path policy probe', () => {
  it('allows project reads and writes, including a missing descendant', async () => {
    const { project, policy } = await fixture()
    expect(policy.decide(join(project, 'work.md'), 'read')).toMatchObject({ allowed: true, root: 'project' })
    expect(policy.decide(join(project, 'work.md'), 'write')).toMatchObject({ allowed: true, root: 'project' })
    expect(policy.decide(join(project, 'new', 'result.md'), 'write')).toMatchObject({ allowed: true, root: 'project' })
  })

  it('allows Skill resource reads but rejects writes', async () => {
    const { skill, policy } = await fixture()
    expect(policy.decide(join(skill, 'SKILL.md'), 'read')).toMatchObject({ allowed: true, root: 'skill-resource' })
    expect(policy.decide(join(skill, 'SKILL.md'), 'write')).toMatchObject({ allowed: false, code: 'SKILL_RESOURCE_READ_ONLY' })
  })

  it('rejects outside reads, writes, relative paths, traversal, and every escalation', async () => {
    const { project, outside, policy } = await fixture()
    expect(policy.decide(join(outside, 'secret.txt'), 'read')).toMatchObject({ allowed: false, code: 'PATH_OUTSIDE_ROOT' })
    expect(policy.decide(join(outside, 'secret.txt'), 'write')).toMatchObject({ allowed: false, code: 'PATH_OUTSIDE_ROOT' })
    expect(policy.decide('relative.txt', 'read')).toEqual({ allowed: false, canonicalPath: null, code: 'PATH_NOT_ABSOLUTE' })
    expect(policy.decide(join(project, '..', 'outside', 'secret.txt'), 'read')).toMatchObject({ allowed: false, code: 'PATH_OUTSIDE_ROOT' })
    expect(policy.decide(join(project, 'work.md'), 'write', { escalation: true }))
      .toEqual({ allowed: false, canonicalPath: null, code: 'ESCALATION_DENIED' })
  })

  it('resolves a project junction before authorization and rejects escape reads and writes', async () => {
    const { project, outside, policy } = await fixture()
    const link = join(project, 'outside-link')
    await symlink(outside, link, process.platform === 'win32' ? 'junction' : 'dir')
    expect(policy.decide(join(link, 'secret.txt'), 'read')).toMatchObject({ allowed: false, code: 'PATH_OUTSIDE_ROOT' })
    expect(policy.decide(join(link, 'new.txt'), 'write')).toMatchObject({ allowed: false, code: 'PATH_OUTSIDE_ROOT' })
  })
})
