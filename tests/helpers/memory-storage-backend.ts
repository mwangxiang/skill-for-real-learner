import { StorageError } from '@deepseek-ai/dsh-storage'
import type { KvFacet, KvUnit, KvUnitDescriptor, StorageBackend } from '@deepseek-ai/dsh-storage'

export interface MemoryMedium {
  tables: Map<string, Map<string, unknown>>
  global: unknown
}

export class MemoryMediaPool {
  readonly media = new Map<string, MemoryMedium>()
  readonly versions = new Map<string, number>()
}

class MemoryKvUnit implements KvUnit {
  private closed = false

  constructor(
    private readonly medium: MemoryMedium,
    private readonly descriptor: KvUnitDescriptor,
    private readonly onClose: () => void,
  ) {}

  private assertOpen(): void {
    if (this.closed) throw new StorageError('closed', `memory unit '${this.descriptor.name}' is closed`)
  }

  async loadAll(): Promise<{ tables: Record<string, Record<string, unknown>>; global: unknown }> {
    this.assertOpen()
    const tables: Record<string, Record<string, unknown>> = {}
    for (const table of this.descriptor.tables) {
      tables[table] = Object.fromEntries(this.medium.tables.get(table) ?? [])
    }
    return { tables, global: this.medium.global }
  }

  async putRecord(table: string, key: string, value: unknown): Promise<void> {
    this.assertOpen()
    let records = this.medium.tables.get(table)
    if (records === undefined) {
      records = new Map()
      this.medium.tables.set(table, records)
    }
    records.set(key, value)
  }

  async deleteRecord(table: string, key: string): Promise<void> {
    this.assertOpen()
    this.medium.tables.get(table)?.delete(key)
  }

  async setGlobal(value: unknown): Promise<void> {
    this.assertOpen()
    this.medium.global = value
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    this.onClose()
  }
}

export class MemoryStorageBackend implements StorageBackend {
  readonly kv: KvFacet
  private readonly openUnits = new Set<string>()
  private closed = false

  constructor(readonly pool: MemoryMediaPool = new MemoryMediaPool()) {
    this.kv = {
      open: async (descriptor: KvUnitDescriptor): Promise<KvUnit> => {
        if (this.closed) throw new StorageError('closed', 'memory backend is closed')
        if (this.openUnits.has(descriptor.name)) throw new Error(`memory unit '${descriptor.name}' already open`)
        const stamped = this.pool.versions.get(descriptor.name)
        if (stamped === undefined) this.pool.versions.set(descriptor.name, descriptor.version)
        else if (stamped !== descriptor.version) {
          throw new StorageError('version-mismatch', `memory unit '${descriptor.name}' version mismatch`)
        }
        let medium = this.pool.media.get(descriptor.name)
        if (medium === undefined) {
          medium = { tables: new Map(), global: null }
          this.pool.media.set(descriptor.name, medium)
        }
        this.openUnits.add(descriptor.name)
        return new MemoryKvUnit(medium, descriptor, () => this.openUnits.delete(descriptor.name))
      },
    }
  }

  async close(): Promise<void> {
    this.closed = true
    this.openUnits.clear()
  }
}
