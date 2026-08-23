import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as SkillFileSystem from '@deepseek-ai/dsh-skill-filesystem'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const skillsRoot = join(repoRoot, 'skills')
const expectedNames = [
  'ask-ming',
  'grill-with-learn',
  'learn-modeling',
  'learn-one-concept',
  'strategyfinder',
  'study-review',
  'teach-core',
  'teach-me',
  'to-sop',
  'to-task',
] as const
const userOnlyNames = [
  'ask-ming',
  'grill-with-learn',
  'learn-one-concept',
  'strategyfinder',
  'study-review',
  'teach-me',
  'to-sop',
  'to-task',
] as const

let scratch = ''
let ctx: Context

afterAll(async () => {
  if (scratch !== '') await rm(scratch, { recursive: true, force: true })
})

beforeAll(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'dsh-real-learner-smoke-'))
  ctx = new Context()
  await ctx.plugin(SkillRegistry)
  await ctx.plugin(SkillFileSystem, {
    dshHome: join(scratch, '.dsh'),
    agentsHome: join(scratch, '.agents'),
    customSkillDirs: [skillsRoot],
    watch: false,
  })
})

describe('Skills for Real Learners on official DSH 0.1.1-rc.2', () => {
  it('discovers exactly the ten locked one-level skills', async () => {
    const listed = await ctx.skills.list({ cwd: repoRoot })

    expect(listed.map(skill => skill.name)).toEqual(expectedNames)
    expect(listed.every(skill => skill.source === 'custom')).toBe(true)
    expect(listed.every(skill => skill.description.trim().length > 0)).toBe(true)
  })

  it('resolves the intended user/model invocation policy', async () => {
    for (const name of userOnlyNames) {
      expect((await ctx.skills.get(name, { cwd: repoRoot }))?.invocation).toEqual({
        modelInvocable: false,
        userInvocable: true,
      })
    }
    for (const name of ['learn-modeling', 'teach-core'] as const) {
      expect((await ctx.skills.get(name, { cwd: repoRoot }))?.invocation).toEqual({
        modelInvocable: true,
        userInvocable: true,
      })
    }
  })

  it('returns full bodies with a directory resource base and readable references', async () => {
    const checks = [
      ['learn-modeling', 'references/MODEL-FORMAT.md'],
      ['learn-one-concept', 'references/learning-loop.md'],
      ['teach-me', 'references/LEARNER-PROFILE-FORMAT.md'],
      ['study-review', 'references/review-format.md'],
      ['to-sop', '../teach-core/MISSION-FORMAT.md'],
    ] as const

    for (const [name, reference] of checks) {
      const skill = await ctx.skills.get(name, { cwd: repoRoot })
      expect(skill?.content).toContain(reference)
      expect(skill?.resourceBase).toEqual({ kind: 'directory', path: join(skillsRoot, name) })

      const target = resolve(skillsRoot, name, reference)
      await access(target)
      expect((await readFile(target, 'utf8')).trim().length).toBeGreaterThan(0)
    }
  })
})
