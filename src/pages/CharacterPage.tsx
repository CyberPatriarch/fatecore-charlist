import {
  AlertTriangle,
  ArrowLeft,
  Check,
  FileJson,
  Loader2,
  Pencil,
  Printer,
  Wrench,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Character, Field, Template } from '../domain/types'
import {
  findTopLevelField,
  getCharacterDisplayName,
  syncValuesToTemplate,
} from '../domain/values'
import { getCharacter, saveCharacter } from '../storage/repository'
import { exportCharacterFile } from '../storage/transfer'
import { saveStatusLabel, useAutoSave, type SaveStatus } from '../hooks/useAutoSave'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { cn } from '../ui/utils'
import { FieldInput } from '../components/FieldInput'
import { StructureEditor } from '../components/StructureEditor'

type Tab = 'sheet' | 'structure'

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (!status || status === 'idle') return null

  return (
    <span className={cn('save-indicator', `save-indicator--${status}`)}>
      {status === 'saving' ? <Loader2 size={14} className="spin" /> : null}
      {status === 'saved' ? <Check size={14} /> : null}
      {status === 'dirty' ? <Pencil size={14} /> : null}
      {status === 'error' ? <AlertTriangle size={14} /> : null}
      {saveStatusLabel(status)}
    </span>
  )
}

export function CharacterPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [character, setCharacter] = useState<Character | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [tab, setTab] = useState<Tab>('sheet')
  const saveStatus = useAutoSave(character, async (next) => {
    await saveCharacter(next)
  })

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setStatus('missing')
      return
    }

    setStatus('loading')
    getCharacter(id)
      .then((found) => {
        if (cancelled) return
        if (!found) {
          setStatus('missing')
          return
        }
        setCharacter(found)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('missing')
      })

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!character) return
    document.title = `${getCharacterDisplayName(character)} — Fate Core`
    return () => {
      document.title = 'Fate Core — Анкеты'
    }
  }, [character])

  if (status === 'loading') {
    return (
      <main className="page page--centered">
        <div className="loading-screen">
          <Loader2 size={28} className="spin" />
          <p>Загружаем персонажа…</p>
        </div>
      </main>
    )
  }

  if (status === 'missing' || !character) {
    return (
      <main className="page page--centered">
        <div className="empty-state">
          <h1>Персонаж не найден</h1>
          <p>Возможно, он был удалён или ссылка устарела.</p>
          <Button variant="primary" icon={<ArrowLeft size={16} />} onClick={() => navigate('/')}>
            В библиотеку
          </Button>
        </div>
      </main>
    )
  }

  const displayName = getCharacterDisplayName(character)

  const updateValue = (field: Field, value: unknown) => {
    setCharacter((current) => {
      if (!current) return current
      const values = { ...current.values, [field.id]: value }
      const name =
        field.isName && typeof value === 'string'
          ? value.trim() || 'Без имени'
          : current.name

      return {
        ...current,
        values,
        name,
        updatedAt: new Date().toISOString(),
      }
    })
  }

  const updateTemplate = (template: Template) => {
    setCharacter((current) => {
      if (!current) return current
      const values = syncValuesToTemplate(template, current.values)
      const nameField = findTopLevelField(
        template,
        (field) => field.kind === 'shortText' && field.isName === true,
      )
      const nameValue = nameField ? values[nameField.id] : null
      const name =
        typeof nameValue === 'string' && nameValue.trim()
          ? nameValue.trim()
          : current.name

      return {
        ...current,
        templateSnapshot: template,
        values,
        name,
        updatedAt: new Date().toISOString(),
      }
    })
  }

  return (
    <div className="app-shell">
      <header className="editor-header">
        <Button
          variant="ghost"
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate('/')}
        >
          Библиотека
        </Button>

        <div className="editor-header__title">
          <span className="eyebrow">{character.templateSnapshot.name}</span>
          <h1>{displayName}</h1>
        </div>

        <div className="editor-header__actions">
          <SaveIndicator status={saveStatus} />
          <Button
            variant="ghost"
            icon={<FileJson size={16} />}
            onClick={() => {
              exportCharacterFile(character)
              toast('JSON персонажа скачан.', 'success')
            }}
          >
            Экспорт JSON
          </Button>
          <Button
            variant="secondary"
            icon={<Printer size={16} />}
            onClick={() => navigate(`/character/${character.id}/print`)}
          >
            Печать / PDF
          </Button>
        </div>
      </header>

      <main className="page page--editor">
        <div className="tabs" role="tablist" aria-label="Режим анкеты">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'sheet'}
            className={cn('tab', tab === 'sheet' && 'is-active')}
            onClick={() => setTab('sheet')}
          >
            Анкета
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'structure'}
            className={cn('tab', tab === 'structure' && 'is-active')}
            onClick={() => setTab('structure')}
          >
            <Wrench size={15} />
            Структура
          </button>
        </div>

        {tab === 'sheet' ? (
          <div className="sheet">
            {character.templateSnapshot.sections.length === 0 ? (
              <div className="empty-state empty-state--inline">
                <Wrench size={34} />
                <h3>В анкете пока нет секций</h3>
                <p>Перейдите во вкладку «Структура», чтобы добавить поля.</p>
                <Button variant="primary" onClick={() => setTab('structure')}>
                  Настроить структуру
                </Button>
              </div>
            ) : (
              character.templateSnapshot.sections.map((section) => (
                <section key={section.id} className="sheet-section">
                  <header className="sheet-section__header">
                    <h2>{section.title}</h2>
                    {section.description ? <p>{section.description}</p> : null}
                  </header>
                  <div className="sheet-grid">
                    {section.fields.map((field) => (
                      <FieldInput
                        key={field.id}
                        field={field}
                        value={character.values[field.id]}
                        onChange={(value) => updateValue(field, value)}
                      />
                    ))}
                    {section.fields.length === 0 ? (
                      <p className="muted sheet-section__empty">
                        В этой секции пока нет полей.
                      </p>
                    ) : null}
                  </div>
                </section>
              ))
            )}
          </div>
        ) : (
          <StructureEditor
            template={character.templateSnapshot}
            onChange={updateTemplate}
            context="character"
          />
        )}
      </main>
    </div>
  )
}
