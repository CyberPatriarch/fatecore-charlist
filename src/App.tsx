import { useEffect, useState } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'
import { ensureSeedTemplate } from './storage/db'
import { ToastProvider } from './ui/Toast'
import { LibraryPage } from './pages/LibraryPage'
import { CharacterPage } from './pages/CharacterPage'
import { TemplateEditorPage } from './pages/TemplateEditorPage'
import { PrintPage } from './pages/PrintPage'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

function NotFoundPage() {
  return (
    <main className="page page--centered">
      <div className="empty-state">
        <Home size={40} />
        <h1>Страница не найдена</h1>
        <p>Возможно, ссылка устарела или персонаж был удалён.</p>
        <Link className="button button--primary button--md" to="/">
          <span className="button__icon">
            <ArrowLeft size={16} />
          </span>
          <span>В библиотеку</span>
        </Link>
      </div>
    </main>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ensureSeedTemplate()
      .then(() => setReady(true))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Не удалось открыть хранилище.')
      })
  }, [])

  if (error) {
    return (
      <main className="page page--centered">
        <div className="empty-state">
          <h1>Не удалось запустить приложение</h1>
          <p>{error}</p>
          <p className="muted">
            Проверьте, что браузер разрешает IndexedDB и не находится в приватном
            режиме с запретом хранения.
          </p>
        </div>
      </main>
    )
  }

  if (!ready) {
    return (
      <main className="page page--centered">
        <div className="loading-screen">
          <div className="loading-screen__mark">F</div>
          <p>Загружаем анкеты…</p>
        </div>
      </main>
    )
  }

  return (
    <ToastProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/character/:id" element={<CharacterPage />} />
        <Route path="/character/:id/print" element={<PrintPage />} />
        <Route path="/templates/:id" element={<TemplateEditorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ToastProvider>
  )
}
