import { useState } from 'react'
import type { WorkProjectViewModel } from '../../protocol/index.ts'
import { copy } from '../copy.ts'
import { DrawerController, useDrawer } from '../state.ts'
import { InlineError } from './Common.tsx'

function ProjectCard({ controller, project }: { controller: DrawerController; project: WorkProjectViewModel }) {
  const { locale } = useDrawer(controller)
  const t = copy[locale]
  return <article className="dsh-learning-card"><div className="dsh-learning-kicker">{project.project.stageLabel}</div><h3>{project.project.title}</h3><p>{project.artifact?.thesis ?? project.project.request}</p><p className="dsh-learning-meta">{project.artifact ? `v${project.artifact.version} · ${project.artifact.pages.length} ${t.pages}` : t.noDraftYet}</p><div className="dsh-learning-actions"><button data-primary-action type="button" className="dsh-learning-secondary" onClick={() => controller.openProject(project)}>{project.project.status === 'completed' ? t.viewResult : t.continue}</button></div></article>
}

export function NewProjectFlow({ controller }: { controller: DrawerController }) {
  const state = useDrawer(controller)
  const t = copy[state.locale]
  const [request, setRequest] = useState(() => controller.getDraft('new-project'))
  const running = state.operation === 'running'
  return <section className="dsh-learning-empty"><div className="dsh-learning-kicker">{t.stepOne}</div><h3>{t.emptyPrompt}</h3><p>{t.emptyBody}</p><label className="dsh-learning-label" htmlFor="dsh-learning-new-goal">{t.goalLabel}</label><textarea id="dsh-learning-new-goal" className="dsh-learning-input" value={request} disabled={running} placeholder={t.goalPlaceholder} onChange={event => { setRequest(event.currentTarget.value); controller.setDraft('new-project', event.currentTarget.value) }} />
    {request.trim() === '' ? <div className="dsh-learning-example"><strong>{t.exampleLabel}</strong><p>{t.workExample}</p><button type="button" className="dsh-learning-text-button" onClick={() => { setRequest(t.workExample); controller.setDraft('new-project', t.workExample) }}>{t.useExample}</button></div> : null}
    {state.learnerError ? <InlineError>{state.learnerError}</InlineError> : null}
    {running ? <div className="dsh-learning-processing" role="status"><strong>{state.operationLabel ?? t.creatingDraft}</strong><span>{t.processingHelp}</span></div> : null}
    <div className="dsh-learning-actions"><button data-primary-action type="button" className="dsh-learning-primary dsh-learning-wide" disabled={request.trim() === '' || running} onClick={() => { void controller.startProject(request) }}>{running ? t.creatingDraft : t.startWorking}</button></div></section>
}

export function OverviewPage({ controller }: { controller: DrawerController }) {
  const state = useDrawer(controller)
  const t = copy[state.locale]
  if (state.page.kind === 'new-project' || state.projects.length === 0) return <NewProjectFlow controller={controller} />
  const active = state.projects.filter(project => project.project.status === 'active')
  const completed = state.projects.filter(project => project.project.status === 'completed')
  return <><section className="dsh-learning-section"><h3 className="dsh-learning-section-title">{t.activeWork}</h3>{active.length > 0 ? active.map(project => <ProjectCard key={project.project.projectId} controller={controller} project={project} />) : <p className="dsh-learning-meta">{t.noActiveWork}</p>}</section>{completed.length > 0 ? <section className="dsh-learning-section"><h3 className="dsh-learning-section-title">{t.recentCompleted}</h3>{completed.slice(0, 3).map(project => <ProjectCard key={project.project.projectId} controller={controller} project={project} />)}</section> : null}<button type="button" className="dsh-learning-primary dsh-learning-wide" onClick={() => controller.navigate({ kind: 'new-project' })}>{t.startNew}</button></>
}
