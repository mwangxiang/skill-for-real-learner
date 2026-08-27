import { useState, useSyncExternalStore, type CSSProperties } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SidebarOwnerProps } from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'

type Locale = 'zh-CN' | 'en'
type LearnerView = 'today' | 'review' | 'progress'
type ConversationProps = PropsRuntime<'conversation'>

interface LearnerShellState {
  view: LearnerView
  activityCount: number
  reviewDue: boolean
}

class LearnerShellController {
  private state: LearnerShellState = { view: 'today', activityCount: 0, reviewDue: false }
  private readonly listeners = new Set<() => void>()

  getSnapshot = (): LearnerShellState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  setView(view: LearnerView): void {
    this.state = { ...this.state, view }
    this.emit()
  }

  recordActivity(): void {
    this.state = { ...this.state, activityCount: this.state.activityCount + 1 }
    this.emit()
  }

  markReviewDue(): void {
    this.state = { ...this.state, reviewDue: true }
    this.emit()
  }

  clearReviewDue(): void {
    this.state = { ...this.state, reviewDue: false }
    this.emit()
  }

  private emit(): void {
    for (const listener of this.listeners) listener()
  }
}

class LearnerLocaleController {
  private state: Locale = initialLocale()
  private readonly listeners = new Set<() => void>()

  getSnapshot = (): Locale => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  set(locale: Locale): void {
    this.state = locale
    window.localStorage.setItem('dsh-visual-learner.locale', locale)
    for (const listener of this.listeners) listener()
  }
}

const copy = {
  'zh-CN': {
    product: '学习空间',
    productHint: '从真实问题开始，用行动和证据推进学习',
    today: '今天',
    review: '复现',
    progress: '回顾',
    developer: '开发者界面',
    language: '界面语言',
    greeting: '从一个真实问题开始',
    greetingDetail: '不用先规划完整课程。说出你想解决的事，系统会只带你走下一小步。',
    goalLabel: '你现在想解决什么？',
    goalPlaceholder: '例如：我想做一个能带学习者完成练习和复现的可视化插件，但不知道第一步是什么。',
    begin: '开始这一轮学习',
    learning: '正在启动学习回合…',
    workspaceMissing: '请先选择一个独立学习工作区，再开始这一轮学习。',
    startFailed: '学习回合没有成功启动。请检查当前模型、工作区和网络状态后重试。',
    currentTitle: '当前学习',
    currentDetail: '系统会把目标交给学习方法处理，并把 AI 的最新反馈显示在这里。',
    responseTitle: 'AI 的当前反馈',
    responseEmpty: '开始学习后，AI 的第一条反馈会显示在这里。',
    replyLabel: '完成一个动作后，告诉我你做了什么或卡在哪里',
    replyPlaceholder: '例如：我已经画出三个页面，但不知道怎样让证据反馈进入下一步。',
    sendReply: '提交我的表现',
    reviewAction: '请求证据复盘',
    sending: '正在发送…',
    reviewTitle: '待复现',
    reviewEmpty: '还没有待复现项目。完成一次独立表现并得到复盘后，系统会在这里安排下一次讲回、判断或迁移练习。',
    reviewReady: '你有一项待复现练习',
    reviewReadyDetail: '不要重读材料。请先凭自己的理解完成一次讲回、判断或应用，再提交结果。',
    reviewDone: '我已完成这次复现',
    progressTitle: '学习回顾',
    progressDetail: '学习活动、关键证据和复现情况会从你的学习记录中投影到这里。',
    heatmapTitle: '学习活动',
    heatmapEmpty: '完成第一轮学习后，这里会显示真实学习记录生成的热力图。',
    recentTitle: '最近学了什么',
    recentEmpty: '还没有已验证的学习记录。第一轮结束后，你会在这里看到问题、行动、证据和下一步。',
    activityLabel: '本轮已提交的学习动作',
    sourceNote: '学习记录属于你；插件不会保存 API Key，也不会扫描未选择的目录。',
    fullPanelNote: '这是学习者界面。模型、Skill、会话和文件细节默认隐藏。',
    noSessionTitle: '先准备一个学习空间',
    noSessionDetail: '选择一个只用于学习的文件夹。你的知识、作品和学习记录会保留在那里；不要选择整个知识库或主力项目。',
    noSessionAction: '打开开发者界面选择工作区',
    returnToDeveloper: '返回开发者界面',
  },
  en: {
    product: 'Learning space',
    productHint: 'Start from a real problem and learn through action and evidence',
    today: 'Today',
    review: 'Review',
    progress: 'Reflect',
    developer: 'Developer surface',
    language: 'Interface language',
    greeting: 'Start with a real problem',
    greetingDetail: 'You do not need a complete course plan first. Describe what you need to solve, and the system will guide one next step.',
    goalLabel: 'What do you want to solve right now?',
    goalPlaceholder: 'For example: I want to build a visual plugin that guides practice and review, but I do not know the first step.',
    begin: 'Start this learning round',
    learning: 'Starting the learning round…',
    workspaceMissing: 'Choose a dedicated learning workspace before starting this learning round.',
    startFailed: 'The learning round did not start. Check the current model, workspace, and network, then retry.',
    currentTitle: 'Current learning',
    currentDetail: 'The system sends the goal through the learning methods and shows the latest AI feedback here.',
    responseTitle: 'Current AI feedback',
    responseEmpty: 'The first AI response will appear here after you start learning.',
    replyLabel: 'After one action, tell me what you did or where you are stuck',
    replyPlaceholder: 'For example: I designed three screens, but do not know how evidence should drive the next step.',
    sendReply: 'Submit my evidence',
    reviewAction: 'Request an evidence review',
    sending: 'Sending…',
    reviewTitle: 'Due for review',
    reviewEmpty: 'Nothing is due yet. After an independent performance and review, the system will schedule a recall, judgement, or transfer exercise here.',
    reviewReady: 'You have one review exercise due',
    reviewReadyDetail: 'Do not reread first. Explain, judge, or apply from memory, then submit the result.',
    reviewDone: 'I completed this review',
    progressTitle: 'Learning reflection',
    progressDetail: 'Learning activity, key evidence, and review status are projected here from your learning records.',
    heatmapTitle: 'Learning activity',
    heatmapEmpty: 'After the first complete learning round, a heatmap generated from real learning records will appear here.',
    recentTitle: 'Recently learned',
    recentEmpty: 'No verified learning records yet. After the first round, this will show the problem, action, evidence, and next step.',
    activityLabel: 'Learning actions submitted this round',
    sourceNote: 'Learning records belong to you. The plugin does not store API keys or scan unselected directories.',
    fullPanelNote: 'This is the learner surface. Model, Skill, session, and file details are hidden by default.',
    noSessionTitle: 'Prepare a learning space first',
    noSessionDetail: 'Choose a folder only for learning. Your knowledge, work, and learning records will remain there; do not choose your whole knowledge base or primary project.',
    noSessionAction: 'Open the developer surface to choose a workspace',
    returnToDeveloper: 'Return to developer surface',
  },
} as const

function initialLocale(): Locale {
  const saved = window.localStorage.getItem('dsh-visual-learner.locale')
  if (saved === 'zh-CN' || saved === 'en') return saved
  return window.navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

function cardStyle(extra: CSSProperties = {}): CSSProperties {
  return {
    border: '1px solid var(--background-modifier-border, #dbe2f0)',
    borderRadius: '18px',
    background: 'var(--background-primary, #ffffff)',
    boxShadow: '0 10px 30px rgb(15 23 42 / 6%)',
    ...extra,
  }
}

function buttonStyle(primary = false): CSSProperties {
  return {
    minHeight: '42px',
    padding: '0 16px',
    border: primary ? 0 : '1px solid var(--background-modifier-border, #cbd5e1)',
    borderRadius: '11px',
    background: primary ? 'var(--interactive-accent, #7c3aed)' : 'var(--background-primary, #ffffff)',
    color: primary ? 'var(--text-on-accent, #ffffff)' : 'var(--text-normal, #172033)',
    cursor: 'pointer',
    font: 'inherit',
    fontWeight: 700,
  }
}

function lastAssistantText(snapshot: unknown): string | undefined {
  if (snapshot === null || typeof snapshot !== 'object') return undefined
  const nodes = Reflect.get(snapshot, 'nodes')
  if (!Array.isArray(nodes)) return undefined
  for (const node of [...nodes].reverse()) {
    if (node === null || typeof node !== 'object' || Reflect.get(node, 'kind') !== 'assistant') continue
    const blocks = Reflect.get(node, 'blocks')
    if (!Array.isArray(blocks)) continue
    const text = blocks
      .filter(block => block !== null && typeof block === 'object' && Reflect.get(block, 'kind') === 'text')
      .map(block => String(Reflect.get(block, 'text') ?? ''))
      .join('\n')
      .trim()
    if (text !== '') return text
  }
  return undefined
}

function startPrompt(goal: string): string {
  return [
    `/teach-me ${goal}`,
    '请只推进一个最小学习块：先说明本课目标和一项可独立完成的表现任务。',
    '不要展示 Skill 名称、文件路径或工程实现细节；以简体中文面向普通学习者。',
  ].join('\n')
}

function evidencePrompt(goal: string, evidence: string): string {
  return [
    `当前真实问题：${goal}`,
    `学习者的独立表现或证据：${evidence}`,
    '请用学习者能理解的语言指出：这份证据能证明什么、还不能证明什么，以及唯一下一步。',
  ].join('\n')
}

function reviewPrompt(goal: string, evidence: string): string {
  return [
    `/study-review 请审查以下学习证据。`,
    `目标：${goal}`,
    `证据：${evidence}`,
    '请给出有边界的结论，并安排一项需要独立讲回、判断或迁移的复现任务。',
  ].join('\n')
}

export const inject = ['slots', 'sessions']

export function apply(ctx: ClientContext): void {
  const shell = new LearnerShellController()
  const learnerLocale = new LearnerLocaleController()

  function LearningSidebar({ collapsed }: SidebarOwnerProps) {
    const state = useSyncExternalStore(shell.subscribe, shell.getSnapshot, shell.getSnapshot)
    const locale = useSyncExternalStore(learnerLocale.subscribe, learnerLocale.getSnapshot, learnerLocale.getSnapshot)
    const t = copy[locale]
    const wide = !collapsed
    const nav: Array<{ id: LearnerView; icon: string; label: string }> = [
      { id: 'today', icon: '◎', label: t.today },
      { id: 'review', icon: '↺', label: t.review },
      { id: 'progress', icon: '▦', label: t.progress },
    ]

    return (
      <aside
        aria-label={t.product}
        style={{
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          padding: wide ? '20px 14px' : '20px 8px',
          borderRight: '1px solid var(--background-modifier-border, #e2e8f0)',
          background: 'var(--background-secondary, #f8fafc)',
          color: 'var(--text-normal, #172033)',
          fontFamily: 'var(--font-interface, system-ui, sans-serif)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: wide ? '0 8px' : 0, justifyContent: wide ? 'flex-start' : 'center' }}>
          <span aria-hidden style={{ color: 'var(--interactive-accent, #7c3aed)', fontSize: '24px', lineHeight: 1 }}>◒</span>
          {wide && <strong style={{ fontSize: '16px' }}>{t.product}</strong>}
        </div>
        {wide && <p style={{ margin: '0 8px', color: 'var(--text-muted, #64748b)', fontSize: '12px', lineHeight: 1.55 }}>{t.productHint}</p>}
        <nav aria-label={t.product} style={{ display: 'grid', gap: '6px' }}>
          {nav.map(item => (
            <button
              key={item.id}
              type="button"
              aria-current={state.view === item.id ? 'page' : undefined}
              onClick={() => shell.setView(item.id)}
              style={{
                minHeight: '42px',
                border: 0,
                borderRadius: '10px',
                background: state.view === item.id ? 'var(--background-modifier-active-hover, #ede9fe)' : 'transparent',
                color: state.view === item.id ? 'var(--interactive-accent, #6d28d9)' : 'inherit',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                justifyContent: wide ? 'flex-start' : 'center',
                padding: wide ? '0 10px' : 0,
                font: 'inherit',
                fontWeight: state.view === item.id ? 700 : 500,
              }}
            >
              <span aria-hidden>{item.icon}</span>
              {wide && <span>{item.label}</span>}
              {wide && item.id === 'review' && state.reviewDue && <span aria-label={t.reviewReady} style={{ marginLeft: 'auto', width: '8px', height: '8px', borderRadius: '999px', background: 'var(--interactive-accent, #7c3aed)' }} />}
            </button>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', display: wide ? 'flex' : 'grid', gap: '6px', padding: wide ? '8px' : 0, alignItems: 'center', justifyContent: wide ? 'space-between' : 'center' }}>
          {wide && <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '12px' }}>{t.language}</span>}
          <div role="group" aria-label={t.language} style={{ display: 'flex', gap: '4px' }}>
            {(['zh-CN', 'en'] as const).map(item => (
              <button
                key={item}
                type="button"
                aria-pressed={locale === item}
                onClick={() => {
                  learnerLocale.set(item)
                }}
                style={{ minWidth: '30px', minHeight: '28px', border: 0, borderRadius: '7px', background: locale === item ? 'var(--background-modifier-active-hover, #ede9fe)' : 'transparent', color: locale === item ? 'var(--interactive-accent, #6d28d9)' : 'inherit', cursor: 'pointer', font: 'inherit', fontSize: '12px', fontWeight: 700 }}
              >
                {item === 'zh-CN' ? '中' : 'EN'}
              </button>
            ))}
          </div>
        </div>
      </aside>
    )
  }

  function LearnerSurface({ sessionId, useSession }: ConversationProps) {
    const state = useSyncExternalStore(shell.subscribe, shell.getSnapshot, shell.getSnapshot)
    const locale = useSyncExternalStore(learnerLocale.subscribe, learnerLocale.getSnapshot, learnerLocale.getSnapshot)
    const [goal, setGoal] = useState('')
    const [evidence, setEvidence] = useState('')
    const [busy, setBusy] = useState<'start' | 'evidence' | 'review' | null>(null)
    const [notice, setNotice] = useState('')
    const snapshot = useSession(value => value)
    const latestResponse = lastAssistantText(snapshot)
    const t = copy[locale]

    const send = async (kind: 'start' | 'evidence' | 'review'): Promise<void> => {
      const cleanGoal = goal.trim()
      const cleanEvidence = evidence.trim()
      if (cleanGoal === '') {
        setNotice(t.goalLabel)
        return
      }
      if ((kind === 'evidence' || kind === 'review') && cleanEvidence === '') {
        setNotice(t.replyLabel)
        return
      }
      if (sessionId === undefined) {
        setNotice(t.workspaceMissing)
        return
      }
      const scope = ctx.sessions.scope(sessionId)
      const session = scope === undefined ? undefined : ctx.sessions.sessionOf(scope)
      if (session === undefined) {
        setNotice(t.workspaceMissing)
        return
      }
      const text = kind === 'start'
        ? startPrompt(cleanGoal)
        : kind === 'evidence'
          ? evidencePrompt(cleanGoal, cleanEvidence)
          : reviewPrompt(cleanGoal, cleanEvidence)
      setBusy(kind)
      setNotice('')
      try {
        const result = await session.prompt([{ type: 'text', text }], 'queue')
        if (!result.ok) throw new Error(result.error.message)
        shell.recordActivity()
        if (kind === 'review') shell.markReviewDue()
        if (kind === 'evidence') setEvidence('')
      } catch {
        setNotice(t.startFailed)
      } finally {
        setBusy(null)
      }
    }

    const pageTitle = state.view === 'today' ? t.today : state.view === 'review' ? t.review : t.progress

    return (
      <main
        data-dsh-visual-learner-surface="true"
        style={{
          minHeight: '100%',
          boxSizing: 'border-box',
          padding: 'clamp(20px, 4vw, 48px)',
          background: 'linear-gradient(150deg, var(--background-primary, #ffffff) 0%, var(--background-secondary, #f8fafc) 100%)',
          color: 'var(--text-normal, #172033)',
          fontFamily: 'var(--font-interface, system-ui, sans-serif)',
        }}
      >
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
          <header style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--interactive-accent, #7c3aed)', fontSize: '13px', fontWeight: 800, letterSpacing: '0.1em' }}>SKILLS FOR REAL LEARNERS</p>
              <h1 style={{ margin: '7px 0 0', fontSize: 'clamp(26px, 4vw, 38px)', letterSpacing: '-0.04em' }}>{pageTitle}</h1>
            </div>
            <div role="group" aria-label={t.language} style={{ display: 'flex', gap: '6px' }}>
              {(['zh-CN', 'en'] as const).map(item => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={locale === item}
                  onClick={() => {
                    learnerLocale.set(item)
                  }}
                  style={{ ...buttonStyle(locale === item), minHeight: '34px', padding: '0 11px' }}
                >
                  {item === 'zh-CN' ? '简体中文' : 'English'}
                </button>
              ))}
            </div>
          </header>

          {state.view === 'today' && (
            <section style={{ display: 'grid', gap: '18px' }}>
              <article style={{ ...cardStyle({ padding: 'clamp(22px, 4vw, 42px)', background: 'linear-gradient(135deg, #f5f3ff 0%, #ffffff 65%)' }) }}>
                <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', lineHeight: 1.7 }}>{t.greetingDetail}</p>
                <h2 style={{ margin: '14px 0 0', fontSize: 'clamp(24px, 3vw, 34px)', letterSpacing: '-0.03em' }}>{t.greeting}</h2>
                <label style={{ display: 'grid', gap: '9px', marginTop: '24px', fontWeight: 800 }}>
                  <span>{t.goalLabel}</span>
                  <textarea
                    value={goal}
                    onChange={event => setGoal(event.target.value)}
                    placeholder={t.goalPlaceholder}
                    rows={4}
                    disabled={busy !== null}
                    style={{ minHeight: '110px', resize: 'vertical', padding: '14px', border: '1px solid var(--background-modifier-border, #cbd5e1)', borderRadius: '13px', background: 'var(--background-primary, #ffffff)', color: 'inherit', font: 'inherit', lineHeight: 1.6 }}
                  />
                </label>
                <button type="button" disabled={busy !== null} onClick={() => void send('start')} style={{ ...buttonStyle(true), width: '100%', marginTop: '14px' }}>
                  {busy === 'start' ? t.learning : t.begin}
                </button>
                {notice !== '' && <p role="alert" style={{ margin: '13px 0 0', color: 'var(--text-error, #b42318)', lineHeight: 1.6 }}>{notice}</p>}
              </article>

              <article style={{ ...cardStyle({ padding: '24px' }) }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px' }}>{t.currentTitle}</h2>
                  <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>{t.activityLabel} · {state.activityCount}</span>
                </div>
                <p style={{ margin: '10px 0 0', color: 'var(--text-muted, #64748b)', lineHeight: 1.65 }}>{t.currentDetail}</p>
                <div style={{ marginTop: '18px', padding: '16px', borderRadius: '12px', background: 'var(--background-secondary, #f8fafc)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                  {latestResponse ?? t.responseEmpty}
                </div>
                <label style={{ display: 'grid', gap: '9px', marginTop: '20px', fontWeight: 800 }}>
                  <span>{t.replyLabel}</span>
                  <textarea
                    value={evidence}
                    onChange={event => setEvidence(event.target.value)}
                    placeholder={t.replyPlaceholder}
                    rows={4}
                    disabled={busy !== null}
                    style={{ minHeight: '100px', resize: 'vertical', padding: '14px', border: '1px solid var(--background-modifier-border, #cbd5e1)', borderRadius: '13px', background: 'var(--background-primary, #ffffff)', color: 'inherit', font: 'inherit', lineHeight: 1.6 }}
                  />
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '14px' }}>
                  <button type="button" disabled={busy !== null || evidence.trim() === ''} onClick={() => void send('evidence')} style={buttonStyle(true)}>
                    {busy === 'evidence' ? t.sending : t.sendReply}
                  </button>
                  <button type="button" disabled={busy !== null || evidence.trim() === ''} onClick={() => void send('review')} style={buttonStyle()}>
                    {busy === 'review' ? t.sending : t.reviewAction}
                  </button>
                </div>
              </article>
            </section>
          )}

          {state.view === 'review' && (
            <section style={{ display: 'grid', gap: '18px' }}>
              <article style={{ ...cardStyle({ padding: 'clamp(24px, 4vw, 42px)' }) }}>
                <h2 style={{ margin: 0, fontSize: '26px' }}>{state.reviewDue ? t.reviewReady : t.reviewTitle}</h2>
                <p style={{ margin: '14px 0 0', color: 'var(--text-muted, #64748b)', lineHeight: 1.75 }}>{state.reviewDue ? t.reviewReadyDetail : t.reviewEmpty}</p>
                {state.reviewDue && <button type="button" onClick={() => shell.clearReviewDue()} style={{ ...buttonStyle(true), marginTop: '20px' }}>{t.reviewDone}</button>}
              </article>
              <article style={{ ...cardStyle({ padding: '22px' }) }}>
                <strong>{t.sourceNote}</strong>
                <p style={{ margin: '8px 0 0', color: 'var(--text-muted, #64748b)', lineHeight: 1.65 }}>{t.fullPanelNote}</p>
              </article>
            </section>
          )}

          {state.view === 'progress' && (
            <section style={{ display: 'grid', gap: '18px' }}>
              <article style={{ ...cardStyle({ padding: '24px' }) }}>
                <h2 style={{ margin: 0, fontSize: '22px' }}>{t.heatmapTitle}</h2>
                <p style={{ margin: '9px 0 0', color: 'var(--text-muted, #64748b)', lineHeight: 1.65 }}>{t.heatmapEmpty}</p>
                <div aria-label={t.heatmapTitle} style={{ display: 'grid', gridTemplateColumns: 'repeat(14, minmax(12px, 1fr))', gap: '7px', marginTop: '20px', maxWidth: '620px' }}>
                  {Array.from({ length: 56 }, (_, index) => (
                    <span key={index} aria-hidden style={{ aspectRatio: '1', borderRadius: '4px', border: '1px solid var(--background-modifier-border, #e2e8f0)', background: index < state.activityCount ? 'var(--interactive-accent, #7c3aed)' : 'var(--background-secondary, #f8fafc)' }} />
                  ))}
                </div>
              </article>
              <article style={{ ...cardStyle({ padding: '24px' }) }}>
                <h2 style={{ margin: 0, fontSize: '22px' }}>{t.recentTitle}</h2>
                <p style={{ margin: '10px 0 0', color: 'var(--text-muted, #64748b)', lineHeight: 1.65 }}>{t.recentEmpty}</p>
              </article>
            </section>
          )}

          <footer style={{ marginTop: '28px', color: 'var(--text-muted, #64748b)', fontSize: '13px', lineHeight: 1.6 }}>{t.sourceNote}</footer>
        </div>
      </main>
    )
  }

  ctx.slots.inject('sidebar', () => ctx.slots.register(
    { name: 'sidebar', priority: -1 },
    LearningSidebar,
  ))
  ctx.slots.inject('conversation', () => ctx.slots.register(
    { name: 'conversation', priority: -1 },
    LearnerSurface,
  ))
}
