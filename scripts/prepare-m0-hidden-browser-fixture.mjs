import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'

const [profileArgument, projectArgument] = process.argv.slice(2)
if (!profileArgument || !projectArgument) {
  throw new Error('usage: node scripts/prepare-m0-hidden-browser-fixture.mjs <profile-root> <project-root>')
}

const profileRoot = resolve(profileArgument)
const projectRoot = resolve(projectArgument)
const sessionRoot = resolve(profileRoot, 'sessions')
await mkdir(sessionRoot, { recursive: true })
await mkdir(projectRoot, { recursive: true })

const ctx = new Context()
await ctx.plugin(SessionStore)
await ctx.plugin(JsonlSessionPersistence, { root: sessionRoot })

const seed = [
  { type: 'turn/start', seq: 0, time: 1, data: { turn: 1 } },
  { type: 'turn/end', seq: 1, time: 2, data: { turn: 1, reason: { kind: 'completed' } } },
]
const visible = ctx.sessions.create(SessionId('m0-visible-control'), {
  seed,
  meta: { cwd: projectRoot },
})
const hidden = ctx.sessions.create(SessionId('m0-hidden-product'), {
  seed,
  meta: {
    cwd: projectRoot,
    parentSession: SessionId('m0-product-owner'),
    origin: 'subagent',
    delegationDepth: 1,
  },
})
await ctx.sessions.flush(visible)
await ctx.sessions.flush(hidden)
await ctx.fiber.dispose()

process.stdout.write(`${JSON.stringify({ profileRoot, projectRoot, visible: visible.id, hidden: hidden.id })}\n`)
