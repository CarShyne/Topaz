import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'
import { Browser } from '@capacitor/browser'
import type { TopazAPI, TopazConfig, GemEntry } from './platform'

const CONFIG_KEY = 'topaz_config'
const GEMS_ROOT = 'gems'
let currentGemPath: string | null = null

function gemDir(gemId: string) {
  return `${GEMS_ROOT}/${gemId}`
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

async function readConfig(): Promise<TopazConfig> {
  const { value } = await Preferences.get({ key: CONFIG_KEY })
  if (!value) return { gems: [] }
  return migrateConfig(JSON.parse(value) as Record<string, unknown>)
}

async function writeConfig(cfg: TopazConfig) {
  await Preferences.set({ key: CONFIG_KEY, value: JSON.stringify(cfg) })
}

async function ensureDir(path: string) {
  try {
    await Filesystem.mkdir({ path, directory: Directory.Data, recursive: true })
  } catch {
    // already exists
  }
}

async function walkDir(base: string, rel = ''): Promise<GemEntry[]> {
  const full = rel ? `${base}/${rel}` : base
  let listing
  try {
    listing = await Filesystem.readdir({ path: full, directory: Directory.Data })
  } catch {
    return []
  }

  const entries: GemEntry[] = []
  for (const file of listing.files) {
    const name = typeof file === 'string' ? file : file.name
    const isDir = typeof file === 'string' ? false : file.type === 'directory'
    if (name.startsWith('.')) continue
    const relPath = rel ? `${rel}/${name}` : name
    if (name.endsWith('.md') && !isDir) {
      entries.push({ path: relPath, name, isDir: false })
      continue
    }
    if (isDir) {
      entries.push({ path: relPath, name, isDir: true })
      entries.push(...await walkDir(base, relPath))
      continue
    }
    if (name.endsWith('.md')) {
      entries.push({ path: relPath, name, isDir: false })
      continue
    }
    try {
      const sub = await Filesystem.readdir({ path: `${full}/${name}`, directory: Directory.Data })
      if (sub.files?.length) {
        entries.push({ path: relPath, name, isDir: true })
        entries.push(...await walkDir(base, relPath))
      }
    } catch {
      if (name.endsWith('.md')) entries.push({ path: relPath, name, isDir: false })
    }
  }
  return entries
}

async function readDeletedPathsForGem(gemId: string): Promise<string[]> {
  try {
    const res = await Filesystem.readFile({
      path: `${gemDir(gemId)}/.topaz/deleted.json`,
      directory: Directory.Data,
      encoding: Encoding.UTF8
    })
    return JSON.parse(res.data as string) as string[]
  } catch {
    return []
  }
}

async function writeDeletedPathsForGem(gemId: string, paths: string[]) {
  await ensureDir(`${gemDir(gemId)}/.topaz`)
  await Filesystem.writeFile({
    path: `${gemDir(gemId)}/.topaz/deleted.json`,
    directory: Directory.Data,
    data: JSON.stringify([...new Set(paths)], null, 2),
    encoding: Encoding.UTF8
  })
}

export function createCapacitorAPI(): TopazAPI {
  return {
    getConfig: readConfig,
    saveConfig: async (cfg) => { await writeConfig(cfg); return true },

    pickGemFolder: async () => {
      const cfg = await readConfig()
      if (cfg.gems.length === 0) return null
      return cfg.gems[0].path
    },

    createGem: async (name) => {
      const id = name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || `gem-${Date.now()}`
      const base = gemDir(id)
      await ensureDir(base)
      await ensureDir(`${base}/.topaz`)
      await ensureDir(`${base}/General`)
      const welcome = `${base}/General/Welcome.md`
      try {
        await Filesystem.readFile({ path: welcome, directory: Directory.Data })
      } catch {
        await Filesystem.writeFile({
          path: welcome,
          directory: Directory.Data,
          data: `# Welcome to Topaz\n\nNext Level Notes.\n\n## Getting started\n\n- **Projects** are folders in the sidebar\n- **Notes** live inside projects\n- Link notes with \`[[double brackets]]\`\n- Sign in under Settings to sync — always free\n`,
          encoding: Encoding.UTF8
        })
      }
      return id
    },

    openGem: async (gemId) => {
      currentGemPath = gemId
      await ensureDir(gemDir(gemId))
      return walkDir(gemDir(gemId))
    },

    readNote: async (relPath) => {
      if (!currentGemPath) return null
      try {
        const res = await Filesystem.readFile({
          path: `${gemDir(currentGemPath)}/${relPath}`,
          directory: Directory.Data,
          encoding: Encoding.UTF8
        })
        return res.data as string
      } catch {
        return null
      }
    },

    writeNote: async (relPath, content) => {
      if (!currentGemPath) return false
      const full = `${gemDir(currentGemPath)}/${relPath}`
      const parts = full.split('/')
      parts.pop()
      await ensureDir(parts.join('/'))
      await Filesystem.writeFile({ path: full, directory: Directory.Data, data: content, encoding: Encoding.UTF8 })
      return true
    },

    deleteNote: async (relPath) => {
      if (!currentGemPath) return false
      try {
        await Filesystem.deleteFile({ path: `${gemDir(currentGemPath)}/${relPath}`, directory: Directory.Data })
      } catch { /* ignore */ }
      return true
    },

    renameNote: async (oldPath, newPath) => {
      if (!currentGemPath) return false
      const base = gemDir(currentGemPath)
      const content = await Filesystem.readFile({ path: `${base}/${oldPath}`, directory: Directory.Data, encoding: Encoding.UTF8 })
      await Filesystem.writeFile({ path: `${base}/${newPath}`, directory: Directory.Data, data: content.data, encoding: Encoding.UTF8 })
      await Filesystem.deleteFile({ path: `${base}/${oldPath}`, directory: Directory.Data })
      return true
    },

    createFolder: async (relPath) => {
      if (!currentGemPath) return false
      await ensureDir(`${gemDir(currentGemPath)}/${relPath}`)
      return true
    },

    deleteFolder: async (relPath) => {
      if (!currentGemPath) return false
      try {
        await Filesystem.rmdir({
          path: `${gemDir(currentGemPath)}/${relPath}`,
          directory: Directory.Data,
          recursive: true
        })
      } catch { /* ignore */ }
      return true
    },

    renameFolder: async (oldPath, newPath) => {
      if (!currentGemPath) return false
      const base = gemDir(currentGemPath)
      const all = await walkDir(base)
      const affected = all.filter(e => e.path === oldPath || e.path.startsWith(oldPath + '/'))
      const files = affected.filter(e => !e.isDir).sort((a, b) => b.path.length - a.path.length)
      for (const f of files) {
        const suffix = f.path === oldPath ? '' : f.path.slice(oldPath.length)
        const dest = `${newPath}${suffix}`
        const content = await Filesystem.readFile({ path: `${base}/${f.path}`, directory: Directory.Data, encoding: Encoding.UTF8 })
        const destParts = dest.split('/')
        destParts.pop()
        if (destParts.length) await ensureDir(`${base}/${destParts.join('/')}`)
        await Filesystem.writeFile({ path: `${base}/${dest}`, directory: Directory.Data, data: content.data, encoding: Encoding.UTF8 })
        await Filesystem.deleteFile({ path: `${base}/${f.path}`, directory: Directory.Data })
      }
      try {
        await Filesystem.rmdir({ path: `${base}/${oldPath}`, directory: Directory.Data, recursive: true })
      } catch { /* ignore */ }
      return true
    },

    getGemPath: async () => currentGemPath,

    getLanIps: async () => [],

    openExternal: async (url) => { await Browser.open({ url }) },

    readGemWorkspace: async (gemId) => {
      try {
        const res = await Filesystem.readFile({
          path: `${gemDir(gemId)}/.topaz/workspace.json`,
          directory: Directory.Data,
          encoding: Encoding.UTF8
        })
        return JSON.parse(res.data as string)
      } catch {
        return null
      }
    },

    writeGemWorkspace: async (gemId, data) => {
      await ensureDir(`${gemDir(gemId)}/.topaz`)
      await Filesystem.writeFile({
        path: `${gemDir(gemId)}/.topaz/workspace.json`,
        directory: Directory.Data,
        data: JSON.stringify(data, null, 2),
        encoding: Encoding.UTF8
      })
      return true
    },

    readSyncMeta: async (gemId) => {
      try {
        const res = await Filesystem.readFile({
          path: `${gemDir(gemId)}/.topaz/sync-meta.json`,
          directory: Directory.Data,
          encoding: Encoding.UTF8
        })
        return JSON.parse(res.data as string) as Record<string, number>
      } catch {
        return {}
      }
    },

    writeSyncMeta: async (gemId, meta) => {
      await ensureDir(`${gemDir(gemId)}/.topaz`)
      await Filesystem.writeFile({
        path: `${gemDir(gemId)}/.topaz/sync-meta.json`,
        directory: Directory.Data,
        data: JSON.stringify(meta, null, 2),
        encoding: Encoding.UTF8
      })
      return true
    },

    getNoteMtime: async (gemId, relPath) => {
      const meta = await (async () => {
        try {
          const res = await Filesystem.readFile({
            path: `${gemDir(gemId)}/.topaz/sync-meta.json`,
            directory: Directory.Data,
            encoding: Encoding.UTF8
          })
          return JSON.parse(res.data as string) as Record<string, number>
        } catch {
          return {}
        }
      })()
      return meta[relPath] ?? 0
    },

    getDeletedPaths: async () => {
      if (!currentGemPath) return []
      return readDeletedPathsForGem(currentGemPath)
    },

    markDeletedPaths: async (paths) => {
      if (!currentGemPath) return false
      const existing = await readDeletedPathsForGem(currentGemPath)
      await writeDeletedPathsForGem(currentGemPath, [...existing, ...paths])
      return true
    },

    clearDeletedPaths: async (paths) => {
      if (!currentGemPath) return false
      const remove = new Set(paths)
      const existing = await readDeletedPathsForGem(currentGemPath)
      await writeDeletedPathsForGem(currentGemPath, existing.filter(p => !remove.has(p)))
      return true
    },

    unmarkDeletedPath: async (path) => {
      if (!currentGemPath) return false
      const existing = await readDeletedPathsForGem(currentGemPath)
      await writeDeletedPathsForGem(currentGemPath, existing.filter(p => p !== path))
      return true
    },

    onGemChange: () => () => {}
  }
}
