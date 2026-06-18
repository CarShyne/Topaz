import type { TopazAPI, TopazConfig, GemEntry } from './platform'

const CONFIG_KEY = 'topaz_config'
const WORKSPACE_PATH = '.topaz/workspace.json'

let currentGemPath: string | null = null

async function gemPost<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`/api/gem/${action}`, {
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


function migrateConfig(raw: Record<string, unknown>): TopazConfig {
  const legacy = raw as {
    gems?: TopazConfig['gems']
    vaults?: TopazConfig['gems']
    lastGemId?: string
    lastVaultId?: string
  }
  const cfg = { ...raw, gems: legacy.gems ?? legacy.vaults ?? [] } as TopazConfig
  if (!cfg.lastGemId && legacy.lastVaultId) cfg.lastGemId = legacy.lastVaultId
  return cfg
}

function readLocalConfig(): TopazConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return { gems: [] }
    return migrateConfig(JSON.parse(raw) as Record<string, unknown>)
  } catch {
    return { gems: [] }
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
    const { config: rawConfig } = await gemPost<{ config: TopazConfig }>('getConfig')
    const config = migrateConfig(rawConfig as unknown as Record<string, unknown>)
    writeLocalConfig(config)
    return config
  } catch {
    return readLocalConfig()
  }
}

async function writeConfig(cfg: TopazConfig) {
  writeLocalConfig(cfg)
  await gemPost('saveConfig', { config: cfg })
}

export function createWebAPI(): TopazAPI {
  return {
    getConfig: readConfig,
    saveConfig: async (cfg) => { await writeConfig(cfg); return true },

    pickGemFolder: async () => null,

    createGem: async (name) => {
      const { gemPath } = await gemPost<{ gemPath: string }>('createGem', { name })
      return gemPath
    },

    createAndOpenGem: async (name) => {
      const result = await gemPost<{ gemPath: string; name: string; entries: GemEntry[] }>('createAndOpen', { name })
      currentGemPath = result.gemPath
      return result
    },

    openGem: async (path) => {
      currentGemPath = path
      const { entries } = await gemPost<{ entries: GemEntry[] }>('openGem', { gemPath: path })
      return entries
    },

    readNote: async (relPath) => {
      if (!currentGemPath) return null
      const { content } = await gemPost<{ content: string | null }>('readNote', {
        gemPath: currentGemPath,
        path: relPath,
      })
      return content
    },

    writeNote: async (relPath, content) => {
      if (!currentGemPath) return false
      const { ok } = await gemPost<{ ok: boolean }>('writeNote', {
        gemPath: currentGemPath,
        path: relPath,
        content,
      })
      return ok
    },

    deleteNote: async (relPath) => {
      if (!currentGemPath) return false
      const { ok } = await gemPost<{ ok: boolean }>('deleteNote', {
        gemPath: currentGemPath,
        path: relPath,
      })
      return ok
    },

    renameNote: async (oldPath, newPath) => {
      if (!currentGemPath) return false
      const { ok } = await gemPost<{ ok: boolean }>('renameNote', {
        gemPath: currentGemPath,
        oldPath,
        newPath,
      })
      return ok
    },

    createFolder: async (relPath) => {
      if (!currentGemPath) return false
      const { ok } = await gemPost<{ ok: boolean }>('createFolder', {
        gemPath: currentGemPath,
        path: relPath,
      })
      return ok
    },

    deleteFolder: async (relPath) => {
      if (!currentGemPath) return false
      const { ok } = await gemPost<{ ok: boolean }>('deleteFolder', {
        gemPath: currentGemPath,
        path: relPath,
      })
      return ok
    },

    renameFolder: async (oldPath, newPath) => {
      if (!currentGemPath) return false
      const { ok } = await gemPost<{ ok: boolean }>('renameFolder', {
        gemPath: currentGemPath,
        oldPath,
        newPath,
      })
      return ok
    },

    getGemPath: async () => currentGemPath,

    getLanIps: async () => [],

    openExternal: async (url) => { window.open(url, '_blank') },

    readGemWorkspace: async (gemPath) => {
      try {
        const { content } = await gemPost<{ content: string | null }>('readNote', {
          gemPath,
          path: WORKSPACE_PATH,
        })
        if (!content) return null
        return JSON.parse(content)
      } catch {
        return null
      }
    },

    writeGemWorkspace: async (gemPath, data) => {
      const { ok } = await gemPost<{ ok: boolean }>('writeNote', {
        gemPath,
        path: WORKSPACE_PATH,
        content: JSON.stringify(data, null, 2),
      })
      return ok
    },

    readSyncMeta: async (gemPath) => {
      const { meta } = await gemPost<{ meta: Record<string, number> }>('readSyncMeta', { gemPath })
      return meta
    },

    writeSyncMeta: async (gemPath, meta) => {
      const { ok } = await gemPost<{ ok: boolean }>('writeSyncMeta', { gemPath, meta })
      return ok
    },

    getNoteMtime: async (gemPath, relPath) => {
      const { mtime } = await gemPost<{ mtime: number }>('getNoteMtime', { gemPath, path: relPath })
      return mtime
    },

    getDeletedPaths: async () => {
      if (!currentGemPath) return []
      const { paths } = await gemPost<{ paths: string[] }>('getDeletedPaths', { gemPath: currentGemPath })
      return paths
    },

    markDeletedPaths: async (paths) => {
      if (!currentGemPath) return false
      const { ok } = await gemPost<{ ok: boolean }>('markDeletedPaths', { gemPath: currentGemPath, paths })
      return ok
    },

    clearDeletedPaths: async (paths) => {
      if (!currentGemPath) return false
      const { ok } = await gemPost<{ ok: boolean }>('clearDeletedPaths', { gemPath: currentGemPath, paths })
      return ok
    },

    unmarkDeletedPath: async (path) => {
      if (!currentGemPath) return false
      const { ok } = await gemPost<{ ok: boolean }>('unmarkDeletedPath', { gemPath: currentGemPath, path })
      return ok
    },

    onGemChange: () => () => {},
  }
}
