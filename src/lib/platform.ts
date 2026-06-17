export interface VaultEntry {
  path: string
  name: string
  isDir: boolean
}

export interface TopazConfig {
  vaults: { id: string; name: string; path: string }[]
  lastVaultId?: string
  syncServer?: string
  computerIp?: string
  pairCode?: string
  authToken?: string
  userEmail?: string
  hubMode?: boolean
}

export interface TopazAPI {
  getConfig: () => Promise<TopazConfig>
  saveConfig: (cfg: TopazConfig) => Promise<boolean>
  pickVaultFolder: () => Promise<string | null>
  createVault: (name: string) => Promise<string | null>
  openVault: (path: string) => Promise<VaultEntry[]>
  readNote: (path: string) => Promise<string | null>
  writeNote: (path: string, content: string) => Promise<boolean>
  deleteNote: (path: string) => Promise<boolean>
  renameNote: (oldPath: string, newPath: string) => Promise<boolean>
  createFolder: (path: string) => Promise<boolean>
  deleteFolder: (path: string) => Promise<boolean>
  renameFolder: (oldPath: string, newPath: string) => Promise<boolean>
  getVaultPath: () => Promise<string | null>
  getLanIps?: () => Promise<string[]>
  openExternal: (url: string) => Promise<void>
  readVaultWorkspace: (path: string) => Promise<unknown>
  writeVaultWorkspace: (path: string, data: unknown) => Promise<boolean>
  readSyncMeta: (vaultPath: string) => Promise<Record<string, number>>
  writeSyncMeta: (vaultPath: string, meta: Record<string, number>) => Promise<boolean>
  getNoteMtime: (vaultPath: string, relPath: string) => Promise<number>
  getDeletedPaths: () => Promise<string[]>
  markDeletedPaths: (paths: string[]) => Promise<boolean>
  clearDeletedPaths: (paths: string[]) => Promise<boolean>
  unmarkDeletedPath: (path: string) => Promise<boolean>
  onVaultChange: (cb: (data: { event: string; filePath: string }) => void) => () => void
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
  pickVaultFolder: () => requireAPI().pickVaultFolder(),
  createVault: (name: string) => requireAPI().createVault(name),
  openVault: (path: string) => requireAPI().openVault(path),
  readNote: (path: string) => requireAPI().readNote(path),
  writeNote: (path: string, content: string) => requireAPI().writeNote(path, content),
  deleteNote: (path: string) => requireAPI().deleteNote(path),
  renameNote: (old: string, next: string) => requireAPI().renameNote(old, next),
  createFolder: (path: string) => requireAPI().createFolder(path),
  deleteFolder: (path: string) => requireAPI().deleteFolder(path),
  renameFolder: (old: string, next: string) => requireAPI().renameFolder(old, next),
  getVaultPath: () => requireAPI().getVaultPath(),
  getLanIps: () => requireAPI().getLanIps?.() ?? Promise.resolve([]),
  openExternal: (url: string) => requireAPI().openExternal(url),
  readVaultWorkspace: (path: string) => requireAPI().readVaultWorkspace(path),
  writeVaultWorkspace: (path: string, data: unknown) => requireAPI().writeVaultWorkspace(path, data),
  readSyncMeta: (vaultPath: string) => requireAPI().readSyncMeta(vaultPath),
  writeSyncMeta: (vaultPath: string, meta: Record<string, number>) => requireAPI().writeSyncMeta(vaultPath, meta),
  getNoteMtime: (vaultPath: string, relPath: string) => requireAPI().getNoteMtime(vaultPath, relPath),
  getDeletedPaths: () => requireAPI().getDeletedPaths(),
  markDeletedPaths: (paths: string[]) => requireAPI().markDeletedPaths(paths),
  clearDeletedPaths: (paths: string[]) => requireAPI().clearDeletedPaths(paths),
  unmarkDeletedPath: (path: string) => requireAPI().unmarkDeletedPath(path),
  onVaultChange: (cb: (data: { event: string; filePath: string }) => void) => requireAPI().onVaultChange(cb),
}
