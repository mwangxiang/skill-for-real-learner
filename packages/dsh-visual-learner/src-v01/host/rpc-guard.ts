import { isAbsolute } from 'node:path'
import {
  LEARNER_VIEWMODEL_FORBIDDEN_KEYS,
  LEARNING_SCHEMA_VERSION,
  WORK_SCHEMA_VERSION,
  type LearningRpcEnvelope,
  type LearningRpcResult,
  type WorkRpcEnvelope,
  type WorkRpcResult,
} from '../protocol/index.ts'

export function validateEnvelope<T>(input: unknown): LearningRpcResult<LearningRpcEnvelope<T>> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: { code: 'INVALID_REQUEST', learnerMessage: '请求格式无效，请刷新后重试。' } }
  }
  const record = input as Record<string, unknown>
  if (record['schemaVersion'] !== LEARNING_SCHEMA_VERSION) {
    return { ok: false, error: { code: 'SCHEMA_MISMATCH', learnerMessage: '插件版本不一致，请重启 Harness 后重试。' } }
  }
  if (!Object.hasOwn(record, 'payload')) {
    return { ok: false, error: { code: 'INVALID_REQUEST', learnerMessage: '请求缺少必要内容，请重试。' } }
  }
  return { ok: true, value: input as LearningRpcEnvelope<T> }
}

export function validateWorkEnvelope<T>(input: unknown): WorkRpcResult<WorkRpcEnvelope<T>> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: { code: 'INVALID_REQUEST', learnerMessage: '请求格式无效，请刷新后重试。' } }
  }
  const record = input as Record<string, unknown>
  if (record['schemaVersion'] !== WORK_SCHEMA_VERSION) {
    return { ok: false, error: { code: 'SCHEMA_MISMATCH', learnerMessage: '插件版本不一致，请重启 Harness 后重试。' } }
  }
  if (!Object.hasOwn(record, 'payload')) {
    return { ok: false, error: { code: 'INVALID_REQUEST', learnerMessage: '请求缺少必要内容，请重试。' } }
  }
  return { ok: true, value: input as WorkRpcEnvelope<T> }
}

export function validateRelativePath(path: string): LearningRpcResult<string> {
  if (path === '' || isAbsolute(path) || path.split(/[\\/]/).includes('..')) {
    return { ok: false, error: { code: 'PATH_OUTSIDE_ROOT', learnerMessage: '该位置不在当前学习项目中。' } }
  }
  return { ok: true, value: path.replace(/\\/g, '/') }
}

export function validateLearnerViewModel(value: unknown): LearningRpcResult<unknown> {
  const seen = new Set<object>()
  const walk = (node: unknown): boolean => {
    if (node === null || typeof node !== 'object') return true
    if (seen.has(node)) return true
    seen.add(node)
    if (Array.isArray(node)) return node.every(walk)
    for (const [key, child] of Object.entries(node)) {
      if (LEARNER_VIEWMODEL_FORBIDDEN_KEYS.has(key)) return false
      if (!walk(child)) return false
    }
    return true
  }
  if (!walk(value)) {
    return { ok: false, error: { code: 'VIEWMODEL_INTERNAL_LEAK', learnerMessage: '学习内容暂时无法安全显示，请重试。' } }
  }
  return { ok: true, value }
}
