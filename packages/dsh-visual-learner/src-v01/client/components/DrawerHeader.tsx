import { copy } from '../copy.ts'
import { DrawerController, useDrawer } from '../state.ts'

export function DrawerHeader({ controller, back }: { controller: DrawerController; back?: () => void }) {
  const state = useDrawer(controller)
  const t = copy[state.locale]
  return (
    <header className="dsh-learning-header">
      {back ? <button type="button" className="dsh-learning-icon-button" aria-label={t.backOverview} onClick={back}>←</button> : null}
      <h2 id="dsh-learning-title">{t.title}</h2>
      <span className="dsh-learning-header-spacer" />
      <button type="button" className="dsh-learning-text-button" aria-label={state.locale === 'zh-CN' ? 'Switch to English' : '切换到简体中文'} onClick={() => controller.setLocale(state.locale === 'zh-CN' ? 'en' : 'zh-CN')}>{state.locale === 'zh-CN' ? 'EN' : '中文'}</button>
      <button type="button" className="dsh-learning-icon-button" aria-label={t.close} onClick={() => controller.close()}>×</button>
    </header>
  )
}
