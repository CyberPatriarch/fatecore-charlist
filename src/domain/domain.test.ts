import { describe, expect, it } from 'vitest'
import {
  APP_VERSION,
  CHARACTER_FORMAT,
  SCHEMA_VERSION,
  TEMPLATE_FORMAT,
  type GroupField,
  type GroupValue,
  type TrackerField,
  type TrackerValue,
} from './types'
import {
  cloneCharacter,
  createCharacterFromTemplate,
  createFateCoreTemplate,
} from './defaults'
import { syncValuesToTemplate } from './values'
import { parseImportData } from './schema'

describe('Fate Core template', () => {
  it('creates a character with default consequence values', () => {
    const template = createFateCoreTemplate()
    const character = createCharacterFromTemplate(template, 'Ари')
    const consequences = character.templateSnapshot.sections.find(
      (section) => section.id === 'sec_consequences',
    )?.fields[0] as GroupField
    const value = character.values[consequences.id] as GroupValue

    expect(character.name).toBe('Ари')
    expect(character.values['fld_name']).toBe('Ари')
    expect(value.items).toHaveLength(3)
    expect(
      value.items.map((item) => item.values['fld_consequence_value']),
    ).toEqual([2, 4, 6])
  })

  it('initializes skills with six empty rows', () => {
    const template = createFateCoreTemplate()
    const character = createCharacterFromTemplate(template)
    const skills = template.sections.find((section) => section.id === 'sec_skills')
      ?.fields[0] as GroupField
    const value = character.values[skills.id] as GroupValue

    expect(value.items).toHaveLength(6)
    expect(value.items[0].values['fld_skill_name']).toBe('')
    expect(value.items[0].values['fld_skill_rank']).toBeNull()
  })
})

describe('syncValuesToTemplate', () => {
  it('preserves checked tracker boxes when the structure changes', () => {
    const template = createFateCoreTemplate()
    const character = createCharacterFromTemplate(template)
    const tracker = character.values['trk_physical'] as TrackerValue
    tracker.boxes[0].checked = true

    const nextTemplate = structuredClone(template)
    const synced = syncValuesToTemplate(nextTemplate, character.values)
    const nextTracker = synced['trk_physical'] as TrackerValue

    expect(nextTracker.boxes[0].checked).toBe(true)
  })

  it('applies custom tracker box values from the field definition', () => {
    const template = createFateCoreTemplate()
    const character = createCharacterFromTemplate(template)
    const nextTemplate = structuredClone(template)
    const stress = nextTemplate.sections.find(
      (section) => section.id === 'sec_stress',
    )
    const tracker = stress?.fields[0] as TrackerField
    tracker.boxes[0].value = 10
    tracker.boxes[1].value = 25

    const synced = syncValuesToTemplate(nextTemplate, character.values)
    const nextTracker = synced[tracker.id] as TrackerValue

    expect(nextTracker.boxes.map((box) => box.value)).toEqual([10, 25, 3, 4])
  })

  it('adds values for new fields and removes values of deleted fields', () => {
    const template = createFateCoreTemplate()
    const character = createCharacterFromTemplate(template, 'Ари')
    const nextTemplate = structuredClone(template)

    nextTemplate.sections[0].fields = nextTemplate.sections[0].fields.filter(
      (field) => field.id !== 'fld_race',
    )
    nextTemplate.sections[0].fields.push({
      id: 'fld_new_field',
      kind: 'shortText',
      label: 'Новое поле',
      width: 6,
    })

    const synced = syncValuesToTemplate(nextTemplate, character.values)

    expect(synced['fld_race']).toBeUndefined()
    expect(synced['fld_new_field']).toBe('')
    expect(synced['fld_name']).toBe('Ари')
  })
})

describe('import schema', () => {
  it('parses a character export', () => {
    const character = createCharacterFromTemplate(createFateCoreTemplate(), 'Ари')
    const parsed = parseImportData({
      format: CHARACTER_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      character,
    })

    expect(parsed.kind).toBe('character')
    if (parsed.kind === 'character') {
      expect(parsed.character.name).toBe('Ари')
      expect(parsed.character.templateSnapshot.sections.length).toBeGreaterThan(0)
    }
  })

  it('parses section typography and spacing', () => {
    const template = createFateCoreTemplate()
    template.sections[0].typography = {
      titleSize: 15,
      bodySize: 10,
      family: 'serif',
      titleItalic: true,
      bodyBold: true,
    }
    template.sections[0].spaceAfter = 18

    const parsed = parseImportData({
      format: TEMPLATE_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      template,
    })

    expect(parsed.kind).toBe('template')
    if (parsed.kind === 'template') {
      expect(parsed.template.sections[0].typography).toEqual({
        titleSize: 15,
        bodySize: 10,
        family: 'serif',
        titleItalic: true,
        bodyBold: true,
      })
      expect(parsed.template.sections[0].spaceAfter).toBe(18)
    }
  })

  it('rejects an unknown file format', () => {
    expect(() => parseImportData({ hello: 'world' })).toThrow(
      /Не удалось распознать файл/,
    )
  })

  it('clones a character with a new id and name', () => {
    const original = createCharacterFromTemplate(createFateCoreTemplate(), 'Ари')
    const copy = cloneCharacter(original, 'Ари (копия)')

    expect(copy.id).not.toBe(original.id)
    expect(copy.name).toBe('Ари (копия)')
    expect(copy.values['fld_name']).toBe('Ари (копия)')
  })
})
