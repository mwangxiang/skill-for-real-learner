import type { ReactNode } from 'react'

export function InlineError({ children, code }: { children: ReactNode; code?: string }) {
  return <div className="dsh-learning-card" role="alert"><strong>{children}</strong>{code ? <details className="dsh-learning-details"><summary>给开发者的信息</summary><code>{code}</code></details> : null}</div>
}
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) { return <div className="dsh-learning-empty"><h3>{title}</h3>{children}</div> }
export function OperationStatus({ status }: { status: 'queued' | 'running' | 'waiting-user' | 'completed' | 'retry' }) {
  const labels = { queued: '正在排队…', running: '正在整理结果，可先关闭面板', 'waiting-user': '等待你的回答', completed: '已安全保存', retry: '结果没有整理成功，学习记录仍安全' }
  return <p className="dsh-learning-meta" aria-live="polite">{labels[status]}</p>
}
