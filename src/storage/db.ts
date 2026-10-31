import Dexie, { type Table } from 'dexie'
import type { Character, Template } from '../domain/types'
import { createFateCoreTemplate } from '../domain/defaults'

export interface SettingRecord {
  key: string
  value: unknown
}

export class FateDB extends Dexie {
  characters!: Table<Character, string>
  templates!: Table<Template, string>
  settings!: Table<SettingRecord, string>

  constructor() {
    super('fatecore-charlist')
    this.version(1).stores({
      characters: 'id, updatedAt, name',
      templates: 'id, updatedAt, name',
      settings: 'key',
    })
  }
}

export const db = new FateDB()

let seedPromise: Promise<void> | null = null

export function ensureSeedTemplate(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const count = await db.templates.count()
      if (count === 0) {
        await db.templates.add(createFateCoreTemplate())
      }
    })()
  }

  return seedPromise
}
