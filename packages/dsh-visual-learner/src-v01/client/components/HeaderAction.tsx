import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { copy } from '../copy.ts'
import { DrawerController, useDrawer } from '../state.ts'

export type LearnerHeaderActionProps = PropsRuntime<'conversation.session.header.utilities'>

export function LearnerHeaderAction({ controller }: { controller: DrawerController } & LearnerHeaderActionProps) {
  const state = useDrawer(controller)
  const t = copy[state.locale]
  const label = state.reviewDueCount > 0 ? t.dueCount(state.reviewDueCount) : t.open
  return (
    <button
      ref={(node) => { controller.trigger.current = node }}
      type="button"
      className="dsh-learning-entry"
      aria-label={label}
      aria-expanded={state.open}
      aria-pressed={state.open}
      onClick={() => controller.toggle()}
    >
      <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z" />
      </svg>
      <span className="dsh-learning-entry-label">{t.title}</span>
      {state.reviewDueCount > 0 ? <span className="dsh-learning-badge">{state.reviewDueCount}</span> : null}
    </button>
  )
}
