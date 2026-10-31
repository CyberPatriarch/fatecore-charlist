import type { Character } from '../domain/types'
import { getCharacterDisplayName, isEmptyValue } from '../domain/values'
import { FieldView } from './FieldView'

interface PrintableSheetProps {
  character: Character
  hideEmpty?: boolean
  grayscale?: boolean
  density?: 'compact' | 'normal' | 'large'
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
