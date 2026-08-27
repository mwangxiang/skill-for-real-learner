import { DrawerController } from '../state.ts'

/**
 * Legacy export kept for old contract fixtures. WorkProject routes no longer render
 * a separate evidence-submission page; real work stays on ProjectRoutePage.
 */
export function ActionPage({ controller }: { controller: DrawerController; projectId?: string; stepId?: string; result?: boolean }) {
  return <section className="dsh-learning-empty"><p>这个旧学习步骤已经并入真实工作项目。</p><button type="button" className="dsh-learning-primary" onClick={() => controller.navigate({ kind: 'overview' })}>返回工作首页</button></section>
}
