import { mkdir, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import PptxGenJSImport from 'pptxgenjs'
import type { ArtifactVersion, DeckProjection, PresentationPage } from '../domain/work-types.ts'

const DEFAULT_PAGE_TITLES = ['结论先行', '项目进展', '关键成果', '时间与资源流向', '当前困难', '所需支持', '下一步与决策']

function strings(value: unknown, fallback: string[] = []): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '').map(item => item.trim()) : fallback
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback
}

export function normalizeDeckProjection(value: Record<string, unknown>, request: string): DeckProjection {
  const rawPages = Array.isArray(value['pages']) ? value['pages'] : []
  const pages: PresentationPage[] = rawPages.slice(0, 7).map((raw, index) => {
    const page = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {}
    return {
      title: text(page['title'], DEFAULT_PAGE_TITLES[index]!),
      purpose: text(page['purpose'], '让读者迅速理解这一页与决策的关系'),
      keyPoints: strings(page['keyPoints'], ['补充一条关键事实', '补充一项可核对证据', '说明这对决策意味着什么']).slice(0, 5),
      speakerNote: text(page['speakerNote'], '用事实说明结论，并明确下一步。'),
    }
  })
  while (pages.length < 7) {
    const index = pages.length
    pages.push({
      title: DEFAULT_PAGE_TITLES[index]!,
      purpose: index === 6 ? '明确希望主管确认的决定与下一步' : '补齐本次汇报的关键信息',
      keyPoints: ['待补充：关键事实', '待补充：数据或截图', '待补充：对决策的影响'],
      speakerNote: '请用现有项目材料替换待补充内容。',
    })
  }
  return {
    title: text(value['title'], request.slice(0, 32) || '项目工作汇报'),
    thesis: text(value['thesis'], '当前工作已形成阶段成果，但仍需要针对关键阻塞配置支持，才能按目标继续推进。'),
    audience: text(value['audience'], '部门主管'),
    desiredAction: text(value['desiredAction'], '确认下一阶段优先级，并协调必要的技术与资源支持'),
    assumptions: strings(value['assumptions'], ['暂按部门内部进展汇报设计', '没有明确数据的位置保留可编辑占位符']),
    pages,
    preferences: strings(value['preferences'], ['结论先行', '每页只表达一个核心判断', '重要请求必须明确到行动']),
    checklist: strings(value['checklist'], ['对象和目的是否明确', '结论是否有证据', '资源请求是否具体', '下一步是否可执行']),
    reusableRules: strings(value['reusableRules'], ['先写一句总论点，再安排页面', '每个要点至少配一项事实或数据', '最后一页明确需要对方做什么']),
    learningTopics: strings(value['learningTopics'], ['如何把材料压缩成一个可决策的核心论点']),
  }
}

function safeBaseName(title: string): string {
  const normalized = title.replace(/[<>:"/\\|?*\u0000-\u001F]/gu, '-').replace(/\s+/gu, '-').replace(/-+/gu, '-').slice(0, 48)
  return normalized || '工作汇报'
}

function pageMarkdown(page: PresentationPage, index: number): string {
  return [`## ${index + 1}. ${page.title}`, '', `目的：${page.purpose}`, '', ...page.keyPoints.map(point => `- ${point}`), '', `讲述提示：${page.speakerNote}`, ''].join('\n')
}

export async function writePresentationArtifact(projectDir: string, deck: DeckProjection, version: number, feedback: string | null): Promise<ArtifactVersion> {
  const deliverables = join(projectDir, 'deliverables')
  await mkdir(deliverables, { recursive: true })
  const base = `${safeBaseName(deck.title)}-v${version}`
  const fileName = `${base}.pptx`
  const markdownFileName = `${base}.md`
  const pptxPath = join(deliverables, fileName)
  const markdownPath = join(deliverables, markdownFileName)

  // pptxgenjs 4 ships a constructable ESM default at runtime, while its
  // NodeNext declaration is exposed as a namespace by TypeScript 6.
  const PptxGenJS = PptxGenJSImport as unknown as new () => any
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'DSH Work Learning Plugin'
  pptx.subject = deck.thesis
  pptx.title = deck.title
  pptx.company = 'DSH Visual Learner'
  pptx.lang = 'zh-CN'
  pptx.theme = {
    headFontFace: 'Microsoft YaHei',
    bodyFontFace: 'Microsoft YaHei',
    lang: 'zh-CN',
  }

  deck.pages.forEach((page, index) => {
    const slide = pptx.addSlide()
    slide.background = { color: index === 0 ? 'F6F2FF' : 'FAFBFD' }
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: '7157E8' }, line: { color: '7157E8' } })
    slide.addText(`${String(index + 1).padStart(2, '0')}  ${page.title}`, { x: 0.7, y: 0.52, w: 11.8, h: 0.55, fontFace: 'Microsoft YaHei', fontSize: 24, bold: true, color: '182033', margin: 0 })
    slide.addText(page.purpose, { x: 0.72, y: 1.22, w: 11.5, h: 0.5, fontFace: 'Microsoft YaHei', fontSize: 12, color: '667085', margin: 0 })
    const points = page.keyPoints.map(point => ({ text: point, options: { bullet: { indent: 18 }, hanging: 4, breakLine: true } }))
    slide.addText(points, { x: 0.9, y: 2.0, w: 11.2, h: 3.8, fontFace: 'Microsoft YaHei', fontSize: 20, color: '253047', breakLine: false, valign: 'mid', margin: 0.08, paraSpaceAfterPt: 14 })
    slide.addText(index === 0 ? deck.thesis : `面向：${deck.audience}  ·  希望促成：${deck.desiredAction}`, { x: 0.72, y: 6.65, w: 11.5, h: 0.32, fontFace: 'Microsoft YaHei', fontSize: 10, color: '7B8497', margin: 0 })
    slide.addText(`${index + 1} / ${deck.pages.length}`, { x: 11.7, y: 7.05, w: 0.8, h: 0.2, fontSize: 8, color: '98A2B3', align: 'right', margin: 0 })
    slide.addNotes(page.speakerNote)
  })
  await pptx.writeFile({ fileName: pptxPath, compression: true })

  const markdown = [`# ${deck.title}`, '', `> 核心论点：${deck.thesis}`, '', `面向：${deck.audience}`, '', `希望促成：${deck.desiredAction}`, '', ...deck.pages.map(pageMarkdown), '## 本版假设', '', ...deck.assumptions.map(item => `- ${item}`), ''].join('\n')
  await writeFile(markdownPath, markdown, 'utf8')
  return {
    version,
    fileName: basename(pptxPath),
    relativePath: `deliverables/${basename(pptxPath)}`,
    markdownFileName: basename(markdownPath),
    markdownRelativePath: `deliverables/${basename(markdownPath)}`,
    createdAt: new Date().toISOString(),
    feedback,
    thesis: deck.thesis,
    pages: deck.pages,
  }
}

export async function writeAssets(projectDir: string, deck: DeckProjection, acceptedVersion: number): Promise<string> {
  const relativePath = 'assets/个人汇报方法.md'
  const path = join(projectDir, relativePath)
  const content = [
    '# 个人汇报方法', '', `> 来源：本项目已接受的 v${acceptedVersion} 成品。`, '',
    '## 已识别偏好', '', ...deck.preferences.map(item => `- ${item}`), '',
    '## 交付前检查清单', '', ...deck.checklist.map(item => `- [ ] ${item}`), '',
    '## 可复用规则', '', ...deck.reusableRules.map(item => `- ${item}`), '',
    '## 可选学习点', '', ...deck.learningTopics.map(item => `- ${item}`), '',
  ].join('\n')
  await mkdir(join(projectDir, 'assets'), { recursive: true })
  await writeFile(path, content, 'utf8')
  return relativePath
}
