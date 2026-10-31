import {
  APP_VERSION,
  BACKUP_FORMAT,
  CHARACTER_FORMAT,
  SCHEMA_VERSION,
  TEMPLATE_FORMAT,
  type BackupExport,
  type Character,
  type CharacterExport,
  type Template,
  type TemplateExport,
} from '../domain/types'
import { cloneCharacter, cloneTemplate } from '../domain/defaults'
import { getCharacterDisplayName } from '../domain/values'
import { parseImportData, type ImportedData } from '../domain/schema'
import { listCharacters, listTemplates, saveCharacter, saveTemplate } from './repository'

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function safeFilename(name: string): string {
  const normalized = name
    .trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || 'character'
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function exportCharacterFile(character: Character): void {
  const exportData: CharacterExport = {
    format: CHARACTER_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    character,
  }

  downloadJson(
    `fate-core-${safeFilename(getCharacterDisplayName(character))}-${dateStamp()}.json`,
    exportData,
  )
}

export function exportTemplateFile(template: Template): void {
  const exportData: TemplateExport = {
    format: TEMPLATE_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    template,
  }

  downloadJson(
    `fate-core-template-${safeFilename(template.name)}-${dateStamp()}.json`,
    exportData,
  )
}

export async function exportBackupFile(): Promise<void> {
  const [templates, characters] = await Promise.all([
    listTemplates(),
    listCharacters(),
  ])

  const exportData: BackupExport = {
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    templates,
    characters,
  }

  downloadJson(`fate-core-backup-${dateStamp()}.json`, exportData)
}

export async function readJsonFile(file: File): Promise<unknown> {
  const maxSize = 25 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('Файл слишком большой. Максимальный размер — 25 МБ.')
  }

  const text = await file.text()
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error('Файл не является корректным JSON.')
  }
}

export async function parseImportFile(file: File): Promise<ImportedData> {
  const data = await readJsonFile(file)
  return parseImportData(data)
}

function uniqueName(base: string, existing: string[]): string {
  if (!existing.includes(base)) return base

  let suffix = ' (импорт)'
  let candidate = `${base}${suffix}`
  let index = 2
  while (existing.includes(candidate)) {
    suffix = ` (импорт ${index})`
    candidate = `${base}${suffix}`
    index += 1
  }
  return candidate
}

export async function importCharacter(character: Character): Promise<Character> {
  const existing = await listCharacters()
  const names = existing.map(getCharacterDisplayName)
  const name = uniqueName(getCharacterDisplayName(character), names)
  const copy = cloneCharacter(character, name)
  await saveCharacter(copy)
  return copy
}

export async function importTemplate(template: Template): Promise<Template> {
  const existing = await listTemplates()
  const names = existing.map((item) => item.name)
  const name = uniqueName(template.name, names)
  const copy = cloneTemplate(template, name)
  await saveTemplate(copy)
  return copy
}

export interface ImportResult {
  characters: Character[]
  templates: Template[]
}

export async function importParsedData(data: ImportedData): Promise<ImportResult> {
  if (data.kind === 'character') {
    return { characters: [await importCharacter(data.character)], templates: [] }
  }

  if (data.kind === 'template') {
    return { characters: [], templates: [await importTemplate(data.template)] }
  }

  const templates: Template[] = []
  for (const template of data.templates) {
    templates.push(await importTemplate(template))
  }

  const characters: Character[] = []
  for (const character of data.characters) {
    characters.push(await importCharacter(character))
  }

  return { characters, templates }
}
