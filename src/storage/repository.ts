import type { Character, Template } from '../domain/types'
import {
  cloneCharacter,
  cloneTemplate,
  createBlankTemplate,
  createCharacterFromTemplate,
} from '../domain/defaults'
import { getCharacterDisplayName } from '../domain/values'
import { db } from './db'

export async function listCharacters(): Promise<Character[]> {
  return db.characters.orderBy('updatedAt').reverse().toArray()
}

export async function listTemplates(): Promise<Template[]> {
  return db.templates.orderBy('name').toArray()
}

export async function getCharacter(id: string): Promise<Character | undefined> {
  return db.characters.get(id)
}

export async function getTemplate(id: string): Promise<Template | undefined> {
  return db.templates.get(id)
}

export async function saveCharacter(character: Character): Promise<void> {
  await db.characters.put(character)
}

export async function saveTemplate(template: Template): Promise<void> {
  await db.templates.put(template)
}

export async function deleteCharacter(id: string): Promise<void> {
  await db.characters.delete(id)
}

export async function deleteTemplate(id: string): Promise<void> {
  await db.templates.delete(id)
}

export async function createCharacter(
  template: Template,
  name?: string,
): Promise<Character> {
  const character = createCharacterFromTemplate(template, name)
  await db.characters.add(character)
  return character
}

export async function duplicateCharacter(character: Character): Promise<Character> {
  const copy = cloneCharacter(character, `${getCharacterDisplayName(character)} (копия)`)
  await db.characters.add(copy)
  return copy
}

export async function duplicateTemplate(template: Template): Promise<Template> {
  const copy = cloneTemplate(template)
  await db.templates.add(copy)
  return copy
}

export async function createTemplateFromBase(): Promise<Template> {
  const base =
    (await db.templates.get('tpl_fate_core')) ??
    (await db.templates.toCollection().first())

  const template = base
    ? cloneTemplate(base, 'Мой вариант')
    : createBlankTemplate('Мой вариант')

  await db.templates.add(template)
  return template
}

export async function createEmptyTemplate(): Promise<Template> {
  const template = createBlankTemplate()
  await db.templates.add(template)
  return template
}
