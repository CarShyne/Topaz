import type { TopazAPI, TopazConfig, VaultEntry } from './platform'

const CONFIG_KEY = 'topaz_config'
const WORKSPACE_PATH = '.topaz/workspace.json'

let currentVaultPath: string | null = null

async function vaultPost<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`/api/vault/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    let message = `Request failed (${res.status})`
    try {
      const data = JSON.parse(text) as { error?: string }
      if (data.error) message = data.error
    } catch {
      if (text) message = text
    }
    throw new Error(message)
  }
  return res.json()
}

function readLocalConfig(): TopazConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return { vaults: [] }
    return JSON.parse(raw) as TopazConfig
  } catch {
    return { vaults: [] }
  }
}

function writeLocalConfig(cfg: TopazConfig) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
  } catch {
    // Browser may block storage — server config is authoritative for Docker.
  }
}

async function readConfig(): Promise<TopazConfig> {
  try {
    const { config } = await vaultPost<{ config: TopazConfig }>('getConfig')
    writeLocalConfig(config)
    return config
  } catch {
    return readLocalConfig()
  }
}

async function writeConfig(cfg: TopazConfig) {
  writeLocalConfig(cfg)
  await vaultPost('saveConfig', { config: cfg })
}

export function createWebAPI(): TopazAPI {
  return {
    getConfig: readConfig,
    saveConfig: async (cfg) => { await writeConfig(cfg); return true },

    pickVaultFolder: async () => null,

    createVault: async (name) => {
      const { vaultPath } = await vaultPost<{ vaultPath: string }>('createVault', { name })
      return vaultPath
    },

    openVault: async (path) => {
      currentVaultPath = path
      const { entries } = await vaultPost<{ entries: VaultEntry[] }>('openVault', { vaultPath: path })
      return entries
    },

    readNote: async (relPath) => {
      if (!currentVaultPath) return null
      const { content } = await vaultPost<{ content: string | null }>('readNote', {
        vaultPath: currentVaultPath,
        path: relPath,
      })
      return content
    },

    writeNote: async (relPath, content) => {
      if (!currentVaultPath) return false
      const { ok } = await vaultPost<{ ok: boolean }>('writeNote', {
        vaultPath: currentVaultPath,
        path: relPath,
        content,
      })
      return ok
    },

    deleteNote: async (relPath) => {
      if (!currentVaultPath) return false
      const { ok } = await vaultPost<{ ok: boolean }>('deleteNote', {
        vaultPath: currentVaultPath,
        path: relPath,
      })
      return ok
    },

    renameNote: async (oldPath, newPath) => {
      if (!currentVaultPath) return false
      const { ok } = await vaultPost<{ ok: boolean }>('renameNote', {
        vaultPath: currentVaultPath,
        oldPath,
        newPath,
      })
      return ok
    },

    createFolder: async (relPath) => {
      if (!currentVaultPath) return false
      const { ok } = await vaultPost<{ ok: boolean }>('createFolder', {
        vaultPath: currentVaultPath,
        path: relPath,
      })
      return ok
    },

    deleteFolder: async (relPath) => {
      if (!currentVaultPath) return false
      const { ok } = await vaultPost<{ ok: boolean }>('deleteFolder', {
        vaultPath: currentVaultPath,
        path: relPath,
      })
      return ok
    },

    renameFolder: async (oldPath, newPath) => {
      if (!currentVaultPath) return false
      const { ok } = await vaultPost<{ ok: boolean }>('renameFolder', {
        vaultPath: currentVaultPath,
        oldPath,
        newPath,
      })
      return ok
    },

    getVaultPath: async () => currentVaultPath,

    getLanIps: async () => [],

    openExternal: async (url) => { window.open(url, '_blank') },

    readVaultWorkspace: async (vaultPath) => {
      try {
        const { content } = await vaultPost<{ content: string | null }>('readNote', {
          vaultPath,
          path: WORKSPACE_PATH,
        })
        if (!content) return null
        return JSON.parse(content)
      } catch {
        return null
      }
    },

    writeVaultWorkspace: async (vaultPath, data) => {
      const { ok } = await vaultPost<{ ok: boolean }>('writeNote', {
        vaultPath,
        path: WORKSPACE_PATH,
        content: JSON.stringify(data, null, 2),
      })
      return ok
    },

    readSyncMeta: async (vaultPath) => {
      const { meta } = await vaultPost<{ meta: Record<string, number> }>('readSyncMeta', { vaultPath })
      return meta
    },

    writeSyncMeta: async (vaultPath, meta) => {
      const { ok } = await vaultPost<{ ok: boolean }>('writeSyncMeta', { vaultPath, meta })
      return ok
    },

    getNoteMtime: async (vaultPath, relPath) => {
      const { mtime } = await vaultPost<{ mtime: number }>('getNoteMtime', { vaultPath, path: relPath })
      return mtime
    },

    getDeletedPaths: async () => {
      if (!currentVaultPath) return []
      const { paths } = await vaultPost<{ paths: string[] }>('getDeletedPaths', { vaultPath: currentVaultPath })
      return paths
    },

    markDeletedPaths: async (paths) => {
      if (!currentVaultPath) return false
      const { ok } = await vaultPost<{ ok: boolean }>('markDeletedPaths', { vaultPath: currentVaultPath, paths })
      return ok
    },

    clearDeletedPaths: async (paths) => {
      if (!currentVaultPath) return false
      const { ok } = await vaultPost<{ ok: boolean }>('clearDeletedPaths', { vaultPath: currentVaultPath, paths })
      return ok
    },

    unmarkDeletedPath: async (path) => {
      if (!currentVaultPath) return false
      const { ok } = await vaultPost<{ ok: boolean }>('unmarkDeletedPath', { vaultPath: currentVaultPath, path })
      return ok
    },

    onVaultChange: () => () => {},
  }
}
