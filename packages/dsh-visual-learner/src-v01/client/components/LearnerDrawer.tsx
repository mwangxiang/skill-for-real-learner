import { useEffect, useRef } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { copy } from '../copy.ts'
import { DrawerController, useDrawer, type Page } from '../state.ts'
import { DrawerHeader } from './DrawerHeader.tsx'
import { OutcomesPage } from './OutcomesPage.tsx'
import { OverviewPage } from './OverviewPage.tsx'
import { ProjectRoutePage } from './ProjectRoutePage.tsx'
import { ReviewQueuePage } from './ReviewQueuePage.tsx'
import { RootNavigation } from './RootNavigation.tsx'

export type LearnerDrawerProps = PropsRuntime<'shell.overlay'>

function backFor(page: Page, controller: DrawerController): (() => void) | undefined {
  if (page.kind === 'route') return () => controller.navigate({ kind: 'overview' })
  return undefined
}

export function LearnerDrawer({ controller }: { controller: DrawerController }) {
  const state = useDrawer(controller); const t = copy[state.locale]; const startX = useRef(0); const startWidth = useRef(0)
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.key === 'Escape' && state.open) { event.preventDefault(); controller.close() } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) }, [controller, state.open])
  if (state.narrowNotice) return <section className="dsh-learning-narrow" role="status"><h3>{t.narrowTitle}</h3><p>{t.narrowBody}</p><button type="button" className="dsh-learning-secondary" onClick={() => controller.dismissNarrow()}>{t.dismiss}</button></section>
  if (!state.open) return null
  const root = state.page.kind === 'overview' || state.page.kind === 'reviews' || state.page.kind === 'outcomes' || state.page.kind === 'new-project'
  const back = backFor(state.page, controller)
  const beginResize = (event: React.PointerEvent<HTMLDivElement>) => { startX.current = event.clientX; startWidth.current = state.width; event.currentTarget.setPointerCapture(event.pointerId) }
  const resize = (event: React.PointerEvent<HTMLDivElement>) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; controller.setWidth(startWidth.current + startX.current - event.clientX) }
  const resizeKey = (event: React.KeyboardEvent<HTMLDivElement>) => { if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return; event.preventDefault(); const amount = event.shiftKey ? 64 : 16; controller.setWidth(state.width + (event.key === 'ArrowLeft' ? amount : -amount)) }
  return <aside className={`dsh-learning-drawer${root ? ' dsh-learning-root' : ''}`} aria-labelledby="dsh-learning-title" style={{ width: state.width }}><div data-dsh-learning-resize className="dsh-learning-resize" role="separator" aria-orientation="vertical" aria-label="调整工作面板宽度" tabIndex={0} onPointerDown={beginResize} onPointerMove={resize} onKeyDown={resizeKey} /><DrawerHeader controller={controller} back={back} /><main className="dsh-learning-body">{state.page.kind === 'overview' || state.page.kind === 'new-project' ? <OverviewPage controller={controller} /> : state.page.kind === 'reviews' ? <ReviewQueuePage controller={controller} /> : state.page.kind === 'outcomes' ? <OutcomesPage controller={controller} /> : <ProjectRoutePage controller={controller} projectId={state.page.projectId} />}</main>{root && state.page.kind !== 'new-project' ? <RootNavigation controller={controller} /> : null}</aside>
}
