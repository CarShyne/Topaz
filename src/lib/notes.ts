import { useGemStore } from '../stores/gemStore'
import { bumpSyncMtime } from './sync-meta'
import { requestSyncDebounced } from './sync-trigger'

export function sanitizeName(name: string): string {
  return name.trim().replace(/[/\\?%*:|"<>]/g, '-')
}

export function noteFileName(name: string): string {
  const base = sanitizeName(name).replace(/\.md$/i, '')
  if (!base) throw new Error('Note name cannot be empty')
  return `${base}.md`
}

export function projectFolderName(name: string): string {
  const base = sanitizeName(name)
  if (!base) throw new Error('Project name cannot be empty')
  return base
}

export function listFolders(): string[] {
  const { entries } = useGemStore.getState()
  return entries.filter(e => e.isDir).map(e => e.path).sort()
}

export async function refreshGem() {
  const { gemPath } = useGemStore.getState()
  if (!gemPath) return
  const entries = await window.topaz.openGem(gemPath)
  useGemStore.getState().setEntries(entries)
}

export async function createProjectFolder(name: string): Promise<string> {
  const folder = projectFolderName(name)
  const { entries } = useGemStore.getState()
  if (entries.some(e => e.isDir && e.path === folder)) {
    throw new Error('A project with that name already exists')
  }
  await window.topaz.createFolder(folder)
  await refreshGem()
  useGemStore.getState().setSelectedFolder(folder)
  return folder
}

export async function createNamedNote(title: string, folder?: string | null): Promise<string> {
  const fileName = noteFileName(title)
  const relPath = folder ? `${folder}/${fileName}` : fileName
  const { entries } = useGemStore.getState()

  if (entries.some(e => !e.isDir && e.path === relPath)) {
    throw new Error('A note with that name already exists in this folder')
  }

  const heading = sanitizeName(title).replace(/\.md$/i, '')
  await window.topaz.writeNote(relPath, `# ${heading}\n\n`)
  const { gemPath } = useGemStore.getState()
  if (gemPath) await bumpSyncMtime(gemPath, relPath)
  await window.topaz.unmarkDeletedPath(relPath)
  await refreshGem()
  useGemStore.getState().openTab(relPath, heading)
  requestSyncDebounced()
  return relPath
}

export async function deleteNote(path: string) {
  await window.topaz.deleteNote(path)
  await window.topaz.markDeletedPaths([path])
  useGemStore.getState().removePathsFromState([path])
  await refreshGem()
}

export async function deleteFolder(path: string) {
  const { entries } = useGemStore.getState()
  const paths = entries
    .filter(e => !e.isDir && (e.path === path || e.path.startsWith(path + '/')))
    .map(e => e.path)
  await window.topaz.deleteFolder(path)
  if (paths.length) await window.topaz.markDeletedPaths(paths)
  useGemStore.getState().removePathsFromState(paths)
  await refreshGem()
}

export async function renameNote(path: string, newTitle: string) {
  const fileName = noteFileName(newTitle)
  const dir = path.includes('/') ? path.split('/').slice(0, -1).join('/') : ''
  const newPath = dir ? `${dir}/${fileName}` : fileName
  const { entries } = useGemStore.getState()

  if (newPath === path) return newPath
  if (entries.some(e => !e.isDir && e.path === newPath)) {
    throw new Error('A note with that name already exists here')
  }

  await window.topaz.renameNote(path, newPath)
  useGemStore.getState().remapPathsInState(p => (p === path ? newPath : p))
  await refreshGem()
  return newPath
}

export async function renameFolder(path: string, newName: string) {
  const folder = projectFolderName(newName)
  const parent = path.includes('/') ? path.split('/').slice(0, -1).join('/') : ''
  const newPath = parent ? `${parent}/${folder}` : folder
  const { entries } = useGemStore.getState()

  if (newPath === path) return newPath
  if (entries.some(e => e.isDir && e.path === newPath)) {
    throw new Error('A project with that name already exists')
  }

  await window.topaz.renameFolder(path, newPath)
  useGemStore.getState().remapPathsInState(p => {
    if (p === path) return newPath
    if (p.startsWith(path + '/')) return newPath + p.slice(path.length)
    return p
  })
  await refreshGem()
  return newPath
}
