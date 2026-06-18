import { contextBridge, ipcRenderer } from 'electron'

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

const api = {
  getConfig: (): Promise<TopazConfig> => ipcRenderer.invoke('get-config'),
  saveConfig: (cfg: TopazConfig): Promise<boolean> => ipcRenderer.invoke('save-config', cfg),
  pickGemFolder: (): Promise<string | null> => ipcRenderer.invoke('pick-gem-folder'),
  createGem: (name: string): Promise<string | null> => ipcRenderer.invoke('create-gem', name),
  openGem: (path: string): Promise<GemEntry[]> => ipcRenderer.invoke('open-gem', path),
  readNote: (path: string): Promise<string | null> => ipcRenderer.invoke('read-note', path),
  writeNote: (path: string, content: string): Promise<boolean> => ipcRenderer.invoke('write-note', path, content),
  deleteNote: (path: string): Promise<boolean> => ipcRenderer.invoke('delete-note', path),
  renameNote: (oldPath: string, newPath: string): Promise<boolean> => ipcRenderer.invoke('rename-note', oldPath, newPath),
  createFolder: (path: string): Promise<boolean> => ipcRenderer.invoke('create-folder', path),
  deleteFolder: (path: string): Promise<boolean> => ipcRenderer.invoke('delete-folder', path),
  renameFolder: (oldPath: string, newPath: string): Promise<boolean> => ipcRenderer.invoke('rename-folder', oldPath, newPath),
  getGemPath: (): Promise<string | null> => ipcRenderer.invoke('get-gem-path'),
  getLanIps: (): Promise<string[]> => ipcRenderer.invoke('get-lan-ips'),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('open-external', url),
  readGemWorkspace: (path: string): Promise<unknown> => ipcRenderer.invoke('read-gem-workspace', path),
  writeGemWorkspace: (path: string, data: unknown): Promise<boolean> => ipcRenderer.invoke('write-gem-workspace', path, data),
  readSyncMeta: (gemPath: string): Promise<Record<string, number>> => ipcRenderer.invoke('read-sync-meta', gemPath),
  writeSyncMeta: (gemPath: string, meta: Record<string, number>): Promise<boolean> => ipcRenderer.invoke('write-sync-meta', gemPath, meta),
  getNoteMtime: (gemPath: string, relPath: string): Promise<number> => ipcRenderer.invoke('get-note-mtime', gemPath, relPath),
  getDeletedPaths: (): Promise<string[]> => ipcRenderer.invoke('get-deleted-paths'),
  markDeletedPaths: (paths: string[]): Promise<boolean> => ipcRenderer.invoke('mark-deleted-paths', paths),
  clearDeletedPaths: (paths: string[]): Promise<boolean> => ipcRenderer.invoke('clear-deleted-paths', paths),
  unmarkDeletedPath: (path: string): Promise<boolean> => ipcRenderer.invoke('unmark-deleted-path', path),
  onGemChange: (cb: (data: { event: string; filePath: string }) => void) => {
    const handler = (_: unknown, data: { event: string; filePath: string }) => cb(data)
    ipcRenderer.on('gem-change', handler)
    return () => ipcRenderer.removeListener('gem-change', handler)
  },
  getHubMode: (): Promise<boolean> => ipcRenderer.invoke('get-hub-mode'),
  setHubMode: (enabled: boolean): Promise<{ enabled: boolean; port: number }> =>
    ipcRenderer.invoke('set-hub-mode', enabled),
}

contextBridge.exposeInMainWorld('topaz', api)

export type TopazAPI = typeof api
