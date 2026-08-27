import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-skill'
import * as SkillFileSystem from '@deepseek-ai/dsh-skill-filesystem'
import { WorkPanelService } from './host/work-panel-service.ts'

const embeddedSkillRoot = fileURLToPath(new URL('../embedded-skills/', import.meta.url))
const expectedCapabilityNames = ['ask-ming', 'grill-with-learn', 'learn-modeling', 'learn-one-concept', 'strategyfinder', 'study-review', 'teach-core', 'teach-me', 'to-sop', 'to-task'] as const

export const inject = ['skills', 'typert']

export async function apply(ctx: Context): Promise<void> {
  await ctx.plugin(SkillFileSystem, {
    providerName: 'visual-learner-embedded',
    includeDefaultRoots: false,
    customSkillDirs: [embeddedSkillRoot],
    watch: false,
  })
  const discovered = await ctx.skills.list()
  const found = discovered.filter(skill => expectedCapabilityNames.includes(skill.name as typeof expectedCapabilityNames[number])).map(skill => skill.name).sort()
  if (found.join('\n') !== [...expectedCapabilityNames].sort().join('\n')) {
    throw new Error(`dsh-visual-learner: embedded capability discovery mismatch: ${found.join(', ')}`)
  }
  await ctx.plugin(WorkPanelService)
}
