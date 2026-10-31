import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Eye,
  FileJson,
  Loader2,
  Pencil,
  UserPlus,
  Wrench,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Template } from '../domain/types'
import { createCharacter, getTemplate, saveTemplate } from '../storage/repository'
import { exportTemplateFile } from '../storage/transfer'
import { saveStatusLabel, useAutoSave, type SaveStatus } from '../hooks/useAutoSave'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { cn } from '../ui/utils'
import { StructureEditor } from '../components/StructureEditor'
import { TemplatePreview } from '../components/TemplatePreview'
import { CreateCharacterDialog } from '../components/CreateCharacterDialog'

type EditorTab = 'structure' | 'preview'

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

export function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [template, setTemplate] = useState<Template | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [createOpen, setCreateOpen] = useState(false)
  const [tab, setTab] = useState<EditorTab>('structure')

  const saveStatus = useAutoSave(template, async (next) => {
    await saveTemplate({
      ...next,
      name: next.name.trim() || 'Без названия',
      updatedAt: new Date().toISOString(),
    })
  })

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setStatus('missing')
      return
    }

    setStatus('loading')
    getTemplate(id)
      .then((found) => {
        if (cancelled) return
        if (!found) {
          setStatus('missing')
          return
        }
        setTemplate(found)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('missing')
      })

    return () => {
      cancelled = true
    }
  }, [id])

  if (status === 'loading') {
    return (
      <main className="page page--centered">
        <div className="loading-screen">
          <Loader2 size={28} className="spin" />
          <p>Загружаем шаблон…</p>
        </div>
      </main>
    )
  }

  if (status === 'missing' || !template) {
    return (
      <main className="page page--centered">
        <div className="empty-state">
          <h1>Шаблон не найден</h1>
          <p>Возможно, он был удалён или ссылка устарела.</p>
          <Button variant="primary" icon={<ArrowLeft size={16} />} onClick={() => navigate('/')}>
            В библиотеку
          </Button>
        </div>
      </main>
    )
  }

  const handleCreateCharacter = async (_templateId: string, name: string) => {
    const character = await createCharacter(template, name)
    await saveTemplate({
      ...template,
      name: template.name.trim() || 'Без названия',
      updatedAt: new Date().toISOString(),
    })
    setCreateOpen(false)
    toast(`Персонаж создан по шаблону «${template.name}».`, 'success')
    navigate(`/character/${character.id}`)
  }

  return (
    <div className="app-shell">
      <header className="editor-header no-print">
        <Button
          variant="ghost"
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate('/')}
        >
          Библиотека
        </Button>

        <div className="editor-header__title editor-header__title--with-input">
          <span className="eyebrow">Шаблон анкеты</span>
          <input
            className="input input--template-name"
            value={template.name}
            aria-label="Название шаблона"
            onChange={(event) =>
              setTemplate((current) =>
                current ? { ...current, name: event.target.value } : current,
              )
            }
          />
        </div>

        <div className="editor-header__actions">
          <SaveIndicator status={saveStatus} />
          <Button
            variant="ghost"
            icon={<FileJson size={16} />}
            onClick={() => {
              exportTemplateFile(template)
              toast('JSON шаблона скачан.', 'success')
            }}
          >
            Экспорт JSON
          </Button>
          <Button
            variant="primary"
            icon={<UserPlus size={16} />}
            onClick={() => setCreateOpen(true)}
          >
            Создать персонажа
          </Button>
        </div>
      </header>

      <main className="page page--editor">
        <div className="tabs no-print" role="tablist" aria-label="Режим шаблона">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'structure'}
            className={cn('tab', tab === 'structure' && 'is-active')}
            onClick={() => setTab('structure')}
          >
            <Wrench size={15} />
            Конструктор
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'preview'}
            className={cn('tab', tab === 'preview' && 'is-active')}
            onClick={() => setTab('preview')}
          >
            <Eye size={15} />
            Предпросмотр
          </button>
        </div>

        {tab === 'structure' ? (
          <>
            <div className="template-meta">
              <label className="form-field">
                <span>Описание шаблона</span>
                <input
                  className="input"
                  value={template.description ?? ''}
                  placeholder="Для какой игры или варианта правил этот шаблон"
                  onChange={(event) =>
                    setTemplate((current) =>
                      current
                        ? {
                            ...current,
                            description: event.target.value || undefined,
                          }
                        : current,
                    )
                  }
                />
              </label>
            </div>

            <StructureEditor
              template={template}
              onChange={setTemplate}
              context="template"
            />
          </>
        ) : (
          <TemplatePreview template={template} />
        )}
      </main>

      <CreateCharacterDialog
        open={createOpen}
        templates={[template]}
        initialTemplateId={template.id}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateCharacter}
      />
    </div>
  )
}
