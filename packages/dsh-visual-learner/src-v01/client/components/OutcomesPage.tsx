import { copy } from '../copy.ts'
import { DrawerController, useDrawer } from '../state.ts'

export function OutcomesPage({ controller }: { controller: DrawerController }) {
  const state = useDrawer(controller)
  const t = copy[state.locale]
  const projectsWithResults = state.projects.filter(project => project.artifact !== null)
  return <><h1 className="dsh-learning-page-title">{t.outcomes}</h1><p>{t.assetsIntro}</p>{projectsWithResults.length === 0 ? <section className="dsh-learning-empty"><p>{t.noOutcomes}</p><button type="button" className="dsh-learning-primary" onClick={() => controller.navigate({ kind: 'overview' })}>{t.goToWork}</button></section> : projectsWithResults.map(project => <section className="dsh-learning-card" key={project.project.projectId}><div className="dsh-learning-kicker">{project.project.status === 'completed' ? t.finalReady : project.project.stageLabel}</div><h3>{project.project.title}</h3><p>{project.artifact?.fileName}</p><p className="dsh-learning-meta">{project.versions.length} {t.versions} · {project.assets.ready ? t.assetsReady : t.assetsAfterAccept}</p><div className="dsh-learning-actions"><button type="button" className="dsh-learning-secondary" onClick={() => controller.openProject(project)}>{t.viewResult}</button></div></section>)}</>
}
