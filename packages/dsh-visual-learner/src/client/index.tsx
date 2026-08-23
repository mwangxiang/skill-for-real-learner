import { useEffect, useState, type CSSProperties } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { SidebarOwnerProps } from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'

const PROBE_CHANNEL = '/dsh-visual-learner-v1'
const PROBE_STATUS_ENDPOINT = 'status'

interface ProbeStatus {
  hostLoaded: true
  protocolVersion: 1
  packageVersion: '0.0.2-alpha.0'
  skillCount: 10
  skillNames: readonly string[]
}

type Locale = 'zh-CN' | 'en'
type ProbeState = 'loading' | 'ready' | 'error'

const copy = {
  'zh-CN': {
    eyebrow: '官方 DSH Web · ABI 探针',
    title: '可视化学习插件已接管中心面板',
    loading: '正在验证 Host 与 Client 连接…',
    ready: 'Host 与 Client 已连接',
    error: '连接失败，请在开发者诊断中查看原始错误。',
    detail: '这一页只验证预构建 Bundle、官方插槽替换和 loopback RPC，不代表最终学习界面。',
    language: '界面语言',
  },
  en: {
    eyebrow: 'Official DSH Web · ABI probe',
    title: 'The visual learning plugin owns the center panel',
    loading: 'Verifying the Host and Client connection…',
    ready: 'Host and Client are connected',
    error: 'Connection failed. Open developer diagnostics for the original error.',
    detail: 'This page only proves the prebuilt Bundle, official slot replacement, and loopback RPC. It is not the final learning UI.',
    language: 'Interface language',
  },
} as const

const pageStyle: CSSProperties = {
  boxSizing: 'border-box',
  minHeight: '100%',
  display: 'grid',
  placeItems: 'center',
  padding: '32px',
  background: 'var(--background-primary, #ffffff)',
  color: 'var(--text-normal, #1f2937)',
  fontFamily: 'var(--font-interface, system-ui, sans-serif)',
}

const cardStyle: CSSProperties = {
  width: 'min(680px, 100%)',
  padding: '32px',
  border: '1px solid var(--background-modifier-border, #e5e7eb)',
  borderRadius: '18px',
  background: 'var(--background-secondary, #f8fafc)',
  boxShadow: '0 18px 55px rgba(15, 23, 42, 0.08)',
}

function initialLocale(): Locale {
  const saved = window.localStorage.getItem('dsh-visual-learner.locale')
  if (saved === 'zh-CN' || saved === 'en') return saved
  return window.navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

export const inject = ['slots', 'connection', 'layout']

export function apply(ctx: ClientContext): void {
  const connection = ctx.get('connection') as unknown as ConnectionHandle

  function ProbeSidebar({ collapsed }: SidebarOwnerProps) {
    useEffect(() => {
      if (!collapsed) ctx.layout.toggleSidebar()
    }, [collapsed])

    return (
      <aside
        data-dsh-visual-learner-sidebar="true"
        aria-label="Visual Learner"
        style={{
          boxSizing: 'border-box',
          height: '100%',
          display: 'grid',
          placeItems: 'center',
          borderRight: '1px solid var(--background-modifier-border, #e5e7eb)',
          background: 'var(--background-secondary, #f8fafc)',
          color: 'var(--interactive-accent, #7c3aed)',
          fontFamily: 'var(--font-interface, system-ui, sans-serif)',
          fontWeight: 800,
        }}
      >
        学
      </aside>
    )
  }

  function ProbePanel() {
    const [locale, setLocale] = useState<Locale>(initialLocale)
    const [state, setState] = useState<ProbeState>('loading')
    const [status, setStatus] = useState<ProbeStatus | null>(null)
    const t = copy[locale]

    useEffect(() => {
      const abort = new AbortController()
      void connection.rpc.call(PROBE_CHANNEL, PROBE_STATUS_ENDPOINT, {}, abort.signal)
        .then((result) => {
          if (!result.ok) throw new Error(result.error.message)
          const value = result.value as ProbeStatus
          if (value.hostLoaded !== true || value.protocolVersion !== 1 || value.skillCount !== 10) {
            throw new Error('unexpected probe response')
          }
          setStatus(value)
          setState('ready')
        })
        .catch(() => {
          if (!abort.signal.aborted) setState('error')
        })
      return () => abort.abort()
    }, [])

    const choose = (next: Locale) => {
      window.localStorage.setItem('dsh-visual-learner.locale', next)
      setLocale(next)
    }

    return (
      <main style={pageStyle} data-dsh-visual-learner-probe="true">
        <section style={cardStyle} aria-labelledby="dsh-visual-learner-title">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: '0 0 10px', color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>{t.eyebrow}</p>
              <h1 id="dsh-visual-learner-title" style={{ margin: 0, fontSize: '28px', lineHeight: 1.25 }}>{t.title}</h1>
            </div>
            <div role="group" aria-label={t.language} style={{ display: 'flex', gap: '6px' }}>
              {(['zh-CN', 'en'] as const).map(item => (
                <button
                  type="button"
                  key={item}
                  aria-pressed={locale === item}
                  onClick={() => choose(item)}
                  style={{
                    minHeight: '36px',
                    minWidth: '72px',
                    padding: '0 12px',
                    borderRadius: '9px',
                    border: '1px solid var(--background-modifier-border, #cbd5e1)',
                    background: locale === item ? 'var(--interactive-accent, #7c3aed)' : 'transparent',
                    color: locale === item ? 'var(--text-on-accent, #fff)' : 'inherit',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item === 'zh-CN' ? '简体中文' : 'English'}
                </button>
              ))}
            </div>
          </div>
          <div
            role="status"
            aria-live="polite"
            data-probe-state={state}
            style={{ margin: '28px 0 18px', padding: '16px 18px', borderRadius: '12px', background: 'var(--background-primary, #fff)' }}
          >
            {state === 'loading' ? t.loading : state === 'ready' ? t.ready : t.error}
            {status !== null && <span style={{ color: 'var(--text-muted, #64748b)' }}> · v{status.packageVersion}</span>}
            {status !== null && <span data-embedded-skill-count="10" style={{ color: 'var(--text-muted, #64748b)' }}> · {status.skillCount} Skills</span>}
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', lineHeight: 1.7 }}>{t.detail}</p>
        </section>
      </main>
    )
  }

  ctx.slots.inject('conversation', () => ctx.slots.register(
    { name: 'conversation', priority: -1 },
    ProbePanel,
  ))
  ctx.slots.inject('sidebar', () => ctx.slots.register(
    { name: 'sidebar', priority: -1 },
    ProbeSidebar,
  ))
}
