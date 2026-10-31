import { useEffect, useRef, useState } from 'react'

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

export function useAutoSave<T>(
  value: T | null,
  save: (value: T) => Promise<void>,
  delay = 550,
): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const latest = useRef<T | null>(value)
  const saveRef = useRef(save)
  const dirty = useRef(false)
  const timer = useRef<number | null>(null)
  const sequence = useRef(0)
  const first = useRef(true)

  saveRef.current = save

  useEffect(() => {
    latest.current = value
  }, [value])

  useEffect(() => {
    if (value === null) return

    if (first.current) {
      first.current = false
      setStatus('saved')
      return
    }

    dirty.current = true
    setStatus('dirty')
    const currentSequence = ++sequence.current

    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      const nextValue = latest.current
      if (nextValue === null) return

      dirty.current = false
      setStatus('saving')
      try {
        await saveRef.current(nextValue)
        if (sequence.current === currentSequence) setStatus('saved')
      } catch {
        dirty.current = true
        if (sequence.current === currentSequence) setStatus('error')
      }
    }, delay)

    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [value, delay])

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
      if (dirty.current && latest.current !== null) {
        void saveRef.current(latest.current)
      }
    }
  }, [])

  return status
}

export function saveStatusLabel(status: SaveStatus): string {
  switch (status) {
    case 'dirty':
      return 'Есть изменения'
    case 'saving':
      return 'Сохраняем…'
    case 'error':
      return 'Ошибка сохранения'
    case 'saved':
      return 'Сохранено'
    default:
      return ''
  }
}
