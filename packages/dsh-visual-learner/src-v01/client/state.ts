import { useSyncExternalStore } from 'react'
import {
  createWorkRequest,
  type WorkArtifactDownload,
  type WorkProjectViewModel,
  type WorkRpcResult,
} from '../protocol/index.ts'
import type { Locale } from './copy.ts'

export type Page =
  | { kind: 'overview' }
  | { kind: 'reviews' }
  | { kind: 'outcomes' }
  | { kind: 'new-project' }
  | { kind: 'route'; projectId: string }

export interface RpcCarrier {
  call(channel: '/api', endpoint: string, payload: { args: { request: unknown } }): Promise<{ ok: true; value: unknown } | { ok: false; error: unknown }>
}

interface DrawerState {
  open: boolean
  narrowNotice: boolean
  locale: Locale
  page: Page
  width: number
  reviewDueCount: number
  project: WorkProjectViewModel | null
  projects: WorkProjectViewModel[]
  operation: 'idle' | 'running' | 'error'
  operationLabel: string | null
  learnerError: string | null
  downloadNotice: string | null
}

function initialLocale(): Locale {
  const saved = window.localStorage.getItem('dsh-learning.locale')
  if (saved === 'zh-CN' || saved === 'en') return saved
  return window.navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

function operationId(): string {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `web-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export class DrawerController {
  private state: DrawerState = { open: false, narrowNotice: false, locale: initialLocale(), page: { kind: 'overview' }, width: Number(window.localStorage.getItem('dsh-learning.width')) || 520, reviewDueCount: 0, project: null, projects: [], operation: 'idle', operationLabel: null, learnerError: null, downloadNotice: null }
  private readonly listeners = new Set<() => void>()
  private readonly drafts = new Map<string, string>()
  private nativeSessionId: string | null = null
  readonly trigger = { current: null as HTMLButtonElement | null }

  constructor(private readonly rpc?: RpcCarrier) {}
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener) }
  private set(next: Partial<DrawerState>) { this.state = { ...this.state, ...next }; for (const listener of this.listeners) listener() }
  open() { if (window.innerWidth < 768) this.set({ narrowNotice: true, open: false }); else this.set({ open: true, narrowNotice: false }) }
  close() { this.set({ open: false }); queueMicrotask(() => this.trigger.current?.focus()) }
  dismissNarrow() { this.set({ narrowNotice: false }); queueMicrotask(() => this.trigger.current?.focus()) }
  navigate(page: Page) { this.set({ page, learnerError: null, downloadNotice: null }) }
  setLocale(locale: Locale) { window.localStorage.setItem('dsh-learning.locale', locale); this.set({ locale }) }
  setWidth(width: number) { const max = Math.min(720, window.innerWidth / 2); const bounded = Math.max(380, Math.min(max, width)); window.localStorage.setItem('dsh-learning.width', String(bounded)); this.set({ width: bounded }) }
  getDraft(key: string) { return this.drafts.get(key) ?? '' }
  setDraft(key: string, value: string) { this.drafts.set(key, value) }
  openProject(project: WorkProjectViewModel) { this.set({ project, page: { kind: 'route', projectId: project.project.projectId }, learnerError: null }) }
  setNativeSession(id: string) { if (this.nativeSessionId === id) return; this.nativeSessionId = id; void this.refreshProjects() }

  private async call<T>(endpoint: string, payload: object): Promise<WorkRpcResult<T>> {
    if (this.rpc === undefined || this.nativeSessionId === null) return { ok: false, error: { code: 'INVALID_REQUEST', learnerMessage: '请先在 Harness 中打开一个工作目录。' } }
    const outer = await this.rpc.call('/api', endpoint, { args: { request: createWorkRequest({ currentSessionId: this.nativeSessionId, ...payload }) } })
    if (!outer.ok || outer.value === null || typeof outer.value !== 'object') return { ok: false, error: { code: 'INVALID_REQUEST', learnerMessage: '工作面板暂时无法连接，请重试。' } }
    return outer.value as WorkRpcResult<T>
  }

  private replaceProject(project: WorkProjectViewModel): WorkProjectViewModel[] {
    return [project, ...this.state.projects.filter(item => item.project.projectId !== project.project.projectId)]
  }

  async refreshProjects(): Promise<void> {
    if (this.rpc === undefined || this.nativeSessionId === null) return
    const result = await this.call<{ schemaVersion: '0.3.0'; projects: WorkProjectViewModel[] }>('work-panel/list', {})
    if (!result.ok) return
    const reviewDueCount = result.value.projects.filter(item => item.learning.offered && !item.learning.selected).length
    this.set({ projects: result.value.projects, reviewDueCount })
  }

  async startProject(request: string): Promise<boolean> {
    if (this.state.operation === 'running') return false
    this.set({ operation: 'running', operationLabel: 'AI 正在理解需求并制作第一版…', learnerError: null, downloadNotice: null })
    const result = await this.call<WorkProjectViewModel>('work-panel/start', { request, locale: this.state.locale, operationId: operationId() })
    if (!result.ok) { this.set({ operation: 'error', operationLabel: null, learnerError: result.error.learnerMessage }); return false }
    this.set({ operation: 'idle', operationLabel: null, project: result.value, projects: this.replaceProject(result.value), page: { kind: 'route', projectId: result.value.project.projectId } })
    return true
  }

  async runWorkAction(action: 'answer-questions' | 'continue-with-defaults' | 'revise-draft' | 'accept-draft' | 'select-learning', response?: string): Promise<boolean> {
    if (this.state.operation === 'running' || this.state.project === null) return false
    const labels: Record<typeof action, string> = {
      'answer-questions': 'AI 正在根据补充信息制作第一版…',
      'continue-with-defaults': 'AI 正在按推荐方案制作第一版…',
      'revise-draft': 'AI 正在根据你的集中反馈修改成品…',
      'accept-draft': '正在保存终稿并沉淀可复用方法…',
      'select-learning': '正在准备可选学习内容…',
    }
    const projectId = this.state.project.project.projectId
    this.set({ operation: 'running', operationLabel: labels[action], learnerError: null, downloadNotice: null })
    const result = await this.call<WorkProjectViewModel>('work-panel/act', { projectId, action, response, operationId: operationId() })
    if (!result.ok) { this.set({ operation: 'error', operationLabel: null, learnerError: result.error.learnerMessage }); return false }
    this.set({ operation: 'idle', operationLabel: null, project: result.value, projects: this.replaceProject(result.value), page: { kind: 'route', projectId } })
    return true
  }

  async downloadArtifact(version: number, format: 'pptx' | 'markdown'): Promise<boolean> {
    if (this.state.project === null) return false
    this.set({ downloadNotice: '正在准备下载…', learnerError: null })
    const projectId = this.state.project.project.projectId
    const chunks: ArrayBuffer[] = []
    let offset = 0
    let metadata: WorkArtifactDownload | null = null
    do {
      const result = await this.call<WorkArtifactDownload>('work-panel/download', { projectId, version, format, offset })
      if (!result.ok) { this.set({ downloadNotice: null, learnerError: result.error.learnerMessage }); return false }
      metadata = result.value
      const binary = atob(result.value.chunkBase64)
      const buffer = new ArrayBuffer(binary.length)
      const bytes = new Uint8Array(buffer)
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
      chunks.push(buffer)
      offset = result.value.nextOffset ?? 0
    } while (metadata.nextOffset !== null)
    const url = URL.createObjectURL(new Blob(chunks, { type: metadata.mimeType }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = metadata.fileName
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1_000)
    this.set({ downloadNotice: `已准备 ${metadata.fileName}，浏览器将开始下载。` })
    return true
  }
}

export function useDrawer(controller: DrawerController) { return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot) }
