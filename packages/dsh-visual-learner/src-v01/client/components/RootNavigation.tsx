import { copy } from '../copy.ts'
import { DrawerController, useDrawer, type Page } from '../state.ts'

export function RootNavigation({ controller }: { controller: DrawerController }) {
  const state = useDrawer(controller)
  const t = copy[state.locale]
  const items: Array<{ page: Page & { kind: 'overview' | 'reviews' | 'outcomes' }; label: string }> = [{ page: { kind: 'overview' }, label: t.home }]
  if (state.projects.some(project => project.artifact !== null)) items.push({ page: { kind: 'outcomes' }, label: t.outcomes })
  if (state.projects.some(project => project.learning.offered)) items.push({ page: { kind: 'reviews' }, label: t.reviews })
  if (items.length === 1) return null
  return <nav className="dsh-learning-nav" aria-label={t.title}>{items.map(item => <button type="button" key={item.page.kind} aria-current={state.page.kind === item.page.kind ? 'page' : undefined} onClick={() => controller.navigate(item.page)}>{item.label}</button>)}</nav>
}
