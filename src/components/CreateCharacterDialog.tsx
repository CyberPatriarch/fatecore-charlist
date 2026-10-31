import { useEffect, useState, type FormEvent } from 'react'
import type { Template } from '../domain/types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

interface CreateCharacterDialogProps {
  open: boolean
  templates: Template[]
  initialTemplateId?: string
  onClose: () => void
  onCreate: (templateId: string, name: string) => Promise<void> | void
}

export function CreateCharacterDialog({
  open,
  templates,
  initialTemplateId,
  onClose,
  onCreate,
}: CreateCharacterDialogProps) {
  const [templateId, setTemplateId] = useState(initialTemplateId ?? '')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const firstTemplateId = templates[0]?.id

  useEffect(() => {
    if (!open) return
    setTemplateId(initialTemplateId ?? firstTemplateId ?? '')
    setName('')
    setSubmitting(false)
  }, [open, initialTemplateId, firstTemplateId])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!templateId) return

    setSubmitting(true)
    try {
      await onCreate(templateId, name.trim() || 'Новый персонаж')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Новый персонаж"
      description="Выберите шаблон анкеты и имя. Структуру можно будет изменить позже."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Отмена
          </Button>
          <Button
            type="submit"
            form="create-character-form"
            variant="primary"
            disabled={submitting || templates.length === 0}
          >
            {submitting ? 'Создаём…' : 'Создать персонажа'}
          </Button>
        </>
      }
    >
      <form id="create-character-form" className="form-stack" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Шаблон</span>
          <select
            className="input input--select"
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
            disabled={templates.length === 0}
          >
            {templates.length === 0 ? (
              <option value="">Нет доступных шаблонов</option>
            ) : null}
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Имя персонажа</span>
          <input
            className="input"
            value={name}
            placeholder="Например, Ари из Тени"
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        {templates.length === 0 ? (
          <p className="form-error">
            Сначала создайте или импортируйте шаблон анкеты.
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
