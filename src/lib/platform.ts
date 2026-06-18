export interface GemEntry {
  path: string
  name: string
  isDir: boolean
}

export interface TopazConfig {
  gems: { id: string; name: string; path: string }[]
  lastGemId?: string
  syncServer?: string
  computerIp?: string
  pairCode?: string
  authToken?: string
  userEmail?: string
  hubMode?: boolean
  syncRole?: 'server' | 'client'
}

export interface TopazAPI {
  getConfig: () => Promise<TopazConfig>
  saveConfig: (cfg: TopazConfig) => Promise<boolean>
  pickGemFolder: () => Promise<string | null>
  createGem: (name: string) => Promise<string | null>
  createAndOpenGem?: (name: string) => Promise<{ gemPath: string; name: string; entries: GemEntry[] }>
  openGem: (path: string) => Promise<GemEntry[]>
  readNote: (path: string) => Promise<string | null>
  writeNote: (path: string, content: string) => Promise<boolean>
  deleteNote: (path: string) => Promise<boolean>
  renameNote: (oldPath: string, newPath: string) => Promise<boolean>
  createFolder: (path: string) => Promise<boolean>
  deleteFolder: (path: string) => Promise<boolean>
  renameFolder: (oldPath: string, newPath: string) => Promise<boolean>
  getGemPath: () => Promise<string | null>
  getLanIps?: () => Promise<string[]>
  openExternal: (url: string) => Promise<void>
  readGemWorkspace: (path: string) => Promise<unknown>
  writeGemWorkspace: (path: string, data: unknown) => Promise<boolean>
  readSyncMeta: (gemPath: string) => Promise<Record<string, number>>
  writeSyncMeta: (gemPath: string, meta: Record<string, number>) => Promise<boolean>
  getNoteMtime: (gemPath: string, relPath: string) => Promise<number>
  getDeletedPaths: () => Promise<string[]>
  markDeletedPaths: (paths: string[]) => Promise<boolean>
  clearDeletedPaths: (paths: string[]) => Promise<boolean>
  unmarkDeletedPath: (path: string) => Promise<boolean>
  onGemChange: (cb: (data: { event: string; filePath: string }) => void) => () => void
  getHubMode?: () => Promise<boolean>
  setHubMode?: (enabled: boolean) => Promise<{ enabled: boolean; port: number }>
}

function requireAPI(): TopazAPI {
  if (!window.topaz) throw new Error('Topaz platform not initialized')
  return window.topaz
}

export const platform = {
  getConfig: () => requireAPI().getConfig(),
  saveConfig: (cfg: TopazConfig) => requireAPI().saveConfig(cfg),
  pickGemFolder: () => requireAPI().pickGemFolder(),
  createGem: (name: string) => requireAPI().createGem(name),
  openGem: (path: string) => requireAPI().openGem(path),
  readNote: (path: string) => requireAPI().readNote(path),
  writeNote: (path: string, content: string) => requireAPI().writeNote(path, content),
  deleteNote: (path: string) => requireAPI().deleteNote(path),
  renameNote: (old: string, next: string) => requireAPI().renameNote(old, next),
  createFolder: (path: string) => requireAPI().createFolder(path),
  deleteFolder: (path: string) => requireAPI().deleteFolder(path),
  renameFolder: (old: string, next: string) => requireAPI().renameFolder(old, next),
  getGemPath: () => requireAPI().getGemPath(),
  getLanIps: () => requireAPI().getLanIps?.() ?? Promise.resolve([]),
  openExternal: (url: string) => requireAPI().openExternal(url),
  readGemWorkspace: (path: string) => requireAPI().readGemWorkspace(path),
  writeGemWorkspace: (path: string, data: unknown) => requireAPI().writeGemWorkspace(path, data),
  readSyncMeta: (gemPath: string) => requireAPI().readSyncMeta(gemPath),
  writeSyncMeta: (gemPath: string, meta: Record<string, number>) => requireAPI().writeSyncMeta(gemPath, meta),
  getNoteMtime: (gemPath: string, relPath: string) => requireAPI().getNoteMtime(gemPath, relPath),
  getDeletedPaths: () => requireAPI().getDeletedPaths(),
  markDeletedPaths: (paths: string[]) => requireAPI().markDeletedPaths(paths),
  clearDeletedPaths: (paths: string[]) => requireAPI().clearDeletedPaths(paths),
  unmarkDeletedPath: (path: string) => requireAPI().unmarkDeletedPath(path),
  onGemChange: (cb: (data: { event: string; filePath: string }) => void) => requireAPI().onGemChange(cb),
}
