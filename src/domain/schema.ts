import { z } from 'zod'
import {
  BACKUP_FORMAT,
  CHARACTER_FORMAT,
  SCHEMA_VERSION,
  TEMPLATE_FORMAT,
  type Character,
  type Field,
  type Template,
} from './types'

const fieldBaseSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  hint: z.string().optional(),
  width: z.number().int().min(1).max(12).optional(),
  isName: z.boolean().optional(),
})

const fieldSchema: z.ZodType<Field> = z.lazy(
  () =>
    z.union([
      fieldBaseSchema.extend({
        kind: z.literal('shortText'),
        placeholder: z.string().optional(),
      }),
      fieldBaseSchema.extend({
        kind: z.literal('longText'),
        placeholder: z.string().optional(),
        rows: z.number().int().positive().optional(),
      }),
      fieldBaseSchema.extend({
        kind: z.literal('number'),
        defaultValue: z.number().nullable().optional(),
        min: z.number().nullable().optional(),
        max: z.number().nullable().optional(),
        step: z.number().optional(),
        placeholder: z.string().optional(),
      }),
      fieldBaseSchema.extend({
        kind: z.literal('tracker'),
        mode: z.enum(['boxes', 'valued']),
        boxes: z.array(
          z.object({
            id: z.string().min(1),
            value: z.number().optional(),
          }),
        ),
        allowAddRemove: z.boolean(),
      }),
      fieldBaseSchema.extend({
        kind: z.literal('group'),
        repeatable: z.boolean(),
        preset: z.enum(['custom', 'skills', 'tricks', 'consequences']),
        children: z.array(fieldSchema),
        initialRows: z.number().int().min(0).optional(),
        initialItems: z.array(z.record(z.unknown())).optional(),
        allowAddRemove: z.boolean().optional(),
      }),
    ]) as unknown as z.ZodType<Field>,
)

const sectionTypographySchema = z.object({
  titleSize: z.number().min(5).max(48).optional(),
  bodySize: z.number().min(5).max(32).optional(),
  family: z.enum(['sans', 'serif']).optional(),
  titleBold: z.boolean().optional(),
  titleItalic: z.boolean().optional(),
  bodyBold: z.boolean().optional(),
  bodyItalic: z.boolean().optional(),
})

export const sectionSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string().optional(),
  fields: z.array(fieldSchema),
  style: z.enum(['band', 'line', 'plain']).optional(),
  accent: z.enum(['wine', 'teal', 'gold', 'slate']).optional(),
  typography: sectionTypographySchema.optional(),
  spaceAfter: z.number().min(0).max(200).optional(),
})

export const templateSchema: z.ZodType<Template> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.number().int().positive(),
  sections: z.array(sectionSchema),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const characterSchema: z.ZodType<Character> = z.object({
  id: z.string().min(1),
  name: z.string(),
  templateId: z.string().min(1),
  templateSnapshot: templateSchema,
  values: z.record(z.unknown()),
  schemaVersion: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const characterExportSchema = z.object({
  format: z.literal(CHARACTER_FORMAT),
  schemaVersion: z.number().int().positive(),
  appVersion: z.string().optional(),
  exportedAt: z.string().optional(),
  character: characterSchema,
})

export const templateExportSchema = z.object({
  format: z.literal(TEMPLATE_FORMAT),
  schemaVersion: z.number().int().positive(),
  appVersion: z.string().optional(),
  exportedAt: z.string().optional(),
  template: templateSchema,
})

export const backupExportSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  schemaVersion: z.number().int().positive(),
  appVersion: z.string().optional(),
  exportedAt: z.string().optional(),
  templates: z.array(templateSchema),
  characters: z.array(characterSchema),
})

export type ImportedData =
  | { kind: 'character'; character: Character }
  | { kind: 'template'; template: Template }
  | { kind: 'backup'; templates: Template[]; characters: Character[] }

function formatZodError(error: z.ZodError): string {
  const issue = error.issues[0]
  if (!issue) return 'Неизвестная ошибка структуры файла.'
  const path = issue.path.join('.')
  return path ? `${path}: ${issue.message}` : issue.message
}

function checkVersion(version: number): void {
  if (version > SCHEMA_VERSION) {
    throw new Error(
      'Файл создан более новой версией приложения. Обновите приложение и попробуйте снова.',
    )
  }
}

export function parseImportData(input: unknown): ImportedData {
  if (!input || typeof input !== 'object') {
    throw new Error('Файл не содержит JSON-объект.')
  }

  const record = input as Record<string, unknown>
  const format = record.format

  if (format === CHARACTER_FORMAT) {
    const parsed = characterExportSchema.safeParse(input)
    if (!parsed.success) throw new Error(formatZodError(parsed.error))
    checkVersion(parsed.data.schemaVersion)
    checkVersion(parsed.data.character.schemaVersion)
    return { kind: 'character', character: parsed.data.character }
  }

  if (format === TEMPLATE_FORMAT) {
    const parsed = templateExportSchema.safeParse(input)
    if (!parsed.success) throw new Error(formatZodError(parsed.error))
    checkVersion(parsed.data.schemaVersion)
    return { kind: 'template', template: parsed.data.template }
  }

  if (format === BACKUP_FORMAT) {
    const parsed = backupExportSchema.safeParse(input)
    if (!parsed.success) throw new Error(formatZodError(parsed.error))
    checkVersion(parsed.data.schemaVersion)
    for (const character of parsed.data.characters) {
      checkVersion(character.schemaVersion)
    }
    return {
      kind: 'backup',
      templates: parsed.data.templates,
      characters: parsed.data.characters,
    }
  }

  const rawCharacter = characterSchema.safeParse(input)
  if (rawCharacter.success) {
    checkVersion(rawCharacter.data.schemaVersion)
    return { kind: 'character', character: rawCharacter.data }
  }

  const rawTemplate = templateSchema.safeParse(input)
  if (rawTemplate.success) {
    return { kind: 'template', template: rawTemplate.data }
  }

  throw new Error(
    'Не удалось распознать файл. Ожидается анкета, шаблон или резервная копия Fate Core.',
  )
}
