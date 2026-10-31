// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../ui/Toast'
import { LibraryPage } from './LibraryPage'
import { CharacterPage } from './CharacterPage'
import { TemplateEditorPage } from './TemplateEditorPage'
import { createCharacterFromTemplate, createFateCoreTemplate } from '../domain/defaults'
import { countFields, countSections } from '../domain/values'
import * as repository from '../storage/repository'

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: vi.fn(),
}))

vi.mock('../storage/repository', () => ({
  listCharacters: vi.fn(),
  listTemplates: vi.fn(),
  getCharacter: vi.fn(),
  getTemplate: vi.fn(),
  saveCharacter: vi.fn(),
  saveTemplate: vi.fn(),
  deleteCharacter: vi.fn(),
  deleteTemplate: vi.fn(),
  createCharacter: vi.fn(),
  duplicateCharacter: vi.fn(),
  duplicateTemplate: vi.fn(),
  createTemplateFromBase: vi.fn(),
  createEmptyTemplate: vi.fn(),
}))

vi.mock('../storage/transfer', () => ({
  exportBackupFile: vi.fn(),
  exportCharacterFile: vi.fn(),
  exportTemplateFile: vi.fn(),
  importParsedData: vi.fn(),
  parseImportFile: vi.fn(),
}))

let characters: unknown[] = []
let templates: unknown[] = []

function renderLibrary() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    </ToastProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  characters = []
  templates = []
  vi.mocked(useLiveQuery).mockImplementation(((querier: () => unknown) => {
    const source = querier.toString()
    if (source.includes('listCharacters')) return characters
    if (source.includes('listTemplates')) return templates
    return undefined
  }) as typeof useLiveQuery)
})

describe('LibraryPage', () => {
  it('renders characters and templates from storage', () => {
    const template = createFateCoreTemplate()
    const character = createCharacterFromTemplate(template, 'Ари')
    characters = [character]
    templates = [template]

    renderLibrary()

    expect(screen.getByText('Ари')).toBeTruthy()
    expect(screen.getAllByText('Fate Core — базовый').length).toBeGreaterThan(0)
    expect(
      screen.getByText(
        `${countSections(template)} секций · ${countFields(template)} полей`,
      ),
    ).toBeTruthy()
  })

  it('opens the create character dialog', () => {
    templates = [createFateCoreTemplate()]
    renderLibrary()

    fireEvent.click(screen.getAllByText('Новый персонаж')[0])

    expect(screen.getByRole('dialog').textContent).toContain('Шаблон')
    expect(screen.getByLabelText('Имя персонажа')).toBeTruthy()
  })
})

describe('TemplateEditorPage', () => {
  it('shows the template preview with sample content and print styles', async () => {
    const template = createFateCoreTemplate()
    template.sections[0].style = 'line'
    template.sections[0].accent = 'teal'
    vi.mocked(repository.getTemplate).mockResolvedValue(template)

    const { container } = render(
      <ToastProvider>
        <MemoryRouter initialEntries={[`/templates/${template.id}`]}>
          <Routes>
            <Route path="/templates/:id" element={<TemplateEditorPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    )

    const previewTab = await screen.findByRole('tab', { name: /Предпросмотр/ })
    fireEvent.click(previewTab)

    expect((await screen.findAllByText('Ари из Тени')).length).toBeGreaterThan(0)
    expect(
      container.querySelector('.print-section--line.accent-teal'),
    ).toBeTruthy()
  })
})

describe('CharacterPage', () => {
  it('renders a character sheet with fields and trackers', async () => {
    const character = createCharacterFromTemplate(createFateCoreTemplate(), 'Ари')
    vi.mocked(repository.getCharacter).mockResolvedValue(character)

    render(
      <ToastProvider>
        <MemoryRouter initialEntries={[`/character/${character.id}`]}>
          <Routes>
            <Route path="/character/:id" element={<CharacterPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Ари' }),
    ).toBeTruthy()
    expect(screen.getByLabelText('Раса')).toBeTruthy()
    expect(screen.getByLabelText('Стресс (физический), кружок 1, значение 1')).toBeTruthy()
  })
})
