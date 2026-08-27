import type { ActionCardView } from '../domain/structured-results.ts'

export type FixtureStepState = 'completed' | 'active' | 'planned' | 'conditional' | 'scheduled' | 'running' | 'needs-reinforcement' | 'paused' | 'skipped' | 'failed-recoverable'
export interface FixtureStep { id: string; title: string; purpose: string; completionEvidence: string; minutes: number; state: FixtureStepState; result?: string; trigger?: string; card?: ActionCardView }
export interface FixtureProject { id: string; title: string; goal: string; status: 'active' | 'paused' | 'archived'; currentStepId: string | null; steps: FixtureStep[] }

const common = {
  completionEvidence: '能在不看提示的情况下给出一次真实判断', secondaryActionKey: 'continue-route', estimatedMinutes: 8, details: [],
}

export const projects: FixtureProject[] = [
  {
    id: 'history-research', title: '完成一篇可靠的历史研究文章', goal: '学会判断材料能证明什么，并把判断写进文章', status: 'active', currentStepId: 'source-judgement',
    steps: [
      { id: 'clear-question', title: '把研究问题说清楚', purpose: '避免收集一堆与问题无关的材料', completionEvidence: '写出一个有边界的问题', minutes: 5, state: 'completed', result: '问题已缩小到一个能用材料回答的范围' },
      { id: 'evidence-levels', title: '搞懂材料证据的基本层级', purpose: '先建立判断材料价值的最小框架', completionEvidence: '能解释三类材料的差别', minutes: 12, state: 'completed', result: '已能区分一手记录、转述和后来的解释' },
      { id: 'source-judgement', title: '用三条真实材料做判断', purpose: '验证你能否把规则用于手头的真实材料', completionEvidence: '逐条写出“能证明 / 不能证明”', minutes: 15, state: 'active', card: {
        ...common, cardId: 'card-source', kind: 'offline-task', title: '用三条真实材料做判断', purpose: '把刚学到的判断方法用到真实材料', primaryActionKey: 'submit-evidence',
        instructions: ['选出文章里最关键的三条材料', '分别写下每条材料能直接证明什么', '再写下它不能单独证明什么'], dependencies: ['你正在使用的三条材料'], evidenceRequirements: ['三条逐项判断', '至少指出一个证据边界'],
        evidenceInput: { allowText: true, allowUrl: true, allowImages: true, textRequired: true, maxTextLength: 5000, maxUrls: 5, maxImages: 5 },
      } },
      { id: 'stability-check', title: '检查判断是否稳定', purpose: '换一组材料，看方法是否还能用', completionEvidence: '不看原答案完成一次判断', minutes: 5, state: 'planned', card: {
        ...common, cardId: 'card-review', kind: 'review', title: '独立判断一条新材料', purpose: '检验方法能否脱离原例子使用', primaryActionKey: 'submit-review', claim: '能说清一条材料可以和不可以证明什么', prompt: '请先不看之前的笔记，直接完成判断。', hideReferenceUntilSubmitted: true,
        evidenceInput: { allowText: true, allowUrl: false, allowImages: false, textRequired: true, maxTextLength: 3000, maxUrls: 0, maxImages: 0 },
      } },
      { id: 'method-step', title: '把有效方法整理成步骤', purpose: '让这套判断下次可以直接复用', completionEvidence: '形成一份短方法清单', minutes: 10, state: 'conditional', trigger: '如果本次判断稳定，就整理成可复用方法' },
      { id: 'review-three-days', title: '三天后独立复现', purpose: '确认不是刚看完才会', completionEvidence: '独立完成新的判断', minutes: 3, state: 'scheduled' },
    ],
  },
  {
    id: 'explain-transformer', title: '真正理解 Transformer', goal: '能向同事讲清核心机制和适用边界', status: 'active', currentStepId: 'explain-own-words',
    steps: [
      { id: 'mental-model', title: '建立最小心智模型', purpose: '先抓住信息怎样流动', completionEvidence: '画出并讲清最小结构', minutes: 12, state: 'completed' },
      { id: 'explain-own-words', title: '用自己的话讲一遍', purpose: '暴露真正没懂的连接处', completionEvidence: '不用术语堆砌完成解释', minutes: 8, state: 'active', card: {
        ...common, cardId: 'card-guided', kind: 'guided-learning', title: '用自己的话讲一遍', purpose: '确认你真的形成了自己的理解', primaryActionKey: 'submit-learning-response', explanation: '先把注意力机制想成：每个位置都在判断，此刻应该从哪些位置取回多少信息。', prompt: '如果要向一个会写代码但没学过模型的人解释，你会怎么说？', input: { type: 'text', multiline: true, maxLength: 3000 },
      } },
      { id: 'boundary', title: '判断它不适合什么情况', purpose: '理解边界比背定义更重要', completionEvidence: '给出两个反例', minutes: 8, state: 'planned' },
    ],
  },
  {
    id: 'research-team', title: '建立团队研究能力', goal: '把可靠研究变成团队可以持续执行的方法', status: 'paused', currentStepId: null,
    steps: [
      { id: 'direction', title: '确认能力方向', purpose: '把宽泛愿望变成能验证的方向', completionEvidence: '确认目标和边界', minutes: 10, state: 'paused', card: {
        ...common, cardId: 'card-decision', kind: 'decision', title: '确认能力方向', purpose: '让后续方法和任务围绕同一结果', primaryActionKey: 'confirm-decision', recommendation: '先训练“证据判断”，再扩展到检索和写作。', basis: ['当前失败主要发生在材料判断', '这是后续写作与审查的共同前置能力'], boundaries: ['第一阶段不追求完整知识库', '先用一个真实项目验证'], editableFields: [{ key: 'goal', label: '目标', value: '团队能独立判断关键材料的证据强度' }],
      } },
    ],
  },
]

export const dueReview = { id: 'review-source', projectId: 'history-research', projectTitle: '完成一篇可靠的历史研究文章', claim: '判断材料能证明什么', dueLabel: '今天到期', minutes: 3 }

export const questionCard: ActionCardView = {
  ...common, cardId: 'card-question', kind: 'question', title: '先确认最重要的结果', purpose: '路线必须围绕真实结果，而不是围绕资料目录', primaryActionKey: 'answer-question', prompt: '今天结束时，出现什么结果才算你真的推进了？', input: { type: 'text', multiline: true, maxLength: 2000 },
}
