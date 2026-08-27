import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const clientRoot = join(process.cwd(), 'packages', 'dsh-visual-learner', 'src-v01', 'client')

async function clientSource(): Promise<string> {
  const files: string[] = []
  async function walk(root: string): Promise<void> {
    for (const item of await readdir(root, { withFileTypes: true })) {
      const path = join(root, item.name)
      if (item.isDirectory()) await walk(path)
      else if (/\.(?:ts|tsx)$/u.test(item.name)) files.push(path)
    }
  }
  await walk(clientRoot)
  return (await Promise.all(files.map(path => readFile(path, 'utf8')))).join('\n')
}

describe('M2 Client contract', () => {
  it('registers only the Pilot utility entry and docked right sidebar', async () => {
    const source = await readFile(join(clientRoot, 'index.tsx'), 'utf8')
    const registered = [...source.matchAll(/name:\s*'([^']+)'/gu)].map(match => match[1])
    expect(registered).toEqual(['conversation.session.header.utilities', 'shell.right-sidebar'])
    expect(source).not.toMatch(/name:\s*'(?:root|sidebar|conversation|conversation\.session)'/u)
    expect(source).toContain('openRightSidebar')
    expect(source).toContain('closeRightSidebar')
  })

  it('does not read native conversation content or persist project truth in localStorage', async () => {
    const source = await clientSource()
    expect(source).not.toMatch(/lastAssistantText|ConversationSnapshot|\.nodes\b|assistantText/u)
    const storageWrites = [...source.matchAll(/localStorage\.setItem\(([^,]+)/gu)].map(match => match[1])
    expect(storageWrites).toEqual(["'dsh-learning.locale'"])
    expect(storageWrites.join(' ')).not.toMatch(/project|review|activity|route|step/u)
  })

  it('implements all five generic card types and the accessibility geometry contract', async () => {
    const source = await clientSource()
    for (const kind of ['question', 'guided-learning', 'decision', 'offline-task', 'review']) expect(source).toContain(`'${kind}'`)
    expect(source).toContain('data-dsh-visual-learner-pilot-panel="true"')
    expect(source).toContain('MutationObserver')
    expect(source).toContain('yieldToDockPeer')
    expect(source).toContain('data-primary-action')
    expect(source).toContain('nativeEvent.isComposing')
    expect(source).not.toContain('aria-modal="true"')
    const styles = await readFile(join(clientRoot, 'styles.ts'), 'utf8')
    expect(styles).toContain('box-sizing:border-box')
    expect(styles).toContain('width:100%')
    expect(styles).toContain('height:100%')
    expect(styles).not.toContain('position:fixed')
    expect(styles).not.toContain('box-shadow:-12px')
    expect(styles).toContain('@media(forced-colors:active)')
    expect(styles).not.toContain('@keyframes dsh-learning-slide')
  })

  it('never falls back to fixture projects in production pages', async () => {
    for (const file of ['OverviewPage.tsx', 'ReviewQueuePage.tsx', 'OutcomesPage.tsx', 'ProjectRoutePage.tsx', 'ActionPage.tsx']) {
      const source = await readFile(join(clientRoot, 'components', file), 'utf8')
      expect(source).not.toContain("from '../fixtures.ts'")
      expect(source).not.toMatch(/Transformer|历史研究文章|材料证据判断清单/u)
    }
    const state = await readFile(join(clientRoot, 'state.ts'), 'utf8')
    expect(state).toContain('reviewDueCount: 0')
    expect(state).not.toContain('reviewDueCount: 1')
  })

  it('uses the three-step work flow and prevents duplicate work submissions', async () => {
    const overview = await readFile(join(clientRoot, 'components', 'OverviewPage.tsx'), 'utf8')
    const project = await readFile(join(clientRoot, 'components', 'ProjectRoutePage.tsx'), 'utf8')
    expect(overview).toContain('t.workExample')
    expect(overview).toContain('t.startWorking')
    expect(project).toContain('t.stepTwo')
    expect(project).toContain('t.stepThree')
    expect(project).toContain("runWorkAction('revise-draft'")
    expect(project).toContain("runWorkAction('accept-draft'")
    expect(project).toContain("downloadArtifact(artifact.version, 'pptx')")
    const localizedCopy = await readFile(join(clientRoot, 'copy.ts'), 'utf8')
    expect(localizedCopy).toContain('告诉我想做什么')
    expect(localizedCopy).toContain('看 AI 做出的初稿')
    expect(localizedCopy).toContain('修改或确认')

    const state = await readFile(join(clientRoot, 'state.ts'), 'utf8')
    expect(state).toContain("if (this.state.operation === 'running') return false")
    expect(state).toContain("'work-panel/start'")
    expect(state).toContain("'work-panel/act'")
    expect(state).toContain("'work-panel/download'")

    const host = await readFile(join(clientRoot, '..', 'host', 'work-panel-service.ts'), 'utf8')
    expect(host).toContain('private readonly inFlight')
    expect(host).toContain('runStructuredSingleTurn')
    expect(host).toContain('writePresentationArtifact')
    expect(host).not.toContain('/study-review')
  })
})
