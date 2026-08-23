import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-skill'
import * as SkillFileSystem from '@deepseek-ai/dsh-skill-filesystem'
import { PROBE_CHANNEL, PROBE_STATUS_ENDPOINT, type ProbeStatus } from './protocol.ts'

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

export const inject = ['connection', 'skills']

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

  ctx.effect(
    () => ctx.connection.rpc.handle(PROBE_CHANNEL, async (endpoint, _payload, signal) => {
      if (signal.aborted) {
        return {
          ok: false,
          error: { code: 'cancelled', message: 'request cancelled', details: {} },
        }
      }
      if (endpoint !== PROBE_STATUS_ENDPOINT) {
        return {
          ok: false,
          error: { code: 'bad-request', message: 'unknown probe operation', details: { issues: [] } },
        }
      }
      const value: ProbeStatus = {
        hostLoaded: true,
        protocolVersion: 1,
        packageVersion: '0.0.2-alpha.0',
        skillCount: 10,
        skillNames,
      }
      return { ok: true, value }
    }, { authority: 'loopback' }),
    'dsh-visual-learner: loopback ABI probe',
  )
}
