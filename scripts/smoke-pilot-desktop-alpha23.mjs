import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { _electron as electron } from 'playwright'

const pilotRoot = resolve(process.env.PILOT_HARNESS_ROOT ?? 'D:\\DeepSeek-Harness-Lab\\pilot-harness')
const dshHome = resolve(process.env.PILOT_HARNESS_DSH_HOME ?? 'D:\\DeepSeek-Harness-Lab\\.dsh-pilot-alpha19-smoke')
const evidenceRoot = resolve(process.env.PILOT_ALPHA23_EVIDENCE ?? 'evidence/pilot-desktop-alpha23')
const appRoot = join(pilotRoot, 'apps', 'desktop')
const pilotRequire = createRequire(join(appRoot, 'package.json'))
const electronExecutable = pilotRequire('electron')
const userData = await mkdtemp(join(process.env.TEMP ?? tmpdir(), 'pilot-alpha22-electron-'))
const desktopEnv = { ...process.env }
delete desktopEnv.ELECTRON_RUN_AS_NODE
await mkdir(evidenceRoot, { recursive: true })

const errors = []
const observations = []
const app = await electron.launch({
  executablePath: electronExecutable,
  args: ['.', '--lang=zh-CN', `--user-data-dir=${userData}`],
  cwd: appRoot,
  env: {
    ...desktopEnv,
    PILOT_HARNESS_DSH_HOME: dshHome,
  },
})

const capture = async (page, name) => {
  const path = join(evidenceRoot, name)
  await page.screenshot({ path })
  return path
}

const box = async locator => {
  const value = await locator.boundingBox()
  if (value === null) throw new Error(`missing box for ${await locator.getAttribute('class') ?? 'locator'}`)
  return value
}

const assertContained = async (page, label) => {
  const panel = page.locator('[data-dsh-visual-learner-pilot-panel="true"]')
  const panelBox = await box(panel)
  const nav = panel.locator('.dsh-learning-nav')
  const navCount = await nav.count()
  const navBox = navCount === 0 ? null : await box(nav)
  const frameOverflow = await page.locator('[data-pilot-shell="frame"]').evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }))
  if (navBox !== null) {
    const insideX = navBox.x >= panelBox.x - 1 && navBox.x + navBox.width <= panelBox.x + panelBox.width + 1
    const insideY = navBox.y >= panelBox.y - 1 && navBox.y + navBox.height <= panelBox.y + panelBox.height + 1
    if (!insideX || !insideY) throw new Error(`${label}: navigation escaped panel: ${JSON.stringify({ panelBox, navBox })}`)
  }
  if (frameOverflow.scrollWidth > frameOverflow.clientWidth + 1 || frameOverflow.scrollHeight > frameOverflow.clientHeight + 1) {
    throw new Error(`${label}: frame overflow: ${JSON.stringify(frameOverflow)}`)
  }
  observations.push({ label, panelBox, navBox, frameOverflow })
  return panelBox
}

try {
  const page = await app.firstWindow()
  page.on('pageerror', error => { errors.push(`pageerror: ${error.message}`) })
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`) })
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => document.documentElement.dataset.codepilotTheme === 'true')

  const skipProvider = page.getByRole('button', { name: /^(暂时跳过|Skip for now)$/ })
  const dismissProvider = async () => {
    if (await skipProvider.isVisible().catch(() => false)) await skipProvider.click()
  }

  const session = page.getByRole('treeitem').filter({ hasText: /Pilot alpha\.19 native sidebar smoke/ }).first()
  await session.waitFor({ timeout: 15_000 })
  await session.click()
  await dismissProvider()

  const openWorkspace = page.getByRole('button', { name: /^(打开工作空间|Open workspace)$/ })
  await openWorkspace.waitFor({ timeout: 15_000 })
  await openWorkspace.click()
  const panel = page.locator('[data-dsh-visual-learner-pilot-panel="true"]')
  await panel.waitFor({ state: 'visible', timeout: 10_000 })
  try {
    await panel.getByText(/学习插件项目阶段汇报/).first().waitFor({ timeout: 10_000 })
  } catch (error) {
    await capture(page, '01-alpha23-project-load-failure.png')
    throw new Error(`work projects did not load: ${await panel.innerText()}\n${String(error)}`)
  }

  const sizes = [
    { width: 1280, height: 720, name: '02-alpha23-1280x720.png' },
    { width: 1600, height: 900, name: '03-alpha23-1600x900.png' },
    { width: 1920, height: 1080, name: '04-alpha23-1920x1080.png' },
  ]
  for (const size of sizes) {
    await app.evaluate(({ BrowserWindow }, next) => { BrowserWindow.getAllWindows()[0]?.setContentSize(next.width, next.height) }, size)
    await page.waitForTimeout(250)
    await assertContained(page, `${size.width}x${size.height}`)
    await capture(page, size.name)
  }

  const resizeHandle = page.locator('[data-side="right-sidebar"][role="separator"]')
  const before = await box(panel)
  const handleBox = await box(resizeHandle)
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + 180)
  await page.mouse.down()
  await page.mouse.move(handleBox.x - 120, handleBox.y + 180, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(250)
  const afterPointer = await assertContained(page, 'pointer-resize')
  if (afterPointer.width <= before.width + 40) throw new Error(`pointer resize did not widen panel: ${before.width} -> ${afterPointer.width}`)
  await capture(page, '05-alpha23-pointer-resized.png')

  await resizeHandle.evaluate((element) => {
    window.__pilotAlpha23Key = null
    element.addEventListener('keydown', event => { window.__pilotAlpha23Key = { key: event.key, shiftKey: event.shiftKey } }, { once: true })
  })
  await resizeHandle.press('ArrowRight')
  await page.waitForTimeout(350)
  const afterKey = await box(panel)
  if (Math.abs(afterKey.width - (afterPointer.width - 16)) > 2) {
    const keyboardDebug = await page.evaluate(() => ({
      active: document.activeElement?.outerHTML,
      event: window.__pilotAlpha23Key,
    }))
    throw new Error(`keyboard 16px step failed: ${afterPointer.width} -> ${afterKey.width}; ${JSON.stringify(keyboardDebug)}`)
  }
  await resizeHandle.press('Shift+ArrowLeft')
  await page.waitForTimeout(350)
  const afterShiftKey = await assertContained(page, 'keyboard-resize')
  if (Math.abs(afterShiftKey.width - (afterKey.width + 64)) > 2) throw new Error(`keyboard 64px step failed: ${afterKey.width} -> ${afterShiftKey.width}`)

  await app.evaluate(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0]?.webContents.setZoomFactor(2) })
  await page.waitForTimeout(700)
  const zoomState = await page.locator('[data-pilot-shell="frame"]').evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    rightCollapsed: element.hasAttribute('data-right-sidebar-collapsed'),
  }))
  if (zoomState.scrollWidth > zoomState.clientWidth + 1) {
    const overflowElements = await page.locator('[data-pilot-shell="frame"]').evaluate((frame) => {
      const frameBox = frame.getBoundingClientRect()
      return [...frame.querySelectorAll('*')].map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          tag: element.tagName,
          className: element.className,
          dataSide: element.getAttribute('data-side'),
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          left: rect.left,
          right: rect.right,
          frameRight: frameBox.right,
        }
      }).filter(item => item.scrollWidth > item.clientWidth + 1 || item.right > item.frameRight + 1).slice(0, 20)
    })
    throw new Error(`200% zoom overflow: ${JSON.stringify({ zoomState, overflowElements })}`)
  }
  observations.push({ label: 'zoom-200', ...zoomState })
  await capture(page, '06-alpha23-zoom-200.png')
  await app.evaluate(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0]?.webContents.setZoomFactor(1) })
  await app.evaluate(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0]?.setContentSize(1920, 1080) })
  await page.waitForTimeout(700)

  await page.locator('[data-pilot-nav="new-session"]').click()
  await panel.waitFor({ state: 'detached', timeout: 10_000 })
  observations.push({ label: 'blank-session', panelCount: await page.locator('[data-dsh-visual-learner-pilot-panel="true"]').count() })
  await capture(page, '07-alpha23-blank-session-closed.png')

  await session.click()
  await openWorkspace.click()
  await panel.waitFor({ state: 'visible', timeout: 10_000 })
  await page.waitForFunction(() => (document.querySelector('[data-dsh-visual-learner-pilot-panel="true"]')?.getBoundingClientRect().width ?? 0) >= 319, undefined, { timeout: 3_000 })
  await assertContained(page, 'final-desktop')
  await capture(page, '08-alpha23-final-desktop.png')

  if (errors.length > 0) throw new Error(`renderer errors: ${JSON.stringify(errors)}`)
  const result = { ok: true, version: '0.1.0-alpha.23', observations, errors }
  await writeFile(join(evidenceRoot, 'runtime.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(result, null, 2))
} finally {
  await app.close()
}
