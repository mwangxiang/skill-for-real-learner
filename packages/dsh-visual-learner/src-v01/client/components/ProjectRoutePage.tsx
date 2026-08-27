import { useState } from 'react'
import { copy } from '../copy.ts'
import { DrawerController, useDrawer } from '../state.ts'
import { InlineError } from './Common.tsx'

function Processing({ label }: { label: string }) {
  return <section className="dsh-learning-processing" role="status" aria-live="polite"><strong>{label}</strong><span>你可以先关闭面板，工作不会丢失。请不要重复提交。</span></section>
}

export function ProjectRoutePage({ controller, projectId }: { controller: DrawerController; projectId: string }) {
  const state = useDrawer(controller)
  const t = copy[state.locale]
  const [response, setResponse] = useState(() => controller.getDraft(`work-${projectId}`))
  const view = state.project?.project.projectId === projectId ? state.project : state.projects.find(item => item.project.projectId === projectId) ?? null
  if (view === null) return <section className="dsh-learning-empty"><p>{state.learnerError ?? t.projectMissing}</p><button data-primary-action type="button" className="dsh-learning-primary" onClick={() => controller.navigate({ kind: 'overview' })}>{t.backOverview}</button></section>
  const running = state.operation === 'running'
  const saveResponse = (value: string) => { setResponse(value); controller.setDraft(`work-${projectId}`, value) }

  if (view.project.stage === 'clarifying') {
    return <>
      <div className="dsh-learning-kicker">{t.stepOne}</div>
      <h1 className="dsh-learning-page-title">{t.justConfirm}</h1>
      <p>{t.confirmReason}</p>
      <ol className="dsh-learning-question-list">{view.clarification.questions.map((question, index) => <li key={question.id}><strong>{index + 1}. {question.prompt}</strong><span>{t.recommended}：{question.recommendedAnswer}</span></li>)}</ol>
      <label className="dsh-learning-label" htmlFor={`work-response-${projectId}`}>{t.yourExtraInfo}</label>
      <textarea id={`work-response-${projectId}`} className="dsh-learning-input" value={response} disabled={running} placeholder={t.extraPlaceholder} onChange={event => saveResponse(event.currentTarget.value)} />
      {state.learnerError ? <InlineError>{state.learnerError}</InlineError> : null}
      {running ? <Processing label={state.operationLabel ?? t.creatingDraft} /> : null}
      <div className="dsh-learning-actions" data-stack><button data-primary-action className="dsh-learning-primary" type="button" disabled={response.trim() === '' || running} onClick={() => { void controller.runWorkAction('answer-questions', response) }}>{t.useMyInfo}</button><button className="dsh-learning-secondary" type="button" disabled={running} onClick={() => { void controller.runWorkAction('continue-with-defaults') }}>{t.continueRecommended}</button></div>
    </>
  }

  if (view.project.stage === 'brief' || view.project.stage === 'generating' || view.project.stage === 'revising') {
    return <>
      <div className="dsh-learning-kicker">{view.project.stageLabel}</div>
      <h1 className="dsh-learning-page-title">{view.project.title}</h1>
      <section className="dsh-learning-card"><strong>{t.savedBrief}</strong><p>{view.project.request}</p></section>
      {state.learnerError ? <InlineError>{state.learnerError}</InlineError> : null}
      {running || view.project.stage !== 'brief' ? <Processing label={state.operationLabel ?? t.creatingDraft} /> : <button data-primary-action className="dsh-learning-primary dsh-learning-wide" type="button" onClick={() => { void controller.runWorkAction('continue-with-defaults') }}>{t.retryCreate}</button>}
    </>
  }

  const artifact = view.artifact
  if (artifact === null) return <section className="dsh-learning-empty"><p>{t.artifactMissing}</p></section>

  if (view.project.stage === 'distilled') {
    return <>
      <div className="dsh-learning-kicker">{t.completedWork}</div>
      <h1 className="dsh-learning-page-title">{view.project.title}</h1>
      <section className="dsh-learning-card" data-emphasis><h3>{t.finalReady}</h3><p>{artifact.fileName}</p><div className="dsh-learning-actions"><button className="dsh-learning-primary" type="button" onClick={() => { void controller.downloadArtifact(artifact.version, 'pptx') }}>{t.downloadPptx}</button><button className="dsh-learning-secondary" type="button" onClick={() => { void controller.downloadArtifact(artifact.version, 'markdown') }}>{t.downloadOutline}</button></div>{state.downloadNotice ? <p className="dsh-learning-meta" role="status">{state.downloadNotice}</p> : null}</section>
      <section className="dsh-learning-card"><h3>{t.savedAssets}</h3><h4>{t.preferences}</h4><ul className="dsh-learning-list">{view.assets.preferences.map(item => <li key={item}>{item}</li>)}</ul><h4>{t.checklist}</h4><ul className="dsh-learning-list">{view.assets.checklist.map(item => <li key={item}>{item}</li>)}</ul></section>
      <section className="dsh-learning-card"><h3>{t.optionalLearning}</h3><p>{t.optionalLearningBody}</p><ul className="dsh-learning-list">{view.learning.topics.map(item => <li key={item}>{item}</li>)}</ul>{view.learning.selected ? <div className="dsh-learning-callout">{t.learningSelected}</div> : <div className="dsh-learning-actions" data-stack><button className="dsh-learning-secondary" type="button" disabled={running} onClick={() => { void controller.runWorkAction('select-learning') }}>{t.learnThis}</button><button data-primary-action className="dsh-learning-primary" type="button" onClick={() => controller.navigate({ kind: 'overview' })}>{t.finishNow}</button></div>}</section>
    </>
  }

  return <>
    <div className="dsh-learning-kicker">{t.stepTwo} · v{artifact.version}</div>
    <h1 className="dsh-learning-page-title">{view.project.title}</h1>
    <section className="dsh-learning-card" data-emphasis><h3>{t.coreThesis}</h3><p>{artifact.thesis}</p><div className="dsh-learning-actions"><button className="dsh-learning-primary" type="button" onClick={() => { void controller.downloadArtifact(artifact.version, 'pptx') }}>{t.downloadPptx}</button><button className="dsh-learning-secondary" type="button" onClick={() => { void controller.downloadArtifact(artifact.version, 'markdown') }}>{t.downloadOutline}</button></div>{state.downloadNotice ? <p className="dsh-learning-meta" role="status">{state.downloadNotice}</p> : null}</section>
    <div className="dsh-learning-deck">{artifact.pages.map(page => <article className="dsh-learning-slide-card" key={page.pageNumber}><span>{String(page.pageNumber).padStart(2, '0')}</span><div><h3>{page.title}</h3><p>{page.purpose}</p><ul>{page.keyPoints.map(point => <li key={point}>{point}</li>)}</ul></div></article>)}</div>
    {view.clarification.assumptions.length > 0 ? <details className="dsh-learning-details dsh-learning-card"><summary>{t.assumptions}</summary><ul className="dsh-learning-list">{view.clarification.assumptions.map(item => <li key={item}>{item}</li>)}</ul></details> : null}
    <section className="dsh-learning-card"><div className="dsh-learning-kicker">{t.stepThree}</div><h3>{t.reviseOrAccept}</h3><label className="dsh-learning-label" htmlFor={`work-response-${projectId}`}>{t.feedbackLabel}</label><textarea id={`work-response-${projectId}`} className="dsh-learning-input" value={response} disabled={running} placeholder={t.feedbackPlaceholder} onChange={event => saveResponse(event.currentTarget.value)} />{state.learnerError ? <InlineError>{state.learnerError}</InlineError> : null}{running ? <Processing label={state.operationLabel ?? t.revisingDraft} /> : null}<div className="dsh-learning-actions" data-stack><button className="dsh-learning-secondary" type="button" disabled={response.trim() === '' || running} onClick={() => { void controller.runWorkAction('revise-draft', response) }}>{t.applyFeedback}</button><button data-primary-action className="dsh-learning-primary" type="button" disabled={running} onClick={() => { void controller.runWorkAction('accept-draft') }}>{t.acceptVersion}</button></div></section>
    {view.versions.length > 1 ? <details className="dsh-learning-details"><summary>{t.versionHistory(view.versions.length)}</summary>{view.versions.map(version => <p className="dsh-learning-meta" key={version.version}>v{version.version} · {version.fileName}{version.feedback ? ` · ${version.feedback}` : ''}</p>)}</details> : null}
  </>
}
