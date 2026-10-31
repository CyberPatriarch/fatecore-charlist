import type { CSSProperties } from 'react'
import type { Character, Section } from '../domain/types'
import { getCharacterDisplayName, isEmptyValue } from '../domain/values'
import { FieldView } from './FieldView'

interface PrintableSheetProps {
  character: Character
  hideEmpty?: boolean
  grayscale?: boolean
  density?: 'compact' | 'normal' | 'large'
}

/** Превращает настройки секции в CSS-переменные печатного листа. */
function sectionPrintStyle(section: Section): CSSProperties | undefined {
  const typography = section.typography
  const style: Record<string, string> = {}

  if (typography?.bodySize !== undefined) {
    style['--section-body-size'] = `${typography.bodySize}pt`
    style['--section-label-size'] = `${Math.round(typography.bodySize * 0.74 * 10) / 10}pt`
  }

  if (typography?.titleSize !== undefined) {
    style['--section-title-size'] = `${typography.titleSize}pt`
  }

  if (typography?.family) {
    const font = typography.family === 'serif' ? 'var(--serif)' : 'var(--font)'
    style['--section-font'] = font
    style['--section-title-font'] = font
  }

  if (typography?.titleBold === false) {
    style['--section-title-weight'] = '400'
  }
  if (typography?.titleItalic) {
    style['--section-title-style'] = 'italic'
  }
  if (typography?.bodyBold) {
    style['--section-body-weight'] = '700'
  }
  if (typography?.bodyItalic) {
    style['--section-body-style'] = 'italic'
  }

  if (section.spaceAfter !== undefined) {
    style['--section-gap'] = `${section.spaceAfter}mm`
  }

  return Object.keys(style).length > 0 ? (style as CSSProperties) : undefined
}

export function PrintableSheet({
  character,
  hideEmpty = true,
  grayscale = false,
  density = 'normal',
}: PrintableSheetProps) {
  const name = getCharacterDisplayName(character)
  const template = character.templateSnapshot

  return (
    <article
      className={`print-sheet print-density--${density}${grayscale ? ' print-sheet--grayscale' : ''}`}
    >
      <header className="print-sheet__header">
        <div>
          <div className="print-sheet__eyebrow">{template.name}</div>
          <h1>{name}</h1>
        </div>
        <div className="print-sheet__stamp">Fate Core</div>
      </header>

      {template.sections.map((section) => {
        const fields = hideEmpty
          ? section.fields.filter((field) => !isEmptyValue(field, character.values[field.id]))
          : section.fields

        if (fields.length === 0) return null

        const style = section.style ?? 'band'
        const accent = section.accent ?? 'wine'

        return (
          <section
            key={section.id}
            className={`print-section print-section--${style} accent-${accent}`}
            style={sectionPrintStyle(section)}
          >
            <div className="print-section__header">
              <h2>{section.title}</h2>
              {section.description ? <p>{section.description}</p> : null}
            </div>
            <div className="print-section__grid">
              {fields.map((field) => (
                <FieldView
                  key={field.id}
                  field={field}
                  value={character.values[field.id]}
                  hideEmpty={hideEmpty}
                />
              ))}
            </div>
          </section>
        )
      })}

      <footer className="print-sheet__footer">
        <span>Лист персонажа Fate Core</span>
        <span>
          Обновлено{' '}
          {new Intl.DateTimeFormat('ru', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }).format(new Date(character.updatedAt))}
        </span>
      </footer>
    </article>
  )
}
