import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import { PROBE_CHANNEL, PROBE_STATUS_ENDPOINT, type ProbeStatus } from './protocol.ts'

export const inject = ['connection']

export function apply(ctx: Context): void {
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
        packageVersion: '0.0.1-alpha.0',
      }
      return { ok: true, value }
    }, { authority: 'loopback' }),
    'dsh-visual-learner: loopback ABI probe',
  )
}
