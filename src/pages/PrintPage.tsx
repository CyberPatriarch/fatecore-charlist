import { ArrowLeft, Loader2, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Character } from '../domain/types'
import { getCharacterDisplayName } from '../domain/values'
import { getCharacter } from '../storage/repository'
import { Button } from '../ui/Button'
import { PrintableSheet } from '../components/PrintableSheet'

export function PrintPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [character, setCharacter] = useState<Character | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [hideEmpty, setHideEmpty] = useState(true)
  const [grayscale, setGrayscale] = useState(false)
  const [density, setDensity] = useState<'compact' | 'normal' | 'large'>('normal')

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setStatus('missing')
      return
    }

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
    document.title = `Печать: ${getCharacterDisplayName(character)} — Fate Core`
    return () => {
      document.title = 'Fate Core — Анкеты'
    }
  }, [character])

  const handlePrint = async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready
    }
    window.print()
  }

  if (status === 'loading') {
    return (
      <main className="page page--centered">
        <div className="loading-screen">
          <Loader2 size={28} className="spin" />
          <p>Готовим печатную версию…</p>
        </div>
      </main>
    )
  }

  if (status === 'missing' || !character) {
    return (
      <main className="page page--centered">
        <div className="empty-state">
          <h1>Персонаж не найден</h1>
          <Button variant="primary" icon={<ArrowLeft size={16} />} onClick={() => navigate('/')}>
            В библиотеку
          </Button>
        </div>
      </main>
    )
  }

  return (
    <div className="print-page">
      <header className="print-toolbar">
        <Button
          variant="ghost"
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate(`/character/${character.id}`)}
        >
          К анкете
        </Button>

        <div className="print-toolbar__title">
          <span className="eyebrow">Печать / PDF</span>
          <h1>{getCharacterDisplayName(character)}</h1>
        </div>

        <div className="print-toolbar__options">
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
          <Button variant="primary" icon={<Printer size={16} />} onClick={() => void handlePrint()}>
            Печать / PDF
          </Button>
        </div>
      </header>

      <div className="print-hint no-print">
        В диалоге печати выберите «Сохранить как PDF». Формат страницы — A4.
      </div>

      <main className="print-canvas">
        <PrintableSheet
          character={character}
          hideEmpty={hideEmpty}
          grayscale={grayscale}
          density={density}
        />
      </main>
    </div>
  )
}
