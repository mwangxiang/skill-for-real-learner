import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DrawerController } from '../packages/dsh-visual-learner/src-v01/client/state.ts'

beforeEach(() => {
  const storage = new Map<string, string>()
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
    navigator: { language: 'zh-CN' },
  })
})

describe('Pilot dock controller', () => {
  it('keeps panel state and Pilot geometry actions in one transition', () => {
    const dock = { open: vi.fn(), close: vi.fn() }
    const controller = new DrawerController(undefined, dock)

    controller.open()
    expect(controller.getSnapshot().open).toBe(true)
    expect(dock.open).toHaveBeenCalledTimes(1)

    controller.toggle()
    expect(controller.getSnapshot().open).toBe(false)
    expect(dock.close).toHaveBeenCalledTimes(1)
  })

  it('does not restore the retired overlay width as project truth', () => {
    const controller = new DrawerController()
    expect(controller.getSnapshot()).not.toHaveProperty('width')
    expect(controller.getSnapshot()).not.toHaveProperty('narrowNotice')
  })

  it('yields to another dock plugin without collapsing that plugin\'s column', () => {
    const dock = { open: vi.fn(), close: vi.fn() }
    const controller = new DrawerController(undefined, dock)
    controller.open()

    controller.yieldToDockPeer()

    expect(controller.getSnapshot().open).toBe(false)
    expect(dock.close).not.toHaveBeenCalled()
  })

  it('closes and resets the workspace when navigation leaves a strict session', () => {
    const dock = { open: vi.fn(), close: vi.fn() }
    const controller = new DrawerController(undefined, dock)
    controller.bindNativeSession('session-a')
    controller.navigate({ kind: 'reviews' })
    controller.open()

    controller.bindNativeSession(null)

    expect(controller.getSnapshot().open).toBe(false)
    expect(controller.getSnapshot().page).toEqual({ kind: 'overview' })
    expect(controller.getSnapshot().projects).toEqual([])
    expect(dock.close).toHaveBeenCalledTimes(1)
  })

  it('does not reset when the same strict session is observed again', () => {
    const controller = new DrawerController()
    controller.bindNativeSession('session-a')
    controller.navigate({ kind: 'reviews' })
    controller.bindNativeSession('session-a')
    expect(controller.getSnapshot().page).toEqual({ kind: 'reviews' })
  })

  it('retries project discovery whenever the workspace is opened', async () => {
    const rpc = {
      call: vi.fn().mockResolvedValue({
        ok: true,
        value: { ok: true, value: { schemaVersion: '0.3.0', projects: [] } },
      }),
    }
    const controller = new DrawerController(rpc)
    controller.bindNativeSession('session-a')
    controller.open()
    await vi.waitFor(() => { expect(rpc.call).toHaveBeenCalledTimes(2) })
  })
})
