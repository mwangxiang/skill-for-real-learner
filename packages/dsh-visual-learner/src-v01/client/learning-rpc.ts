import {
  LEARNING_SCHEMA_VERSION,
  createLearningRequest,
  type LearningProjectViewModel,
  type LearningRpcResult,
} from '../protocol/index.ts'

interface LearningRpcCarrier {
  call(
    channel: '/api',
    endpoint: 'learning-panel/snapshot',
    payload: { args: { request: unknown } },
    signal?: AbortSignal,
  ): Promise<{ ok: true; value: unknown } | { ok: false; error: unknown }>
}

export async function requestProjectSnapshot(
  rpc: LearningRpcCarrier,
  projectId: string,
  currentSessionId: string,
  signal?: AbortSignal,
): Promise<LearningRpcResult<LearningProjectViewModel>> {
  const response = await rpc.call(
    '/api',
    'learning-panel/snapshot',
    { args: { request: createLearningRequest({ projectId, currentSessionId }) } },
    signal,
  )
  if (!response.ok || response.value === null || typeof response.value !== 'object') {
    return { ok: false, error: { code: 'INVALID_REQUEST', learnerMessage: '学习面板暂时无法连接，请重试。' } }
  }
  const result = response.value as LearningRpcResult<LearningProjectViewModel>
  if (!result.ok) return result
  if (result.value.schemaVersion !== LEARNING_SCHEMA_VERSION) {
    return { ok: false, error: { code: 'SCHEMA_MISMATCH', learnerMessage: '插件版本不一致，请重启 Harness 后重试。' } }
  }
  return result
}
