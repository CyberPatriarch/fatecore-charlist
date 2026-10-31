import {
  ArrowDown,
  ArrowUp,
  Copy,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react'
import { useId, useState, type CSSProperties } from 'react'
import type {
  Field,
  GroupField,
  Section,
  SectionAccent,
  SectionFontFamily,
  SectionStyle,
  SectionTypography,
  Template,
  TrackerField,
} from '../domain/types'
import { createFieldDefinition, type NewFieldKind } from '../domain/defaults'
import { uid } from '../domain/ids'
import { Button, IconButton } from '../ui/Button'
import { cn } from '../ui/utils'

interface StructureEditorProps {
  template: Template
  onChange: (template: Template) => void
  context: 'template' | 'character'
}

const FIELD_KIND_LABELS: Record<Field['kind'], string> = {
  shortText: 'Короткий текст',
  longText: 'Длинный текст',
  number: 'Число',
  tracker: 'Трекер',
  group: 'Группа',
}

const PRESET_LABELS: Record<GroupField['preset'], string> = {
  custom: 'Своя группа',
  skills: 'Навыки',
  tricks: 'Трюки',
  consequences: 'Последствия',
}

const WIDTH_OPTIONS = [
  { value: 3, label: '1/4' },
  { value: 4, label: '1/3' },
  { value: 6, label: '1/2' },
  { value: 8, label: '2/3' },
  { value: 12, label: 'Полная' },
]

const SECTION_STYLE_LABELS: Record<SectionStyle, string> = {
  band: 'Цветная полоса',
  line: 'Акцентная линия',
  plain: 'Строгий стиль',
}

const SECTION_ACCENT_LABELS: Record<SectionAccent, string> = {
  wine: 'Вино',
  teal: 'Бирюза',
  gold: 'Золото',
  slate: 'Графит',
}

const SECTION_FONT_LABELS: Record<'default' | SectionFontFamily, string> = {
  default: 'Как в анкете',
  sans: 'Без засечек',
  serif: 'С засечками',
}

function optionalNumber(raw: string): number | undefined {
  if (raw === '') return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

function clampedNumber(
  raw: string,
  min: number,
  max: number,
): number | undefined {
  const value = optionalNumber(raw)
  if (value === undefined) return undefined
  return Math.min(max, Math.max(min, value))
}

function sectionSwatchStyle(section: Section): CSSProperties {
  const typography = section.typography

  return {
    fontFamily:
      typography?.family === 'serif'
        ? 'var(--serif)'
        : typography?.family === 'sans'
          ? 'var(--font)'
          : undefined,
    fontSize:
      typography?.titleSize !== undefined
        ? `${typography.titleSize}pt`
        : undefined,
    fontWeight: typography?.titleBold === false ? 400 : 700,
    fontStyle: typography?.titleItalic ? 'italic' : undefined,
  }
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= items.length) return items
  const copy = [...items]
  const [item] = copy.splice(index, 1)
  copy.splice(nextIndex, 0, item)
  return copy
}

function regenerateFieldIds(field: Field): Field {
  const copy = structuredClone(field)
  copy.id = uid('fld')

  if (copy.kind === 'tracker') {
    copy.boxes = copy.boxes.map((box) => ({ ...box, id: uid('box') }))
  }

  if (copy.kind === 'group') {
    const idMap = new Map<string, string>()
    copy.children = copy.children.map((child) => {
      const oldId = child.id
      const next = regenerateFieldIds(child)
      idMap.set(oldId, next.id)
      return next
    })
    copy.initialItems = copy.initialItems?.map((item) =>
      Object.fromEntries(
        Object.entries(item).map(([key, value]) => [idMap.get(key) ?? key, value]),
      ),
    )
  }

  return copy
}

function regenerateSection(section: Section): Section {
  return {
    ...structuredClone(section),
    id: uid('sec'),
    title: `${section.title} (копия)`,
    fields: section.fields.map(regenerateFieldIds),
  }
}

export function StructureEditor({
  template,
  onChange,
  context,
}: StructureEditorProps) {
  const updateSection = (sectionId: string, updater: (section: Section) => Section) => {
    onChange({
      ...template,
      updatedAt: new Date().toISOString(),
      sections: template.sections.map((section) =>
        section.id === sectionId ? updater(section) : section,
      ),
    })
  }

  const updateField = (
    sectionId: string,
    fieldId: string,
    updater: (field: Field) => Field,
  ) => {
    updateSection(sectionId, (section) => ({
      ...section,
      fields: section.fields.map((field) =>
        field.id === fieldId ? updater(field) : field,
      ),
    }))
  }

  const updateTypography = (
    sectionId: string,
    patch: Partial<SectionTypography>,
  ) => {
    updateSection(sectionId, (section) => ({
      ...section,
      typography: { ...section.typography, ...patch },
    }))
  }

  const addField = (sectionId: string, kind: NewFieldKind) => {
    updateSection(sectionId, (section) => ({
      ...section,
      fields: [...section.fields, createFieldDefinition(kind)],
    }))
  }

  const addSection = () => {
    onChange({
      ...template,
      updatedAt: new Date().toISOString(),
      sections: [
        ...template.sections,
        {
          id: uid('sec'),
          title: 'Новая секция',
          fields: [],
        },
      ],
    })
  }

  const moveSection = (index: number, direction: -1 | 1) => {
    onChange({
      ...template,
      updatedAt: new Date().toISOString(),
      sections: moveItem(template.sections, index, direction),
    })
  }

  const duplicateSection = (section: Section) => {
    onChange({
      ...template,
      updatedAt: new Date().toISOString(),
      sections: [...template.sections, regenerateSection(section)],
    })
  }

  const deleteSection = (section: Section) => {
    if (
      !window.confirm(
        `Удалить секцию «${section.title}» и все её поля?${
          context === 'character' ? ' Значения этих полей тоже будут удалены.' : ''
        }`,
      )
    ) {
      return
    }
    onChange({
      ...template,
      updatedAt: new Date().toISOString(),
      sections: template.sections.filter((item) => item.id !== section.id),
    })
  }

  return (
    <div className="structure-editor">
      {context === 'character' ? (
        <div className="notice">
          Изменения структуры применяются только к этой анкете. При удалении поля
          его значение тоже удаляется.
        </div>
      ) : (
        <div className="notice">
          Изменения шаблона не затрагивают уже созданных персонажей. Они увидят
          новую структуру только при создании из этого шаблона.
        </div>
      )}

      {template.sections.map((section, sectionIndex) => (
        <section key={section.id} className="structure-section">
          <header className="structure-section__header">
            <span className="structure-section__handle" aria-hidden="true">
              <GripVertical size={18} />
            </span>
            <input
              className="input input--section-title"
              value={section.title}
              aria-label="Название секции"
              onChange={(event) =>
                updateSection(section.id, (current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
            <div className="structure-controls">
              <IconButton
                label="Секция выше"
                onClick={() => moveSection(sectionIndex, -1)}
                disabled={sectionIndex === 0}
              >
                <ArrowUp size={16} />
              </IconButton>
              <IconButton
                label="Секция ниже"
                onClick={() => moveSection(sectionIndex, 1)}
                disabled={sectionIndex === template.sections.length - 1}
              >
                <ArrowDown size={16} />
              </IconButton>
              <IconButton
                label="Дублировать секцию"
                onClick={() => duplicateSection(section)}
              >
                <Copy size={16} />
              </IconButton>
              <IconButton
                label="Удалить секцию"
                variant="danger"
                onClick={() => deleteSection(section)}
              >
                <Trash2 size={16} />
              </IconButton>
            </div>
          </header>

          <input
            className="input input--section-description"
            value={section.description ?? ''}
            placeholder="Короткое описание секции (необязательно)"
            aria-label="Описание секции"
            onChange={(event) =>
              updateSection(section.id, (current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />

          <div className="section-appearance">
            <label className="mini-field">
              <span>Оформление в печати</span>
              <select
                className="input input--select"
                value={section.style ?? 'band'}
                aria-label={`Оформление секции «${section.title}»`}
                onChange={(event) =>
                  updateSection(section.id, (current) => ({
                    ...current,
                    style: event.target.value as SectionStyle,
                  }))
                }
              >
                {(
                  Object.entries(SECTION_STYLE_LABELS) as Array<
                    [SectionStyle, string]
                  >
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mini-field">
              <span>Цвет секции</span>
              <select
                className="input input--select"
                value={section.accent ?? 'wine'}
                aria-label={`Цвет секции «${section.title}»`}
                onChange={(event) =>
                  updateSection(section.id, (current) => ({
                    ...current,
                    accent: event.target.value as SectionAccent,
                  }))
                }
              >
                {(
                  Object.entries(SECTION_ACCENT_LABELS) as Array<
                    [SectionAccent, string]
                  >
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div
              className={`section-swatch section-swatch--${section.style ?? 'band'} accent-${section.accent ?? 'wine'}`}
              aria-hidden="true"
            >
              <span style={sectionSwatchStyle(section)}>
                {section.title.trim() || 'Секция'}
              </span>
              {section.description ? <small>{section.description}</small> : null}
              {section.spaceAfter !== undefined ? (
                <small className="section-swatch__gap">
                  +{section.spaceAfter} мм
                </small>
              ) : null}
            </div>

            <span className="section-appearance__divider">
              Шрифт и отступы
            </span>

            <label className="mini-field">
              <span>Шрифт</span>
              <select
                className="input input--select"
                value={section.typography?.family ?? 'default'}
                aria-label={`Шрифт секции «${section.title}»`}
                onChange={(event) =>
                  updateTypography(section.id, {
                    family:
                      event.target.value === 'default'
                        ? undefined
                        : (event.target.value as SectionFontFamily),
                  })
                }
              >
                {(
                  Object.entries(SECTION_FONT_LABELS) as Array<
                    ['default' | SectionFontFamily, string]
                  >
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mini-field">
              <span>Заголовок, pt</span>
              <input
                className="input input--number"
                type="number"
                min={5}
                max={48}
                step={0.5}
                value={section.typography?.titleSize ?? ''}
                placeholder={section.style === 'band' ? '11.6' : '12.5'}
                aria-label={`Размер заголовка секции «${section.title}»`}
                onChange={(event) =>
                  updateTypography(section.id, {
                    titleSize: optionalNumber(event.target.value),
                  })
                }
                onBlur={(event) => {
                  const titleSize = clampedNumber(event.target.value, 5, 48)
                  if (titleSize !== section.typography?.titleSize) {
                    updateTypography(section.id, { titleSize })
                  }
                }}
              />
            </label>

            <label className="mini-field">
              <span>Текст, pt</span>
              <input
                className="input input--number"
                type="number"
                min={5}
                max={32}
                step={0.5}
                value={section.typography?.bodySize ?? ''}
                placeholder="9.6"
                aria-label={`Размер текста секции «${section.title}»`}
                onChange={(event) =>
                  updateTypography(section.id, {
                    bodySize: optionalNumber(event.target.value),
                  })
                }
                onBlur={(event) => {
                  const bodySize = clampedNumber(event.target.value, 5, 32)
                  if (bodySize !== section.typography?.bodySize) {
                    updateTypography(section.id, { bodySize })
                  }
                }}
              />
            </label>

            <label className="mini-field">
              <span>Отступ после, мм</span>
              <input
                className="input input--number"
                type="number"
                min={0}
                max={200}
                step={1}
                value={section.spaceAfter ?? ''}
                placeholder="3.7"
                aria-label={`Отступ после секции «${section.title}»`}
                onChange={(event) =>
                  updateSection(section.id, (current) => ({
                    ...current,
                    spaceAfter: optionalNumber(event.target.value),
                  }))
                }
                onBlur={(event) => {
                  const spaceAfter = clampedNumber(event.target.value, 0, 200)
                  if (spaceAfter !== section.spaceAfter) {
                    updateSection(section.id, (current) => ({
                      ...current,
                      spaceAfter,
                    }))
                  }
                }}
              />
            </label>

            <div className="section-type-toggles">
              <span className="section-type-toggles__label">Заголовок</span>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={section.typography?.titleBold !== false}
                  onChange={(event) =>
                    updateTypography(section.id, {
                      titleBold: event.target.checked ? undefined : false,
                    })
                  }
                />
                полужирный
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={section.typography?.titleItalic ?? false}
                  onChange={(event) =>
                    updateTypography(section.id, {
                      titleItalic: event.target.checked || undefined,
                    })
                  }
                />
                курсив
              </label>

              <span className="section-type-toggles__label">Текст</span>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={section.typography?.bodyBold ?? false}
                  onChange={(event) =>
                    updateTypography(section.id, {
                      bodyBold: event.target.checked || undefined,
                    })
                  }
                />
                полужирный
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={section.typography?.bodyItalic ?? false}
                  onChange={(event) =>
                    updateTypography(section.id, {
                      bodyItalic: event.target.checked || undefined,
                    })
                  }
                />
                курсив
              </label>
            </div>

            <p className="section-appearance__hint">
              Отступ после секции создаёт пустое место в печати — например, для
              заметок от руки.
            </p>
          </div>

          <div className="structure-fields">
            {section.fields.map((field, fieldIndex) => (
              <FieldSettings
                key={field.id}
                field={field}
                isFirst={fieldIndex === 0}
                isLast={fieldIndex === section.fields.length - 1}
                onMove={(direction) =>
                  updateSection(section.id, (current) => ({
                    ...current,
                    fields: moveItem(current.fields, fieldIndex, direction),
                  }))
                }
                onDuplicate={() =>
                  updateSection(section.id, (current) => {
                    const index = current.fields.findIndex((item) => item.id === field.id)
                    const fields = [...current.fields]
                    fields.splice(index + 1, 0, regenerateFieldIds(field))
                    return { ...current, fields }
                  })
                }
                onDelete={() => {
                  if (
                    !window.confirm(
                      `Удалить поле «${field.label}»?${
                        context === 'character' ? ' Его значение будет удалено.' : ''
                      }`,
                    )
                  ) {
                    return
                  }
                  updateSection(section.id, (current) => ({
                    ...current,
                    fields: current.fields.filter((item) => item.id !== field.id),
                  }))
                }}
                onUpdate={(updater) =>
                  updateField(section.id, field.id, updater)
                }
              />
            ))}
          </div>

          <AddFieldControl onAdd={(kind) => addField(section.id, kind)} />
        </section>
      ))}

      <Button variant="secondary" icon={<Plus size={16} />} onClick={addSection}>
        Добавить секцию
      </Button>
    </div>
  )
}

function AddFieldControl({ onAdd }: { onAdd: (kind: NewFieldKind) => void }) {
  const selectId = useId()
  const [kind, setKind] = useState<NewFieldKind>('shortText')

  return (
    <div className="add-field">
      <label className="sr-only" htmlFor={selectId}>
        Тип нового поля
      </label>
      <select
        id={selectId}
        className="input input--select"
        value={kind}
        onChange={(event) => setKind(event.target.value as NewFieldKind)}
      >
        <optgroup label="Поля">
          <option value="shortText">Короткий текст</option>
          <option value="longText">Длинный текст</option>
          <option value="number">Число</option>
          <option value="tracker">Трекер</option>
        </optgroup>
        <optgroup label="Готовые группы">
          <option value="skills">Навыки</option>
          <option value="tricks">Трюки</option>
          <option value="consequences">Последствия</option>
          <option value="group">Своя группа</option>
        </optgroup>
      </select>
      <Button
        size="sm"
        variant="secondary"
        icon={<Plus size={15} />}
        onClick={() => onAdd(kind)}
      >
        Добавить поле
      </Button>
    </div>
  )
}

function FieldSettings({
  field,
  isFirst,
  isLast,
  onMove,
  onDuplicate,
  onDelete,
  onUpdate,
}: {
  field: Field
  isFirst: boolean
  isLast: boolean
  onMove: (direction: -1 | 1) => void
  onDuplicate: () => void
  onDelete: () => void
  onUpdate: (updater: (field: Field) => Field) => void
}) {
  return (
    <article className={cn('structure-field', `structure-field--${field.kind}`)}>
      <header className="structure-field__header">
        <span className="type-badge">{FIELD_KIND_LABELS[field.kind]}</span>
        {field.kind === 'group' ? (
          <span className="type-badge type-badge--muted">
            {PRESET_LABELS[field.preset]}
          </span>
        ) : null}
        <input
          className="input input--field-title"
          value={field.label}
          aria-label="Название поля"
          onChange={(event) =>
            onUpdate((current) => ({ ...current, label: event.target.value }))
          }
        />
        <div className="structure-controls">
          <IconButton label="Поле выше" onClick={() => onMove(-1)} disabled={isFirst}>
            <ArrowUp size={15} />
          </IconButton>
          <IconButton label="Поле ниже" onClick={() => onMove(1)} disabled={isLast}>
            <ArrowDown size={15} />
          </IconButton>
          <IconButton label="Дублировать поле" onClick={onDuplicate}>
            <Copy size={15} />
          </IconButton>
          <IconButton label="Удалить поле" variant="danger" onClick={onDelete}>
            <Trash2 size={15} />
          </IconButton>
        </div>
      </header>

      <div className="structure-field__settings">
        <label className="mini-field">
          <span>Ширина</span>
          <select
            className="input input--select"
            value={field.width ?? 12}
            onChange={(event) =>
              onUpdate((current) => ({
                ...current,
                width: Number(event.target.value),
              }))
            }
          >
            {WIDTH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mini-field mini-field--wide">
          <span>Подсказка</span>
          <input
            className="input"
            value={field.hint ?? ''}
            placeholder="Пояснение под названием поля"
            onChange={(event) =>
              onUpdate((current) => ({
                ...current,
                hint: event.target.value || undefined,
              }))
            }
          />
        </label>

        {field.kind === 'shortText' ? (
          <>
            <label className="mini-field mini-field--wide">
              <span>Placeholder</span>
              <input
                className="input"
                value={field.placeholder ?? ''}
                onChange={(event) =>
                  onUpdate((current) =>
                    current.kind === 'shortText'
                      ? { ...current, placeholder: event.target.value || undefined }
                      : current,
                  )
                }
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={field.isName ?? false}
                onChange={(event) =>
                  onUpdate((current) => ({
                    ...current,
                    isName: event.target.checked || undefined,
                  }))
                }
              />
              Использовать как имя персонажа в списке
            </label>
          </>
        ) : null}

        {field.kind === 'longText' ? (
          <>
            <label className="mini-field">
              <span>Строк</span>
              <input
                className="input input--number"
                type="number"
                min={1}
                max={20}
                value={field.rows ?? 3}
                onChange={(event) =>
                  onUpdate((current) =>
                    current.kind === 'longText'
                      ? { ...current, rows: Number(event.target.value) || 1 }
                      : current,
                  )
                }
              />
            </label>
            <label className="mini-field mini-field--wide">
              <span>Placeholder</span>
              <input
                className="input"
                value={field.placeholder ?? ''}
                onChange={(event) =>
                  onUpdate((current) =>
                    current.kind === 'longText'
                      ? { ...current, placeholder: event.target.value || undefined }
                      : current,
                  )
                }
              />
            </label>
          </>
        ) : null}

        {field.kind === 'number' ? (
          <>
            <label className="mini-field">
              <span>По умолчанию</span>
              <input
                className="input input--number"
                type="number"
                value={field.defaultValue ?? ''}
                onChange={(event) =>
                  onUpdate((current) =>
                    current.kind === 'number'
                      ? {
                          ...current,
                          defaultValue:
                            event.target.value === ''
                              ? null
                              : Number(event.target.value),
                        }
                      : current,
                  )
                }
              />
            </label>
            <label className="mini-field">
              <span>Шаг</span>
              <input
                className="input input--number"
                type="number"
                value={field.step ?? 1}
                onChange={(event) =>
                  onUpdate((current) =>
                    current.kind === 'number'
                      ? { ...current, step: Number(event.target.value) || 1 }
                      : current,
                  )
                }
              />
            </label>
          </>
        ) : null}

        {field.kind === 'tracker' ? (
          <TrackerSettings field={field} onUpdate={onUpdate} />
        ) : null}

        {field.kind === 'group' ? (
          <GroupSettings field={field} onUpdate={onUpdate} />
        ) : null}
      </div>
    </article>
  )
}

function TrackerSettings({
  field,
  onUpdate,
}: {
  field: TrackerField
  onUpdate: (updater: (field: Field) => Field) => void
}) {
  const updateTracker = (updater: (field: TrackerField) => TrackerField) => {
    onUpdate((current) =>
      current.kind === 'tracker' ? updater(current) : current,
    )
  }

  const resize = (count: number, mode: TrackerField['mode']) => {
    updateTracker((current) => {
      const nextCount = Math.max(0, Math.min(20, count))
      const boxes = current.boxes.slice(0, nextCount)
      const nextValue = () =>
        boxes.reduce((max, box) => Math.max(max, box.value ?? 0), 0) + 1
      while (boxes.length < nextCount) {
        boxes.push({
          id: uid('box'),
          value: mode === 'valued' ? nextValue() : undefined,
        })
      }
      return {
        ...current,
        mode,
        boxes: boxes.map((box, index) => ({
          ...box,
          value: mode === 'valued' ? box.value ?? index + 1 : undefined,
        })),
      }
    })
  }

  return (
    <>
      <label className="mini-field">
        <span>Режим</span>
        <select
          className="input input--select"
          value={field.mode}
          onChange={(event) =>
            resize(field.boxes.length, event.target.value as TrackerField['mode'])
          }
        >
          <option value="boxes">Кружки без чисел</option>
          <option value="valued">Кружки со значениями</option>
        </select>
      </label>
      <label className="mini-field">
        <span>Кружков</span>
        <input
          className="input input--number"
          type="number"
          min={0}
          max={20}
          value={field.boxes.length}
          onChange={(event) =>
            resize(Number(event.target.value) || 0, field.mode)
          }
        />
      </label>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={field.allowAddRemove}
          onChange={(event) =>
            updateTracker((current) => ({
              ...current,
              allowAddRemove: event.target.checked,
            }))
          }
        />
        Разрешить добавлять и убирать кружки
      </label>

      {field.mode === 'valued' ? (
        <div className="tracker-values-editor">
          <div className="tracker-values-editor__title">Значения кружков</div>
          <div className="tracker-values-editor__grid">
            {field.boxes.map((box, index) => (
              <label key={box.id} className="tracker-value-field">
                <span>{index + 1}</span>
                <input
                  className="input input--number"
                  type="number"
                  step="any"
                  value={box.value ?? ''}
                  placeholder={String(index + 1)}
                  aria-label={`Значение кружка ${index + 1}`}
                  onChange={(event) => {
                    const value = optionalNumber(event.target.value)
                    updateTracker((current) => ({
                      ...current,
                      boxes: current.boxes.map((item) =>
                        item.id === box.id ? { ...item, value } : item,
                      ),
                    }))
                  }}
                />
              </label>
            ))}
          </div>
          <p className="tracker-values-editor__hint">
            Можно указать любые числа, в том числе не по порядку. Пустое поле
            означает значение по номеру кружка.
          </p>
        </div>
      ) : null}

      <div className="tracker-preview" aria-hidden="true">
        {field.boxes.map((box) => (
          <span key={box.id} className="tracker-box tracker-box--preview">
            {field.mode === 'valued' ? box.value : null}
          </span>
        ))}
        {field.boxes.length === 0 ? <span className="muted">Нет кружков</span> : null}
      </div>
    </>
  )
}

function GroupSettings({
  field,
  onUpdate,
}: {
  field: GroupField
  onUpdate: (updater: (field: Field) => Field) => void
}) {
  const updateGroup = (updater: (field: GroupField) => GroupField) => {
    onUpdate((current) => (current.kind === 'group' ? updater(current) : current))
  }

  const addChild = (kind: 'shortText' | 'longText' | 'number') => {
    updateGroup((current) => ({
      ...current,
      children: [...current.children, createFieldDefinition(kind)],
    }))
  }

  return (
    <>
      <label className="mini-field">
        <span>Повторяемая</span>
        <select
          className="input input--select"
          value={field.repeatable ? 'yes' : 'no'}
          onChange={(event) =>
            updateGroup((current) => ({
              ...current,
              repeatable: event.target.value === 'yes',
              allowAddRemove:
                event.target.value === 'yes' ? current.allowAddRemove ?? true : false,
            }))
          }
        >
          <option value="yes">Да, можно добавлять строки</option>
          <option value="no">Нет, одна строка</option>
        </select>
      </label>

      {field.repeatable ? (
        <label className="mini-field">
          <span>Строк по умолчанию</span>
          <input
            className="input input--number"
            type="number"
            min={0}
            max={30}
            value={field.initialRows ?? 1}
            onChange={(event) =>
              updateGroup((current) => ({
                ...current,
                initialRows: Math.max(0, Number(event.target.value) || 0),
              }))
            }
          />
        </label>
      ) : null}

      {field.repeatable ? (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={field.allowAddRemove !== false}
            onChange={(event) =>
              updateGroup((current) => ({
                ...current,
                allowAddRemove: event.target.checked,
              }))
            }
          />
          Разрешить добавлять и убирать строки
        </label>
      ) : null}

      <div className="group-children-editor">
        <div className="group-children-editor__title">Поля внутри строки</div>
        {field.children.map((child) => (
          <div key={child.id} className="group-child-row">
            <span className="type-badge type-badge--small">
              {FIELD_KIND_LABELS[child.kind]}
            </span>
            <input
              className="input"
              value={child.label}
              aria-label="Название поля внутри группы"
              onChange={(event) =>
                updateGroup((current) => ({
                  ...current,
                  children: current.children.map((item) =>
                    item.id === child.id
                      ? { ...item, label: event.target.value }
                      : item,
                  ),
                }))
              }
            />
            <select
              className="input input--select input--width"
              value={child.width ?? 12}
              aria-label="Ширина поля внутри группы"
              onChange={(event) =>
                updateGroup((current) => ({
                  ...current,
                  children: current.children.map((item) =>
                    item.id === child.id
                      ? { ...item, width: Number(event.target.value) }
                      : item,
                  ),
                }))
              }
            >
              {WIDTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <IconButton
              label="Удалить поле из группы"
              variant="danger"
              onClick={() =>
                updateGroup((current) => ({
                  ...current,
                  children: current.children.filter((item) => item.id !== child.id),
                }))
              }
            >
              <Trash2 size={15} />
            </IconButton>
          </div>
        ))}

        {field.children.length === 0 ? (
          <div className="muted">В группе нет полей.</div>
        ) : null}

        <div className="group-child-add">
          <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={() => addChild('shortText')}>
            Текст
          </Button>
          <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={() => addChild('number')}>
            Число
          </Button>
          <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={() => addChild('longText')}>
            Длинный текст
          </Button>
        </div>
      </div>
    </>
  )
}
