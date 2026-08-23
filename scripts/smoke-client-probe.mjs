import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.DSH_PROBE_URL ?? 'http://127.0.0.1:31888'
const outputDir = resolve('docs', 'testing', 'screenshots')
await mkdir(outputDir, { recursive: true })

async function clickIfVisible(locator, timeout = 15_000) {
  try {
    await locator.waitFor({ state: 'visible', timeout })
    await locator.click()
    await locator.waitFor({ state: 'hidden', timeout: 5_000 })
    return true
  } catch (error) {
    if (await locator.count() > 0 && await locator.isVisible()) throw error
    return false
  }
}

const browser = await chromium.launch()
try {
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(String(error)))

  await page.goto(baseUrl, { waitUntil: 'load' })
  const probe = page.locator('[data-dsh-visual-learner-probe="true"]')
  await probe.waitFor({ timeout: 30_000 })
  await page.locator('[data-probe-state="ready"]').waitFor({ timeout: 15_000 })
  await page.locator('[data-embedded-skill-count="10"]').waitFor({ timeout: 5_000 })
  await clickIfVisible(page.getByRole('button', { name: /^(继续|Continue)$/ }))
  await clickIfVisible(page.getByRole('button', { name: /^(稍后配置|Configure later)$/ }))

  const chineseTitle = await page.locator('#dsh-visual-learner-title').textContent()
  if (chineseTitle !== '可视化学习插件已接管中心面板') {
    throw new Error(`unexpected Simplified Chinese title: ${JSON.stringify(chineseTitle)}`)
  }
  if (await page.locator('textarea:enabled').count() !== 0) {
    throw new Error('the native conversation composer is still visible')
  }
  await page.locator('[data-dsh-visual-learner-sidebar="true"]').waitFor({ timeout: 5_000 })
  await page.locator('[data-sidebar-collapsed="true"]').waitFor({ timeout: 5_000 })
  if (await page.getByText('DSH Local Build', { exact: false }).count() !== 0) {
    throw new Error('the native DSH sidebar is still visible')
  }
  await page.screenshot({ path: join(outputDir, 'abi-probe-zh-cn.png'), fullPage: true })

  await page.getByRole('button', { name: 'English' }).click()
  const englishTitle = await page.locator('#dsh-visual-learner-title').textContent()
  if (englishTitle !== 'The visual learning plugin owns the center panel') {
    throw new Error(`unexpected English title: ${JSON.stringify(englishTitle)}`)
  }
  await page.screenshot({ path: join(outputDir, 'abi-probe-en.png'), fullPage: true })

  await page.reload({ waitUntil: 'load' })
  await page.locator('[data-probe-state="ready"]').waitFor({ timeout: 15_000 })
  const restoredTitle = await page.locator('#dsh-visual-learner-title').textContent()
  if (restoredTitle !== englishTitle) throw new Error('locale did not survive reload')
  if (pageErrors.length > 0) throw new Error(`page errors: ${pageErrors.join(' | ')}`)

  process.stdout.write(`${JSON.stringify({
    ok: true,
    baseUrl,
    hostRpc: 'ready',
    embeddedSkills: 10,
    nativeComposerVisible: false,
    nativeSidebarVisible: false,
    locales: ['zh-CN', 'en'],
    localePersistsAcrossReload: true,
    screenshots: [
      join(outputDir, 'abi-probe-zh-cn.png'),
      join(outputDir, 'abi-probe-en.png'),
    ],
  }, null, 2)}\n`)
} finally {
  await browser.close()
}
