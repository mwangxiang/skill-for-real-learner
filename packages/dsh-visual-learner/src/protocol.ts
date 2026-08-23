export const PROBE_CHANNEL = '/dsh-visual-learner-v1'
export const PROBE_STATUS_ENDPOINT = 'status'

export interface ProbeStatus {
  hostLoaded: true
  protocolVersion: 1
  packageVersion: '0.0.2-alpha.0'
  skillCount: 10
  skillNames: readonly string[]
}
