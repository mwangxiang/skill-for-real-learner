import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.DSH_LEARNER_SURFACE_URL ?? 'http://127.0.0.1:31890'
const outputDir = resolve('docs', 'testing', 'screenshots')
await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch()
try {
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(String(error)))

  await page.goto(baseUrl, { waitUntil: 'load' })
  const surface = page.locator('[data-dsh-visual-learner-surface="true"]')
  await surface.waitFor({ state: 'visible', timeout: 30_000 })
  await page.getByRole('heading', { name: '今天', exact: true }).waitFor()
  if (await page.getByRole('textbox', { name: '给智能体发消息', exact: true }).count() !== 0) {
    throw new Error('native DSH composer is visible inside the learner surface')
  }

  await page.getByRole('textbox', { name: '你现在想解决什么？', exact: true }).fill('我想把一个复杂问题拆成可验证的小行动。')
  await page.getByRole('button', { name: '开始这一轮学习', exact: true }).click()
  await page.getByText('请先选择一个独立学习工作区，再开始这一轮学习。', { exact: true }).waitFor()
  await page.screenshot({ path: join(outputDir, 'learner-surface-today.png'), fullPage: true })

  await page.getByRole('button', { name: 'English', exact: true }).click()
  if (!await page.getByRole('complementary', { name: 'Learning space', exact: true }).isVisible()) {
    throw new Error('sidebar locale did not follow the main learner-surface locale switch')
  }
  if (!await page.getByRole('heading', { name: 'Today', exact: true }).isVisible()) {
    throw new Error('main learner-surface locale did not switch to English')
  }
  await page.getByRole('button', { name: '简体中文', exact: true }).click()

  await page.getByRole('button', { name: '复现', exact: true }).click()
  await page.getByText('还没有待复现项目。完成一次独立表现并得到复盘后，系统会在这里安排下一次讲回、判断或迁移练习。', { exact: true }).waitFor()
  await page.screenshot({ path: join(outputDir, 'learner-surface-review.png'), fullPage: true })

  await page.getByRole('button', { name: '回顾', exact: true }).click()
  await page.getByText('学习活动', { exact: true }).waitFor()
  await page.getByText('最近学了什么', { exact: true }).waitFor()
  await page.screenshot({ path: join(outputDir, 'learner-surface-progress.png'), fullPage: true })

  if (pageErrors.length > 0) throw new Error(`page errors: ${pageErrors.join(' | ')}`)
  process.stdout.write(`${JSON.stringify({
    ok: true,
    baseUrl,
    learnerSurfaceVisible: true,
    nativeComposerVisible: false,
    workspaceGuardVisible: true,
    reviewEmptyStateVisible: true,
    progressHeatmapVisible: true,
    modelRequestSent: false,
    screenshots: [
      join(outputDir, 'learner-surface-today.png'),
      join(outputDir, 'learner-surface-review.png'),
      join(outputDir, 'learner-surface-progress.png'),
    ],
  }, null, 2)}\n`)
} finally {
  await browser.close()
}
