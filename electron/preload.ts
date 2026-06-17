import { contextBridge, ipcRenderer } from 'electron'

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

const api = {
  getConfig: (): Promise<TopazConfig> => ipcRenderer.invoke('get-config'),
  saveConfig: (cfg: TopazConfig): Promise<boolean> => ipcRenderer.invoke('save-config', cfg),
  pickVaultFolder: (): Promise<string | null> => ipcRenderer.invoke('pick-vault-folder'),
  createVault: (name: string): Promise<string | null> => ipcRenderer.invoke('create-vault', name),
  openVault: (path: string): Promise<VaultEntry[]> => ipcRenderer.invoke('open-vault', path),
  readNote: (path: string): Promise<string | null> => ipcRenderer.invoke('read-note', path),
  writeNote: (path: string, content: string): Promise<boolean> => ipcRenderer.invoke('write-note', path, content),
  deleteNote: (path: string): Promise<boolean> => ipcRenderer.invoke('delete-note', path),
  renameNote: (oldPath: string, newPath: string): Promise<boolean> => ipcRenderer.invoke('rename-note', oldPath, newPath),
  createFolder: (path: string): Promise<boolean> => ipcRenderer.invoke('create-folder', path),
  deleteFolder: (path: string): Promise<boolean> => ipcRenderer.invoke('delete-folder', path),
  renameFolder: (oldPath: string, newPath: string): Promise<boolean> => ipcRenderer.invoke('rename-folder', oldPath, newPath),
  getVaultPath: (): Promise<string | null> => ipcRenderer.invoke('get-vault-path'),
  getLanIps: (): Promise<string[]> => ipcRenderer.invoke('get-lan-ips'),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('open-external', url),
  readVaultWorkspace: (path: string): Promise<unknown> => ipcRenderer.invoke('read-vault-workspace', path),
  writeVaultWorkspace: (path: string, data: unknown): Promise<boolean> => ipcRenderer.invoke('write-vault-workspace', path, data),
  readSyncMeta: (vaultPath: string): Promise<Record<string, number>> => ipcRenderer.invoke('read-sync-meta', vaultPath),
  writeSyncMeta: (vaultPath: string, meta: Record<string, number>): Promise<boolean> => ipcRenderer.invoke('write-sync-meta', vaultPath, meta),
  getNoteMtime: (vaultPath: string, relPath: string): Promise<number> => ipcRenderer.invoke('get-note-mtime', vaultPath, relPath),
  getDeletedPaths: (): Promise<string[]> => ipcRenderer.invoke('get-deleted-paths'),
  markDeletedPaths: (paths: string[]): Promise<boolean> => ipcRenderer.invoke('mark-deleted-paths', paths),
  clearDeletedPaths: (paths: string[]): Promise<boolean> => ipcRenderer.invoke('clear-deleted-paths', paths),
  unmarkDeletedPath: (path: string): Promise<boolean> => ipcRenderer.invoke('unmark-deleted-path', path),
  onVaultChange: (cb: (data: { event: string; filePath: string }) => void) => {
    const handler = (_: unknown, data: { event: string; filePath: string }) => cb(data)
    ipcRenderer.on('vault-change', handler)
    return () => ipcRenderer.removeListener('vault-change', handler)
  },
  getHubMode: (): Promise<boolean> => ipcRenderer.invoke('get-hub-mode'),
  setHubMode: (enabled: boolean): Promise<{ enabled: boolean; port: number }> =>
    ipcRenderer.invoke('set-hub-mode', enabled),
}

contextBridge.exposeInMainWorld('topaz', api)

export type TopazAPI = typeof api
