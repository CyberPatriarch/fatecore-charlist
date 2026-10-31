import {
  BookOpen,
  Copy,
  Download,
  FileJson,
  LayoutTemplate,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { countFields, countSections, getCharacterDisplayName } from '../domain/values'
import {
  createCharacter,
  createEmptyTemplate,
  createTemplateFromBase,
  deleteCharacter,
  deleteTemplate,
  duplicateCharacter,
  duplicateTemplate,
  listCharacters,
  listTemplates,
} from '../storage/repository'
import {
  exportBackupFile,
  exportCharacterFile,
  exportTemplateFile,
  importParsedData,
  parseImportFile,
} from '../storage/transfer'
import { Button, IconButton } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { CreateCharacterDialog } from '../components/CreateCharacterDialog'

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('ru', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function LibraryPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const characters = useLiveQuery(() => listCharacters(), [])
  const templates = useLiveQuery(() => listTemplates(), [])
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createTemplateId, setCreateTemplateId] = useState<string | undefined>()

  const filteredCharacters = useMemo(() => {
    if (!characters) return []
    const normalized = query.trim().toLocaleLowerCase('ru')
    if (!normalized) return characters
    return characters.filter((character) => {
      const name = getCharacterDisplayName(character).toLocaleLowerCase('ru')
      const template = character.templateSnapshot.name.toLocaleLowerCase('ru')
      return name.includes(normalized) || template.includes(normalized)
    })
  }, [characters, query])

  const openCreate = (templateId?: string) => {
    setCreateTemplateId(templateId)
    setCreateOpen(true)
  }

  const handleCreateCharacter = async (templateId: string, name: string) => {
    const template = templates?.find((item) => item.id === templateId)
    if (!template) {
      toast('Шаблон не найден.', 'error')
      return
    }

    const character = await createCharacter(template, name)
    setCreateOpen(false)
    toast('Персонаж создан.', 'success')
    navigate(`/character/${character.id}`)
  }

  const handleDuplicateCharacter = async (id: string) => {
    const character = characters?.find((item) => item.id === id)
    if (!character) return
    const copy = await duplicateCharacter(character)
    toast('Создана копия персонажа.', 'success')
    navigate(`/character/${copy.id}`)
  }

  const handleDeleteCharacter = async (id: string, name: string) => {
    if (!window.confirm(`Удалить персонажа «${name}»? Это действие нельзя отменить.`)) {
      return
    }
    await deleteCharacter(id)
    toast('Персонаж удалён.', 'success')
  }

  const handleDuplicateTemplate = async (id: string) => {
    const template = templates?.find((item) => item.id === id)
    if (!template) return
    const copy = await duplicateTemplate(template)
    toast('Шаблон скопирован.', 'success')
    navigate(`/templates/${copy.id}`)
  }

  const handleDeleteTemplate = async (id: string, name: string) => {
    if ((templates?.length ?? 0) <= 1) {
      toast('Нельзя удалить последний шаблон.', 'error')
      return
    }
    if (
      !window.confirm(
        `Удалить шаблон «${name}»? Уже созданные персонажи сохранят свою структуру.`,
      )
    ) {
      return
    }
    await deleteTemplate(id)
    toast('Шаблон удалён.', 'success')
  }

  const handleNewTemplate = async (fromBase: boolean) => {
    const template = fromBase ? await createTemplateFromBase() : await createEmptyTemplate()
    toast('Шаблон создан.', 'success')
    navigate(`/templates/${template.id}`)
  }

  const handleImport = async (file: File) => {
    try {
      const parsed = await parseImportFile(file)
      const result = await importParsedData(parsed)

      if (parsed.kind === 'character' && result.characters[0]) {
        toast('Персонаж импортирован.', 'success')
        navigate(`/character/${result.characters[0].id}`)
        return
      }

      if (parsed.kind === 'template' && result.templates[0]) {
        toast('Шаблон импортирован.', 'success')
        navigate(`/templates/${result.templates[0].id}`)
        return
      }

      toast(
        `Импорт завершён: ${result.characters.length} персонажей, ${result.templates.length} шаблонов.`,
        'success',
      )
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Не удалось импортировать файл.', 'error')
    }
  }

  const handleBackup = async () => {
    try {
      await exportBackupFile()
      toast('Резервная копия скачана.', 'success')
    } catch {
      toast('Не удалось создать резервную копию.', 'error')
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="brand__mark">F</span>
          <span className="brand__text">
            <span className="brand__title">Fate Core</span>
            <span className="brand__subtitle">Анкеты персонажей</span>
          </span>
        </Link>

        <div className="app-header__actions">
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleImport(file)
              event.target.value = ''
            }}
          />
          <Button
            variant="ghost"
            icon={<Upload size={16} />}
            onClick={() => fileInputRef.current?.click()}
          >
            Импорт
          </Button>
          <Button variant="ghost" icon={<Download size={16} />} onClick={() => void handleBackup()}>
            Резервная копия
          </Button>
          <Button
            variant="primary"
            icon={<UserPlus size={16} />}
            onClick={() => openCreate()}
            disabled={!templates?.length}
          >
            Новый персонаж
          </Button>
        </div>
      </header>

      <main className="page">
        <section className="hero">
          <div className="hero__copy">
            <span className="eyebrow">Fate Core</span>
            <h1>Анкеты, которые подстраиваются под вашу игру</h1>
            <p>
              Создавайте персонажей, меняйте структуру листа, добавляйте ману,
              дополнительные последствия и любые другие поля. Всё хранится локально
              в браузере и экспортируется в JSON или PDF.
            </p>
            <div className="hero__actions">
              <Button
                variant="primary"
                icon={<Plus size={17} />}
                onClick={() => openCreate()}
                disabled={!templates?.length}
              >
                Создать персонажа
              </Button>
              <Button
                variant="secondary"
                icon={<LayoutTemplate size={17} />}
                onClick={() => void handleNewTemplate(true)}
              >
                Шаблон из Fate Core
              </Button>
            </div>
          </div>
          <div className="hero__stats">
            <div>
              <strong>{characters?.length ?? 0}</strong>
              <span>персонажей</span>
            </div>
            <div>
              <strong>{templates?.length ?? 0}</strong>
              <span>шаблонов</span>
            </div>
            <div className="hero__stat-note">
              <BookOpen size={18} />
              <span>Данные не покидают устройство</span>
            </div>
          </div>
        </section>

        <section className="content-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Библиотека</span>
              <h2>Персонажи</h2>
            </div>
            <label className="search-field">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по имени или шаблону"
                aria-label="Поиск персонажей"
              />
            </label>
          </div>

          {characters === undefined ? (
            <div className="skeleton-grid">
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          ) : filteredCharacters.length === 0 ? (
            <div className="empty-state empty-state--inline">
              <UserPlus size={34} />
              <h3>{characters.length === 0 ? 'Пока нет персонажей' : 'Ничего не найдено'}</h3>
              <p>
                {characters.length === 0
                  ? 'Создайте первого персонажа из шаблона Fate Core или импортируйте JSON.'
                  : 'Попробуйте изменить поисковый запрос.'}
              </p>
              {characters.length === 0 ? (
                <Button
                  variant="primary"
                  icon={<Plus size={16} />}
                  onClick={() => openCreate()}
                  disabled={!templates?.length}
                >
                  Создать персонажа
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="card-grid">
              {filteredCharacters.map((character) => {
                const name = getCharacterDisplayName(character)
                return (
                  <article key={character.id} className="character-card">
                    <div className="character-card__body">
                      <Link className="character-card__title" to={`/character/${character.id}`}>
                        {name}
                      </Link>
                      <p className="character-card__meta">
                        {character.templateSnapshot.name}
                      </p>
                      <p className="character-card__date">
                        Изменён {formatDate(character.updatedAt)}
                      </p>
                    </div>
                    <div className="character-card__actions">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Pencil size={15} />}
                        onClick={() => navigate(`/character/${character.id}`)}
                      >
                        Открыть
                      </Button>
                      <IconButton
                        label="Экспортировать JSON"
                        onClick={() => exportCharacterFile(character)}
                      >
                        <FileJson size={16} />
                      </IconButton>
                      <IconButton
                        label="Дублировать персонажа"
                        onClick={() => void handleDuplicateCharacter(character.id)}
                      >
                        <Copy size={16} />
                      </IconButton>
                      <IconButton
                        label="Удалить персонажа"
                        variant="danger"
                        onClick={() => void handleDeleteCharacter(character.id, name)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="content-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Конструктор</span>
              <h2>Шаблоны анкет</h2>
            </div>
            <div className="section-heading__actions">
              <Button
                size="sm"
                variant="secondary"
                icon={<Copy size={15} />}
                onClick={() => void handleNewTemplate(true)}
              >
                Из базового
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={<Plus size={15} />}
                onClick={() => void handleNewTemplate(false)}
              >
                Пустой
              </Button>
            </div>
          </div>

          {templates === undefined ? (
            <div className="skeleton-grid">
              <div className="skeleton-card" />
            </div>
          ) : (
            <div className="card-grid card-grid--templates">
              {templates.map((template) => (
                <article key={template.id} className="template-card">
                  <div className="template-card__icon">
                    <LayoutTemplate size={22} />
                  </div>
                  <div className="template-card__body">
                    <Link className="template-card__title" to={`/templates/${template.id}`}>
                      {template.name}
                    </Link>
                    <p className="template-card__meta">
                      {countSections(template)} секций · {countFields(template)} полей
                    </p>
                    {template.description ? (
                      <p className="template-card__description">{template.description}</p>
                    ) : null}
                  </div>
                  <div className="template-card__actions">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<UserPlus size={15} />}
                      onClick={() => openCreate(template.id)}
                    >
                      Создать
                    </Button>
                    <IconButton
                      label="Редактировать шаблон"
                      onClick={() => navigate(`/templates/${template.id}`)}
                    >
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton
                      label="Дублировать шаблон"
                      onClick={() => void handleDuplicateTemplate(template.id)}
                    >
                      <Copy size={16} />
                    </IconButton>
                    <IconButton
                      label="Экспортировать шаблон"
                      onClick={() => exportTemplateFile(template)}
                    >
                      <FileJson size={16} />
                    </IconButton>
                    <IconButton
                      label="Удалить шаблон"
                      variant="danger"
                      onClick={() => void handleDeleteTemplate(template.id, template.name)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <span>Fate Core — Анкеты · локальное хранение</span>
        <span>JSON для обмена · печать в PDF</span>
      </footer>

      <CreateCharacterDialog
        open={createOpen}
        templates={templates ?? []}
        initialTemplateId={createTemplateId}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateCharacter}
      />
    </div>
  )
}
