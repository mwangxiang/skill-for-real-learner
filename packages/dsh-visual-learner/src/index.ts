import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-skill'
import * as SkillFileSystem from '@deepseek-ai/dsh-skill-filesystem'

const embeddedSkillRoot = fileURLToPath(new URL('../embedded-skills/', import.meta.url))
const expectedSkillNames = [
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

export const inject = ['skills']

export async function apply(ctx: Context): Promise<void> {
  await ctx.plugin(SkillFileSystem, {
    customSkillDirs: [embeddedSkillRoot],
    watch: false,
  })
  const discovered = await ctx.skills.list()
  const skillNames = discovered
    .filter(skill => expectedSkillNames.includes(skill.name as typeof expectedSkillNames[number]))
    .map(skill => skill.name)
    .sort()
  if (skillNames.join('\n') !== [...expectedSkillNames].sort().join('\n')) {
    throw new Error(`dsh-visual-learner: embedded Skill discovery mismatch: ${skillNames.join(', ')}`)
  }

}
