export const CHARACTER_FORMAT = 'fatecore-charlist'
export const TEMPLATE_FORMAT = 'fatecore-template'
export const BACKUP_FORMAT = 'fatecore-backup'
export const SCHEMA_VERSION = 1
export const APP_VERSION = '0.1.0'

export type FieldKind = 'shortText' | 'longText' | 'number' | 'tracker' | 'group'
export type TrackerMode = 'boxes' | 'valued'
export type GroupPreset = 'custom' | 'skills' | 'tricks' | 'consequences'
export type SectionStyle = 'band' | 'line' | 'plain'
export type SectionAccent = 'wine' | 'teal' | 'gold' | 'slate'

export interface FieldBase {
  id: string
  label: string
  hint?: string
  /** Ширина в 12-колоночной сетке. */
  width?: number
  /** Помечает короткое поле как имя персонажа для списка и заголовков. */
  isName?: boolean
}

export interface ShortTextField extends FieldBase {
  kind: 'shortText'
  placeholder?: string
}

export interface LongTextField extends FieldBase {
  kind: 'longText'
  placeholder?: string
  rows?: number
}

export interface NumberField extends FieldBase {
  kind: 'number'
  defaultValue?: number | null
  min?: number | null
  max?: number | null
  step?: number
  placeholder?: string
}

export interface TrackerBoxDefinition {
  id: string
  value?: number
}

export interface TrackerField extends FieldBase {
  kind: 'tracker'
  mode: TrackerMode
  boxes: TrackerBoxDefinition[]
  allowAddRemove: boolean
}

export interface GroupField extends FieldBase {
  kind: 'group'
  repeatable: boolean
  preset: GroupPreset
  children: Field[]
  initialRows?: number
  /** Начальные значения для первых строк группы, ключи — id дочерних полей. */
  initialItems?: Array<Record<string, unknown>>
  allowAddRemove?: boolean
}

export type Field =
  | ShortTextField
  | LongTextField
  | NumberField
  | TrackerField
  | GroupField

export interface Section {
  id: string
  title: string
  description?: string
  fields: Field[]
  /** Как заголовок секции выглядит в печати. По умолчанию — цветная полоса. */
  style?: SectionStyle
  /** Цветовой акцент секции. По умолчанию — винный. */
  accent?: SectionAccent
}

export interface Template {
  id: string
  name: string
  description?: string
  version: number
  sections: Section[]
  createdAt?: string
  updatedAt?: string
}

export interface TrackerBoxValue {
  id: string
  checked: boolean
  value?: number
}

export interface TrackerValue {
  boxes: TrackerBoxValue[]
}

export interface GroupItemValue {
  id: string
  values: Record<string, unknown>
}

export interface GroupValue {
  items: GroupItemValue[]
}

export interface Character {
  id: string
  /** Резервное имя, если в шаблоне нет поля с isName. */
  name: string
  templateId: string
  templateSnapshot: Template
  values: Record<string, unknown>
  schemaVersion: number
  createdAt: string
  updatedAt: string
}

export interface CharacterExport {
  format: typeof CHARACTER_FORMAT
  schemaVersion: number
  appVersion: string
  exportedAt: string
  character: Character
}

export interface TemplateExport {
  format: typeof TEMPLATE_FORMAT
  schemaVersion: number
  appVersion: string
  exportedAt: string
  template: Template
}

export interface BackupExport {
  format: typeof BACKUP_FORMAT
  schemaVersion: number
  appVersion: string
  exportedAt: string
  templates: Template[]
  characters: Character[]
}
