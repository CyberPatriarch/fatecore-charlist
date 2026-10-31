import type {
  Character,
  Field,
  GroupField,
  GroupItemValue,
  GroupValue,
  Section,
  Template,
  TrackerBoxDefinition,
  TrackerBoxValue,
  TrackerField,
  TrackerValue,
} from './types'
import { uid } from './ids'

export function isTrackerValue(value: unknown): value is TrackerValue {
  return Boolean(
    value &&
      typeof value === 'object' &&
      Array.isArray((value as TrackerValue).boxes),
  )
}

export function isGroupValue(value: unknown): value is GroupValue {
  return Boolean(
    value &&
      typeof value === 'object' &&
      Array.isArray((value as GroupValue).items),
  )
}

export function makeBoxes(count: number, valued: boolean): TrackerBoxDefinition[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => ({
    id: uid('box'),
    value: valued ? index + 1 : undefined,
  }))
}

export function createDefaultValue(field: Field): unknown {
  switch (field.kind) {
    case 'shortText':
    case 'longText':
      return ''
    case 'number':
      return field.defaultValue ?? null
    case 'tracker':
      return {
        boxes: field.boxes.map((box) => ({
          id: box.id,
          checked: false,
          value: box.value,
        })),
      } satisfies TrackerValue
    case 'group':
      return {
        items: Array.from(
          { length: field.repeatable ? Math.max(0, field.initialRows ?? 1) : 1 },
          (_, index) => createGroupItem(field, index),
        ),
      } satisfies GroupValue
  }
}

export function createGroupItem(field: GroupField, index = 0): GroupItemValue {
  const values: Record<string, unknown> = {}

  for (const child of field.children) {
    values[child.id] = createDefaultValue(child)
  }

  const overrides = field.initialItems?.[index]
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (key in values) values[key] = structuredClone(value)
    }
  }

  return { id: uid('item'), values }
}

export function createDefaultValues(template: Template): Record<string, unknown> {
  const values: Record<string, unknown> = {}

  for (const section of template.sections) {
    for (const field of section.fields) {
      values[field.id] = createDefaultValue(field)
    }
  }

  return values
}

function syncTrackerValue(
  field: TrackerField,
  value: unknown,
): TrackerValue {
  const existing = isTrackerValue(value) ? value : { boxes: [] }

  return {
    boxes: field.boxes.map((box) => {
      const old = existing.boxes.find((item) => item.id === box.id)
      return {
        id: box.id,
        checked: old?.checked ?? false,
        value: box.value,
      } satisfies TrackerBoxValue
    }),
  }
}

function syncGroupValue(field: GroupField, value: unknown): GroupValue {
  const exists = value !== undefined
  const existing = isGroupValue(value) ? value : { items: [] }

  let items = existing.items
  if (!field.repeatable) {
    items = items.slice(0, 1)
    if (items.length === 0) items = [createGroupItem(field, 0)]
  } else if (!exists) {
    items = Array.from(
      { length: Math.max(0, field.initialRows ?? 1) },
      (_, index) => createGroupItem(field, index),
    )
  }

  return {
    items: items.map((item) => {
      const values: Record<string, unknown> = {}
      for (const child of field.children) {
        values[child.id] = syncFieldValue(child, item.values?.[child.id])
      }
      return { id: item.id, values }
    }),
  }
}

function syncFieldValue(field: Field, value: unknown): unknown {
  switch (field.kind) {
    case 'shortText':
    case 'longText':
      return typeof value === 'string' ? value : ''
    case 'number':
      return typeof value === 'number' || value === null ? value : field.defaultValue ?? null
    case 'tracker':
      return syncTrackerValue(field, value)
    case 'group':
      return syncGroupValue(field, value)
  }
}

/**
 * Приводит значения персонажа к структуре шаблона:
 * добавляет значения для новых полей и убирает значения удалённых.
 */
export function syncValuesToTemplate(
  template: Template,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const section of template.sections) {
    for (const field of section.fields) {
      result[field.id] = syncFieldValue(field, values[field.id])
    }
  }

  return result
}

export function findTopLevelField(
  template: Template,
  predicate: (field: Field) => boolean,
): Field | undefined {
  for (const section of template.sections) {
    const found = section.fields.find(predicate)
    if (found) return found
  }
  return undefined
}

export function findFieldById(template: Template, fieldId: string): Field | undefined {
  for (const section of template.sections) {
    for (const field of section.fields) {
      if (field.id === fieldId) return field
      if (field.kind === 'group') {
        const child = field.children.find((item) => item.id === fieldId)
        if (child) return child
      }
    }
  }
  return undefined
}

export function getCharacterDisplayName(character: Character): string {
  const nameField = findTopLevelField(
    character.templateSnapshot,
    (field) => field.kind === 'shortText' && field.isName === true,
  )

  if (nameField) {
    const value = character.values[nameField.id]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return character.name.trim() || 'Без имени'
}

export function getFieldNameValue(
  template: Template,
  values: Record<string, unknown>,
): string | null {
  const nameField = findTopLevelField(
    template,
    (field) => field.kind === 'shortText' && field.isName === true,
  )

  if (!nameField) return null
  const value = values[nameField.id]
  return typeof value === 'string' ? value.trim() : null
}

export function isEmptyValue(field: Field, value: unknown): boolean {
  switch (field.kind) {
    case 'shortText':
    case 'longText':
      return typeof value !== 'string' || value.trim() === ''
    case 'number':
      return value === null || value === undefined || value === ''
    case 'tracker':
      return !isTrackerValue(value) || value.boxes.length === 0
    case 'group':
      if (!isGroupValue(value) || value.items.length === 0) return true
      return value.items.every((item) =>
        field.children.every((child) => isEmptyValue(child, item.values?.[child.id])),
      )
  }
}

export function countFields(template: Template): number {
  let count = 0
  for (const section of template.sections) {
    for (const field of section.fields) {
      count += 1
      if (field.kind === 'group') count += field.children.length
    }
  }
  return count
}

export function countSections(template: Template): number {
  return template.sections.length
}

export function cloneJson<T>(value: T): T {
  return structuredClone(value)
}

export function getSectionValues(
  section: Section,
  values: Record<string, unknown>,
): Array<{ field: Field; value: unknown }> {
  return section.fields.map((field) => ({ field, value: values[field.id] }))
}
