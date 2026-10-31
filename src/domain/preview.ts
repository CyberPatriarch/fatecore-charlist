import type {
  Character,
  Field,
  GroupField,
  GroupValue,
  LongTextField,
  ShortTextField,
  Template,
} from './types'
import { SCHEMA_VERSION } from './types'
import {
  createDefaultValue,
  findTopLevelField,
  isGroupValue,
} from './values'

const SAMPLE_TEXT: Record<string, string> = {
  'имя персонажа': 'Ари из Тени',
  раса: 'Человек',
  детали:
    'Высокий, спокойный, со шрамом на левой руке. Носит старый плащ и никогда не расстаётся с картой.',
  концепция: 'Охотник за реликвиями',
  проблема: 'Долг перед гильдией',
  'аспект 1': 'Никогда не бросает своих',
  'аспект 2': 'Слишком любопытен',
  'аспект 3': 'Старые карты не врут',
  титулы: 'Мастер клинка, бывший капитан стражи',
}

const SKILL_NAMES = ['Атлетика', 'Бой', 'Воля', 'Заметить', 'Знания', 'Общение']
const SKILL_RANKS = [4, 3, 3, 2, 2, 1]
const TRICK_NAMES = ['Фехтовальщик', 'Быстрый шаг', 'Знаток древностей']
const TRICK_DESCRIPTIONS = [
  'Получает +2 при защите клинком.',
  'Может переместиться на одну зону без броска.',
  'Получает +2 к поиску сведений о старых артефактах.',
]
const CONSEQUENCES = ['Сломана рука', 'Испуган', 'Оглушён']
const CONSEQUENCE_VALUES = [2, 4, 6]

const SAMPLE_NUMBERS: Record<string, number | number[]> = {
  обновление: 3,
  мана: 5,
  уровень: SKILL_RANKS,
  бросок: [2, 1, 2],
  тяжесть: CONSEQUENCE_VALUES,
}

function normalize(label: string): string {
  return label.trim().toLocaleLowerCase('ru')
}

function sampleText(field: ShortTextField | LongTextField, index: number): string {
  if (field.isName) return SAMPLE_TEXT['имя персонажа']

  const key = normalize(field.label)
  const known = SAMPLE_TEXT[key]
  if (known) return known

  if (key === 'навык') return SKILL_NAMES[index % SKILL_NAMES.length]
  if (key === 'название') return TRICK_NAMES[index % TRICK_NAMES.length]
  if (key === 'описание') {
    return TRICK_DESCRIPTIONS[index % TRICK_DESCRIPTIONS.length]
  }
  if (key === 'последствие') return CONSEQUENCES[index % CONSEQUENCES.length]

  return field.kind === 'longText'
    ? 'Пример текста для предпросмотра анкеты.'
    : 'Пример текста'
}

function sampleNumber(
  field: Extract<Field, { kind: 'number' }>,
  existing: unknown,
  index: number,
): number | null {
  if (typeof existing === 'number') return existing

  const known = SAMPLE_NUMBERS[normalize(field.label)]
  if (Array.isArray(known)) return known[index % known.length]
  if (typeof known === 'number') return known

  return field.defaultValue ?? 2
}

function sampleGroupValue(field: GroupField): GroupValue {
  const base = createDefaultValue(field)
  if (!isGroupValue(base)) return { items: [] }

  return {
    items: base.items.map((item, itemIndex) => ({
      id: item.id,
      values: Object.fromEntries(
        field.children.map((child) => [
          child.id,
          sampleValue(child, item.values[child.id], itemIndex),
        ]),
      ),
    })),
  }
}

function sampleValue(field: Field, existing: unknown, index: number): unknown {
  switch (field.kind) {
    case 'shortText':
    case 'longText':
      return sampleText(field, index)
    case 'number':
      return sampleNumber(field, existing, index)
    case 'tracker':
      return createDefaultValue(field)
    case 'group':
      return sampleGroupValue(field)
  }
}

/**
 * Создаёт несохраняемую анкету для предпросмотра шаблона.
 * При fillSamples=false показывает пустые поля с подписями.
 */
export function createPreviewCharacter(
  template: Template,
  fillSamples = true,
): Character {
  const now = new Date().toISOString()
  const values: Record<string, unknown> = {}

  for (const section of template.sections) {
    for (const field of section.fields) {
      values[field.id] = fillSamples
        ? sampleValue(field, createDefaultValue(field), 0)
        : createDefaultValue(field)
    }
  }

  const nameField = findTopLevelField(
    template,
    (field) => field.kind === 'shortText' && field.isName === true,
  )
  const nameValue = nameField ? values[nameField.id] : null
  const name =
    typeof nameValue === 'string' && nameValue.trim()
      ? nameValue.trim()
      : 'Имя персонажа'

  return {
    id: 'preview_character',
    name,
    templateId: template.id,
    templateSnapshot: structuredClone(template),
    values,
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
  }
}
