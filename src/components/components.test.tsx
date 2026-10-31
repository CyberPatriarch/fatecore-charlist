// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GroupField, TrackerField } from '../domain/types'
import { createDefaultValue } from '../domain/values'
import {
  createBlankTemplate,
  createCharacterFromTemplate,
  createFateCoreTemplate,
  createFieldDefinition,
} from '../domain/defaults'
import { FieldInput } from './FieldInput'
import { FieldView } from './FieldView'
import { PrintableSheet } from './PrintableSheet'
import { StructureEditor } from './StructureEditor'

describe('FieldInput', () => {
  it('edits a short text field', () => {
    const field = {
      id: 'fld_name',
      kind: 'shortText' as const,
      label: 'Имя',
      width: 6,
    }
    const onChange = vi.fn()
    render(<FieldInput field={field} value="Ари" onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Имя'), {
      target: { value: 'Ари из Тени' },
    })

    expect(onChange).toHaveBeenCalledWith('Ари из Тени')
  })

  it('toggles a tracker box', () => {
    const field: TrackerField = {
      id: 'trk',
      kind: 'tracker',
      label: 'Стресс',
      width: 6,
      mode: 'valued',
      allowAddRemove: true,
      boxes: [
        { id: 'b1', value: 1 },
        { id: 'b2', value: 2 },
      ],
    }
    const onChange = vi.fn()
    render(
      <FieldInput
        field={field}
        value={{ boxes: [{ id: 'b1', checked: false, value: 1 }] }}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByLabelText('Стресс, кружок 1, значение 1'))
    expect(onChange).toHaveBeenCalledWith({
      boxes: [{ id: 'b1', checked: true, value: 1 }],
    })
  })

  it('adds a row to a skills group', () => {
    const field = createFieldDefinition('skills') as GroupField
    const value = createDefaultValue(field)
    const onChange = vi.fn()
    render(<FieldInput field={field} value={value} onChange={onChange} />)

    expect(screen.getAllByPlaceholderText('Название навыка')).toHaveLength(6)
    fireEvent.click(screen.getByText('Добавить навык'))

    expect(onChange).toHaveBeenCalled()
    const next = onChange.mock.calls[0][0] as { items: unknown[] }
    expect(next.items).toHaveLength(7)
  })
})

describe('FieldView', () => {
  it('hides empty fields when requested', () => {
    const field = {
      id: 'fld_empty',
      kind: 'shortText' as const,
      label: 'Пусто',
      width: 6,
    }
    const { container } = render(
      <FieldView field={field} value="" hideEmpty />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders tracker circles for print', () => {
    const field: TrackerField = {
      id: 'trk',
      kind: 'tracker',
      label: 'Стресс',
      mode: 'valued',
      allowAddRemove: false,
      boxes: [{ id: 'b1', value: 1 }],
    }
    const { container } = render(
      <FieldView
        field={field}
        value={{ boxes: [{ id: 'b1', checked: true, value: 1 }] }}
      />,
    )

    expect(container.querySelector('.print-tracker__box')?.textContent).toBe('1')
  })
})

describe('PrintableSheet', () => {
  it('applies the selected section style and accent', () => {
    const template = createFateCoreTemplate()
    template.sections[0].style = 'line'
    template.sections[0].accent = 'teal'
    const character = createCharacterFromTemplate(template, 'Ари')

    const { container } = render(
      <PrintableSheet character={character} hideEmpty={false} />,
    )

    expect(
      container.querySelector('.print-section--line.accent-teal'),
    ).toBeTruthy()
  })

  it('applies section typography and spacing to the printed sheet', () => {
    const template = createFateCoreTemplate()
    template.sections[0].typography = {
      titleSize: 16,
      bodySize: 11,
      family: 'serif',
      titleBold: false,
      titleItalic: true,
      bodyBold: true,
      bodyItalic: true,
    }
    template.sections[0].spaceAfter = 12
    const character = createCharacterFromTemplate(template, 'Ари')

    const { container } = render(
      <PrintableSheet character={character} hideEmpty={false} />,
    )
    const section = container.querySelector('.print-section') as HTMLElement

    expect(section.style.getPropertyValue('--section-title-size')).toBe('16pt')
    expect(section.style.getPropertyValue('--section-body-size')).toBe('11pt')
    expect(section.style.getPropertyValue('--section-label-size')).toBe('8.1pt')
    expect(section.style.getPropertyValue('--section-font')).toBe('var(--serif)')
    expect(section.style.getPropertyValue('--section-title-weight')).toBe('400')
    expect(section.style.getPropertyValue('--section-title-style')).toBe(
      'italic',
    )
    expect(section.style.getPropertyValue('--section-body-weight')).toBe('700')
    expect(section.style.getPropertyValue('--section-body-style')).toBe(
      'italic',
    )
    expect(section.style.getPropertyValue('--section-gap')).toBe('12mm')
  })
})

describe('StructureEditor', () => {
  it('changes section appearance for print', () => {
    const template = createBlankTemplate()
    const onChange = vi.fn()
    render(
      <StructureEditor
        template={template}
        onChange={onChange}
        context="template"
      />,
    )

    fireEvent.change(screen.getByLabelText('Оформление секции «Основное»'), {
      target: { value: 'line' },
    })
    fireEvent.change(screen.getByLabelText('Цвет секции «Основное»'), {
      target: { value: 'gold' },
    })

    const withStyle = onChange.mock.calls[0][0] as typeof template
    const withAccent = onChange.mock.calls[1][0] as typeof template
    expect(withStyle.sections[0].style).toBe('line')
    expect(withAccent.sections[0].accent).toBe('gold')
  })

  it('configures section typography and spacing', () => {
    const template = createBlankTemplate()
    const onChange = vi.fn()
    render(
      <StructureEditor
        template={template}
        onChange={onChange}
        context="template"
      />,
    )

    fireEvent.change(
      screen.getByLabelText('Размер заголовка секции «Основное»'),
      { target: { value: '16' } },
    )
    fireEvent.change(
      screen.getByLabelText('Отступ после секции «Основное»'),
      { target: { value: '20' } },
    )
    fireEvent.click(screen.getAllByLabelText('курсив')[0])

    const withTitle = onChange.mock.calls[0][0] as typeof template
    const withGap = onChange.mock.calls[1][0] as typeof template
    const withItalic = onChange.mock.calls[2][0] as typeof template

    expect(withTitle.sections[0].typography?.titleSize).toBe(16)
    expect(withGap.sections[0].spaceAfter).toBe(20)
    expect(withItalic.sections[0].typography?.titleItalic).toBe(true)
  })

  it('allows arbitrary values on a valued tracker', () => {
    const template = createBlankTemplate()
    const tracker = createFieldDefinition('tracker') as TrackerField
    tracker.mode = 'valued'
    tracker.boxes = [
      { id: 'box_a', value: 1 },
      { id: 'box_b', value: 2 },
    ]
    template.sections[0].fields.push(tracker)

    const onChange = vi.fn()
    render(
      <StructureEditor
        template={template}
        onChange={onChange}
        context="template"
      />,
    )

    fireEvent.change(screen.getByLabelText('Значение кружка 2'), {
      target: { value: '7' },
    })

    const next = onChange.mock.calls[0][0] as typeof template
    const nextTracker = next.sections[0].fields[1] as TrackerField
    expect(nextTracker.boxes[1].value).toBe(7)
  })

  it('adds a field to a section', () => {
    const template = createBlankTemplate()
    const onChange = vi.fn()
    render(
      <StructureEditor
        template={template}
        onChange={onChange}
        context="template"
      />,
    )

    fireEvent.change(screen.getByLabelText('Тип нового поля'), {
      target: { value: 'number' },
    })
    fireEvent.click(screen.getByText('Добавить поле'))

    expect(onChange).toHaveBeenCalled()
    const next = onChange.mock.calls[0][0] as typeof template
    expect(next.sections[0].fields).toHaveLength(2)
    expect(next.sections[0].fields[1].kind).toBe('number')
  })
})
