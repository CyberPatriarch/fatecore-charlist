import { Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Template } from '../domain/types'
import { createPreviewCharacter } from '../domain/preview'
import { Button } from '../ui/Button'
import { PrintableSheet } from './PrintableSheet'

interface TemplatePreviewProps {
  template: Template
}

export function TemplatePreview({ template }: TemplatePreviewProps) {
  const [fillSamples, setFillSamples] = useState(true)
  const [hideEmpty, setHideEmpty] = useState(false)
  const [grayscale, setGrayscale] = useState(false)
  const [density, setDensity] = useState<'compact' | 'normal' | 'large'>('normal')

  const character = useMemo(
    () => createPreviewCharacter(template, fillSamples),
    [template, fillSamples],
  )

  const handlePrint = async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready
    }
    window.print()
  }

  return (
    <div className="template-preview">
      <div className="template-preview__toolbar no-print">
        <div className="template-preview__note">
          <strong>Предпросмотр анкеты</strong>
          <span>
            Так лист будет выглядеть при печати. Структура и оформление берутся
            из текущего шаблона.
          </span>
        </div>

        <div className="template-preview__options">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={fillSamples}
              onChange={(event) => setFillSamples(event.target.checked)}
            />
            Пример заполнения
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={hideEmpty}
              onChange={(event) => setHideEmpty(event.target.checked)}
            />
            Скрывать пустые поля
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={grayscale}
              onChange={(event) => setGrayscale(event.target.checked)}
            />
            Чёрно-белая
          </label>
          <label className="mini-field">
            <span>Плотность</span>
            <select
              className="input input--select"
              value={density}
              onChange={(event) =>
                setDensity(event.target.value as 'compact' | 'normal' | 'large')
              }
            >
              <option value="compact">Компактно</option>
              <option value="normal">Обычно</option>
              <option value="large">Крупно</option>
            </select>
          </label>
          <Button
            variant="primary"
            icon={<Printer size={16} />}
            onClick={() => void handlePrint()}
          >
            Печать шаблона
          </Button>
        </div>
      </div>

      <div className="print-canvas template-preview__canvas">
        <PrintableSheet
          character={character}
          hideEmpty={hideEmpty}
          grayscale={grayscale}
          density={density}
        />
      </div>
    </div>
  )
}
