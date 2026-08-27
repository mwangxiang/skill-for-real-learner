import { useEffect, useRef } from 'react'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { copy } from '../copy.ts'
import { DrawerController, useDrawer, type Page } from '../state.ts'
import { DrawerHeader } from './DrawerHeader.tsx'
import { OutcomesPage } from './OutcomesPage.tsx'
import { OverviewPage } from './OverviewPage.tsx'
import { ProjectRoutePage } from './ProjectRoutePage.tsx'
import { ReviewQueuePage } from './ReviewQueuePage.tsx'
import { RootNavigation } from './RootNavigation.tsx'

function backFor(page: Page, controller: DrawerController): (() => void) | undefined {
  if (page.kind === 'route') return () => controller.navigate({ kind: 'overview' })
  return undefined
}

export function LearnerDrawer({ controller }: { controller: DrawerController }) {
  const state = useDrawer(controller); const t = copy[state.locale]; const panelRef = useRef<HTMLElement | null>(null)
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.key === 'Escape' && state.open) { event.preventDefault(); controller.close() } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) }, [controller, state.open])
  useEffect(() => {
    if (!state.open) return
    const ownPanel = panelRef.current
    const slotContainer = ownPanel?.parentElement
    if (ownPanel === undefined || ownPanel === null || slotContainer === undefined || slotContainer === null) return
    const yieldWhenPeerAppears = () => {
      const peerVisible = [...slotContainer.children].some(child => child !== ownPanel && child.getBoundingClientRect().height > 0)
      if (peerVisible) controller.yieldToDockPeer()
    }
    const observer = new MutationObserver(yieldWhenPeerAppears)
    observer.observe(slotContainer, { childList: true, subtree: true })
    yieldWhenPeerAppears()
    return () => observer.disconnect()
  }, [controller, state.open])
  if (!state.open) return null
  const root = state.page.kind === 'overview' || state.page.kind === 'reviews' || state.page.kind === 'outcomes' || state.page.kind === 'new-project'
  const back = backFor(state.page, controller)
  return <aside ref={panelRef} className={`dsh-learning-panel${root ? ' dsh-learning-root' : ''}`} aria-labelledby="dsh-learning-title" data-dsh-visual-learner-pilot-panel="true"><DrawerHeader controller={controller} back={back} /><main className="dsh-learning-body">{state.page.kind === 'overview' || state.page.kind === 'new-project' ? <OverviewPage controller={controller} /> : state.page.kind === 'reviews' ? <ReviewQueuePage controller={controller} /> : state.page.kind === 'outcomes' ? <OutcomesPage controller={controller} /> : <ProjectRoutePage controller={controller} projectId={state.page.projectId} />}</main>{root && state.page.kind !== 'new-project' ? <RootNavigation controller={controller} /> : null}</aside>
}
