import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { LearnerHeaderAction } from './components/HeaderAction.tsx'
import { LearnerDrawer } from './components/LearnerDrawer.tsx'
import { DrawerController, type RpcCarrier } from './state.ts'
import { styles } from './styles.ts'

export const inject = ['slots', 'connection']

export function apply(ctx: ClientContext): void {
  const rpc = (ctx as unknown as { connection: { rpc: RpcCarrier } }).connection.rpc
  const controller = new DrawerController(rpc)
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset['dshLearningStyles'] = 'v01'
    style.textContent = styles
    document.head.append(style)
    return () => style.remove()
  }, 'dsh-learning: scoped styles')
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions', id: 'dsh-learning-entry', order: 40,
  }, props => <LearnerHeaderAction controller={controller} {...props} />))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay', id: 'dsh-learning-drawer', order: 40,
  }, () => <LearnerDrawer controller={controller} />))
}
