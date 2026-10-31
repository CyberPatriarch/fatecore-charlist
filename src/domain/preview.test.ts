import { describe, expect, it } from 'vitest'
import type { GroupField, GroupValue } from './types'
import { createFateCoreTemplate } from './defaults'
import { createPreviewCharacter } from './preview'

function groupValue(
  values: Record<string, unknown>,
  groupId: string,
): GroupValue {
  return values[groupId] as GroupValue
}

describe('createPreviewCharacter', () => {
  it('builds a filled sample sheet from the template', () => {
    const template = createFateCoreTemplate()
    const preview = createPreviewCharacter(template)
    const skills = template.sections.find((section) => section.id === 'sec_skills')
      ?.fields[0] as GroupField
    const consequences = template.sections.find(
      (section) => section.id === 'sec_consequences',
    )?.fields[0] as GroupField
    const skillsValue = groupValue(preview.values, skills.id)
    const consequencesValue = groupValue(preview.values, consequences.id)

    expect(preview.name).toBe('Ари из Тени')
    expect(preview.values['fld_name']).toBe('Ари из Тени')
    expect(preview.values['fld_race']).toBe('Человек')
    expect(skillsValue.items[0].values['fld_skill_name']).toBe('Атлетика')
    expect(skillsValue.items[0].values['fld_skill_rank']).toBe(4)
    expect(
      consequencesValue.items.map(
        (item) => item.values['fld_consequence_value'],
      ),
    ).toEqual([2, 4, 6])
  })

  it('can build a blank preview without sample values', () => {
    const template = createFateCoreTemplate()
    const preview = createPreviewCharacter(template, false)

    expect(preview.name).toBe('Имя персонажа')
    expect(preview.values['fld_name']).toBe('')
    expect(preview.values['fld_race']).toBe('')
  })

  it('does not mutate the source template', () => {
    const template = createFateCoreTemplate()
    const before = JSON.stringify(template)

    const preview = createPreviewCharacter(template)
    preview.templateSnapshot.sections[0].title = 'Изменено'

    expect(JSON.stringify(template)).toBe(before)
  })
})
