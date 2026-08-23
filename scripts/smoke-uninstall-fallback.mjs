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
  await page.getByText('DSH Local Build', { exact: false }).waitFor({ timeout: 30_000 })
  await clickIfVisible(page.getByRole('button', { name: /^(继续|Continue)$/ }))
  await clickIfVisible(page.getByRole('button', { name: /^(稍后配置|Configure later)$/ }))

  if (await page.locator('[data-dsh-visual-learner-probe="true"]').count() !== 0) {
    throw new Error('visual learner probe still renders after uninstall')
  }
  if (!await page.getByText('DSH Local Build', { exact: false }).isVisible()) {
    throw new Error('official DSH sidebar did not return after uninstall')
  }
  if (pageErrors.length > 0) throw new Error(`page errors: ${pageErrors.join(' | ')}`)
  await page.screenshot({ path: join(outputDir, 'abi-probe-uninstalled.png'), fullPage: true })

  process.stdout.write(`${JSON.stringify({
    ok: true,
    baseUrl,
    visualLearnerVisible: false,
    officialSidebarRestored: true,
    screenshot: join(outputDir, 'abi-probe-uninstalled.png'),
  }, null, 2)}\n`)
} finally {
  await browser.close()
}
