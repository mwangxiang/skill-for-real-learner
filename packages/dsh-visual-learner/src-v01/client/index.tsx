import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { LearnerHeaderAction } from './components/HeaderAction.tsx'
import { LearnerDrawer } from './components/LearnerDrawer.tsx'
import { DrawerController, type RpcCarrier } from './state.ts'
import { styles } from './styles.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'shell.right-sidebar': { kind: 'list'; scope: 'root' }
  }
}

interface PilotLayout {
  openRightSidebar?: () => void
  closeRightSidebar?: () => void
}

export const inject = ['slots', 'connection', 'layout']

export function apply(ctx: ClientContext): void {
  const rpc = (ctx as unknown as { connection: { rpc: RpcCarrier } }).connection.rpc
  const layout = ctx.layout as PilotLayout
  const controller = new DrawerController(rpc, {
    open: () => layout.openRightSidebar?.(),
    close: () => layout.closeRightSidebar?.(),
  })
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset['dshLearningStyles'] = 'v01'
    style.textContent = styles
    document.head.append(style)
    return () => style.remove()
  }, 'dsh-learning: scoped styles')
  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities', id: 'dsh-learning-entry', order: 40,
  }, props => <LearnerHeaderAction controller={controller} {...props} />))
  ctx.slots.inject('shell.right-sidebar', () => ctx.slots.register({
    name: 'shell.right-sidebar', id: 'dsh-learning-panel', order: 40,
  }, props => <LearnerDrawer controller={controller} {...props} />))
}
