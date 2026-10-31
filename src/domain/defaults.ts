import type {
  Character,
  Field,
  GroupField,
  NumberField,
  ShortTextField,
  Template,
  TrackerField,
} from './types'
import { SCHEMA_VERSION } from './types'
import { uid } from './ids'
import { createDefaultValues, findTopLevelField } from './values'

export type NewFieldKind =
  | 'shortText'
  | 'longText'
  | 'number'
  | 'tracker'
  | 'skills'
  | 'tricks'
  | 'consequences'
  | 'group'

function shortText(
  label: string,
  width = 6,
  extra: Partial<ShortTextField> = {},
): ShortTextField {
  return {
    id: uid('fld'),
    kind: 'shortText',
    label,
    width,
    ...extra,
  }
}

function numberField(
  label: string,
  width = 4,
  extra: Partial<NumberField> = {},
): NumberField {
  return {
    id: uid('fld'),
    kind: 'number',
    label,
    width,
    defaultValue: null,
    step: 1,
    ...extra,
  }
}

function tracker(
  label: string,
  mode: TrackerField['mode'],
  count: number,
  width = 6,
): TrackerField {
  return {
    id: uid('fld'),
    kind: 'tracker',
    label,
    width,
    mode,
    boxes: Array.from({ length: count }, (_, index) => ({
      id: uid('box'),
      value: mode === 'valued' ? index + 1 : undefined,
    })),
    allowAddRemove: true,
  }
}

function skillGroup(): GroupField {
  return {
    id: uid('grp'),
    kind: 'group',
    label: 'Навыки',
    width: 12,
    repeatable: true,
    preset: 'skills',
    initialRows: 6,
    allowAddRemove: true,
    children: [
      shortText('Навык', 8, { placeholder: 'Название навыка' }),
      numberField('Уровень', 4),
    ],
  }
}

function trickGroup(): GroupField {
  return {
    id: uid('grp'),
    kind: 'group',
    label: 'Трюки',
    width: 12,
    repeatable: true,
    preset: 'tricks',
    initialRows: 3,
    allowAddRemove: true,
    children: [
      shortText('Название', 6, { placeholder: 'Название трюка' }),
      numberField('Бросок', 6),
      {
        id: uid('fld'),
        kind: 'longText',
        label: 'Описание',
        width: 12,
        rows: 2,
        placeholder: 'Что делает трюк',
      },
    ],
  }
}

function consequenceGroup(): GroupField {
  const text = shortText('Последствие', 8, { placeholder: 'Описание последствия' })
  const value = numberField('Тяжесть', 4, { placeholder: '2 / 4 / 6' })

  return {
    id: uid('grp'),
    kind: 'group',
    label: 'Последствия',
    width: 12,
    repeatable: true,
    preset: 'consequences',
    initialRows: 3,
    allowAddRemove: true,
    initialItems: [
      { [value.id]: 2 },
      { [value.id]: 4 },
      { [value.id]: 6 },
    ],
    children: [text, value],
  }
}

export function createFieldDefinition(kind: NewFieldKind): Field {
  switch (kind) {
    case 'shortText':
      return shortText('Новое поле', 6, { placeholder: 'Введите текст' })
    case 'longText':
      return {
        id: uid('fld'),
        kind: 'longText',
        label: 'Описание',
        width: 12,
        rows: 4,
        placeholder: 'Введите описание',
      }
    case 'number':
      return numberField('Число', 4)
    case 'tracker':
      return tracker('Трекер', 'boxes', 4)
    case 'skills':
      return skillGroup()
    case 'tricks':
      return trickGroup()
    case 'consequences':
      return consequenceGroup()
    case 'group':
      return {
        id: uid('grp'),
        kind: 'group',
        label: 'Группа',
        width: 12,
        repeatable: true,
        preset: 'custom',
        initialRows: 1,
        allowAddRemove: true,
        children: [shortText('Название', 12, { placeholder: 'Значение' })],
      }
  }
}

export function createFateCoreTemplate(): Template {
  const now = new Date().toISOString()

  return {
    id: 'tpl_fate_core',
    name: 'Fate Core — базовый',
    description: 'Классическая анкета Fate Core с аспектами, навыками, трюками, стрессом и последствиями.',
    version: 1,
    createdAt: now,
    updatedAt: now,
    sections: [
      {
        id: 'sec_person',
        title: 'Персонаж',
        fields: [
          {
            id: 'fld_name',
            kind: 'shortText',
            label: 'Имя персонажа',
            width: 6,
            placeholder: 'Как зовут персонажа',
            isName: true,
          },
          {
            id: 'fld_race',
            kind: 'shortText',
            label: 'Раса',
            width: 6,
            placeholder: 'Раса или вид',
          },
          {
            id: 'fld_details',
            kind: 'longText',
            label: 'Детали',
            width: 12,
            rows: 3,
            placeholder: 'Внешность, характер, важные детали',
          },
          {
            id: 'fld_refresh',
            kind: 'number',
            label: 'Обновление',
            width: 4,
            defaultValue: 3,
            step: 1,
          },
        ],
      },
      {
        id: 'sec_aspects',
        title: 'Аспекты',
        fields: [
          {
            id: 'fld_concept',
            kind: 'shortText',
            label: 'Концепция',
            width: 6,
            placeholder: 'Кто персонаж и чем он занимается',
          },
          {
            id: 'fld_problem',
            kind: 'shortText',
            label: 'Проблема',
            width: 6,
            placeholder: 'Что осложняет жизнь персонажа',
          },
          {
            id: 'fld_aspect_1',
            kind: 'shortText',
            label: 'Аспект 1',
            width: 4,
            placeholder: 'Аспект',
          },
          {
            id: 'fld_aspect_2',
            kind: 'shortText',
            label: 'Аспект 2',
            width: 4,
            placeholder: 'Аспект',
          },
          {
            id: 'fld_aspect_3',
            kind: 'shortText',
            label: 'Аспект 3',
            width: 4,
            placeholder: 'Аспект',
          },
        ],
      },
      {
        id: 'sec_titles',
        title: 'Титулы',
        fields: [
          {
            id: 'fld_titles',
            kind: 'longText',
            label: 'Титулы',
            width: 12,
            rows: 2,
            placeholder: 'Титулы, звания, репутация',
          },
        ],
      },
      {
        id: 'sec_skills',
        title: 'Навыки',
        fields: [
          {
            ...skillGroup(),
            id: 'grp_skills',
            children: [
              {
                ...shortText('Навык', 8, { placeholder: 'Название навыка' }),
                id: 'fld_skill_name',
              },
              {
                ...numberField('Уровень', 4),
                id: 'fld_skill_rank',
              },
            ],
          },
        ],
      },
      {
        id: 'sec_tricks',
        title: 'Трюки',
        fields: [
          {
            ...trickGroup(),
            id: 'grp_tricks',
            children: [
              {
                ...shortText('Название', 6, { placeholder: 'Название трюка' }),
                id: 'fld_trick_name',
              },
              {
                ...numberField('Бросок', 6),
                id: 'fld_trick_roll',
              },
              {
                id: 'fld_trick_description',
                kind: 'longText',
                label: 'Описание',
                width: 12,
                rows: 2,
                placeholder: 'Что делает трюк',
              },
            ],
          },
        ],
      },
      {
        id: 'sec_stress',
        title: 'Стресс',
        fields: [
          {
            ...tracker('Стресс (физический)', 'valued', 4, 6),
            id: 'trk_physical',
            boxes: [
              { id: 'trk_physical_box_1', value: 1 },
              { id: 'trk_physical_box_2', value: 2 },
              { id: 'trk_physical_box_3', value: 3 },
              { id: 'trk_physical_box_4', value: 4 },
            ],
          },
          {
            ...tracker('Стресс (ментальный)', 'valued', 4, 6),
            id: 'trk_mental',
            boxes: [
              { id: 'trk_mental_box_1', value: 1 },
              { id: 'trk_mental_box_2', value: 2 },
              { id: 'trk_mental_box_3', value: 3 },
              { id: 'trk_mental_box_4', value: 4 },
            ],
          },
        ],
      },
      {
        id: 'sec_consequences',
        title: 'Последствия',
        fields: [
          {
            ...consequenceGroup(),
            id: 'grp_consequences',
            initialItems: [
              { fld_consequence_value: 2 },
              { fld_consequence_value: 4 },
              { fld_consequence_value: 6 },
            ],
            children: [
              {
                ...shortText('Последствие', 8, { placeholder: 'Описание последствия' }),
                id: 'fld_consequence_text',
              },
              {
                ...numberField('Тяжесть', 4, { placeholder: '2 / 4 / 6' }),
                id: 'fld_consequence_value',
              },
            ],
          },
        ],
      },
    ],
  }
}

export function createBlankTemplate(name = 'Новый шаблон'): Template {
  const now = new Date().toISOString()

  return {
    id: uid('tpl'),
    name,
    description: '',
    version: 1,
    createdAt: now,
    updatedAt: now,
    sections: [
      {
        id: uid('sec'),
        title: 'Основное',
        fields: [
          {
            id: uid('fld'),
            kind: 'shortText',
            label: 'Имя персонажа',
            width: 12,
            placeholder: 'Как зовут персонажа',
            isName: true,
          },
        ],
      },
    ],
  }
}

export function cloneTemplate(template: Template, name?: string): Template {
  const now = new Date().toISOString()
  const copy = structuredClone(template)
  copy.id = uid('tpl')
  copy.name = name ?? `${template.name} (копия)`
  copy.version = 1
  copy.createdAt = now
  copy.updatedAt = now
  return copy
}

export function createCharacterFromTemplate(
  template: Template,
  name = 'Новый персонаж',
): Character {
  const now = new Date().toISOString()
  const snapshot = structuredClone(template)
  const values = createDefaultValues(snapshot)
  const nameField = findTopLevelField(
    snapshot,
    (field) => field.kind === 'shortText' && field.isName === true,
  )

  if (nameField) values[nameField.id] = name

  return {
    id: uid('chr'),
    name,
    templateId: template.id,
    templateSnapshot: snapshot,
    values,
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
  }
}

export function cloneCharacter(character: Character, name?: string): Character {
  const now = new Date().toISOString()
  const copy = structuredClone(character)
  copy.id = uid('chr')
  copy.createdAt = now
  copy.updatedAt = now

  if (name !== undefined) {
    copy.name = name
    const nameField = findTopLevelField(
      copy.templateSnapshot,
      (field) => field.kind === 'shortText' && field.isName === true,
    )
    if (nameField) copy.values[nameField.id] = name
  }

  return copy
}
