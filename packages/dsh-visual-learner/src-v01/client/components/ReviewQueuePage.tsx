import { copy } from '../copy.ts'
import { DrawerController, useDrawer } from '../state.ts'

export function ReviewQueuePage({ controller }: { controller: DrawerController }) {
  const state = useDrawer(controller)
  const t = copy[state.locale]
  const offered = state.projects.filter(project => project.learning.offered)
  return <><h1 className="dsh-learning-page-title">{t.reviews}</h1><p>{t.learningIntro}</p>{offered.length === 0 ? <section className="dsh-learning-empty"><p>{t.noReviews}</p></section> : offered.map(project => <article className="dsh-learning-card" key={project.project.projectId}><div className="dsh-learning-kicker">{project.learning.selected ? t.learningSelectedShort : t.optional}</div><h3>{project.project.title}</h3><ul className="dsh-learning-list">{project.learning.topics.map(topic => <li key={topic}>{topic}</li>)}</ul><div className="dsh-learning-actions"><button type="button" className="dsh-learning-secondary" onClick={() => controller.openProject(project)}>{t.viewResult}</button></div></article>)}</>
}
