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
})
