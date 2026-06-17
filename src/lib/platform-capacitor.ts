import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'
import { Browser } from '@capacitor/browser'
import type { TopazAPI, TopazConfig, VaultEntry } from './platform'

const CONFIG_KEY = 'topaz_config'
const VAULTS_ROOT = 'vaults'
let currentVaultPath: string | null = null

function vaultDir(vaultId: string) {
  return `${VAULTS_ROOT}/${vaultId}`
}

async function readConfig(): Promise<TopazConfig> {
  const { value } = await Preferences.get({ key: CONFIG_KEY })
  if (!value) return { vaults: [] }
  return JSON.parse(value)
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

async function walkDir(base: string, rel = ''): Promise<VaultEntry[]> {
  const full = rel ? `${base}/${rel}` : base
  let listing
  try {
    listing = await Filesystem.readdir({ path: full, directory: Directory.Data })
  } catch {
    return []
  }

  const entries: VaultEntry[] = []
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

async function readDeletedPathsForVault(vaultId: string): Promise<string[]> {
  try {
    const res = await Filesystem.readFile({
      path: `${vaultDir(vaultId)}/.topaz/deleted.json`,
      directory: Directory.Data,
      encoding: Encoding.UTF8
    })
    return JSON.parse(res.data as string) as string[]
  } catch {
    return []
  }
}

async function writeDeletedPathsForVault(vaultId: string, paths: string[]) {
  await ensureDir(`${vaultDir(vaultId)}/.topaz`)
  await Filesystem.writeFile({
    path: `${vaultDir(vaultId)}/.topaz/deleted.json`,
    directory: Directory.Data,
    data: JSON.stringify([...new Set(paths)], null, 2),
    encoding: Encoding.UTF8
  })
}

export function createCapacitorAPI(): TopazAPI {
  return {
    getConfig: readConfig,
    saveConfig: async (cfg) => { await writeConfig(cfg); return true },

    pickVaultFolder: async () => {
      const cfg = await readConfig()
      if (cfg.vaults.length === 0) return null
      return cfg.vaults[0].path
    },

    createVault: async (name) => {
      const id = name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || `vault-${Date.now()}`
      const base = vaultDir(id)
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

    openVault: async (vaultId) => {
      currentVaultPath = vaultId
      await ensureDir(vaultDir(vaultId))
      return walkDir(vaultDir(vaultId))
    },

    readNote: async (relPath) => {
      if (!currentVaultPath) return null
      try {
        const res = await Filesystem.readFile({
          path: `${vaultDir(currentVaultPath)}/${relPath}`,
          directory: Directory.Data,
          encoding: Encoding.UTF8
        })
        return res.data as string
      } catch {
        return null
      }
    },

    writeNote: async (relPath, content) => {
      if (!currentVaultPath) return false
      const full = `${vaultDir(currentVaultPath)}/${relPath}`
      const parts = full.split('/')
      parts.pop()
      await ensureDir(parts.join('/'))
      await Filesystem.writeFile({ path: full, directory: Directory.Data, data: content, encoding: Encoding.UTF8 })
      return true
    },

    deleteNote: async (relPath) => {
      if (!currentVaultPath) return false
      try {
        await Filesystem.deleteFile({ path: `${vaultDir(currentVaultPath)}/${relPath}`, directory: Directory.Data })
      } catch { /* ignore */ }
      return true
    },

    renameNote: async (oldPath, newPath) => {
      if (!currentVaultPath) return false
      const base = vaultDir(currentVaultPath)
      const content = await Filesystem.readFile({ path: `${base}/${oldPath}`, directory: Directory.Data, encoding: Encoding.UTF8 })
      await Filesystem.writeFile({ path: `${base}/${newPath}`, directory: Directory.Data, data: content.data, encoding: Encoding.UTF8 })
      await Filesystem.deleteFile({ path: `${base}/${oldPath}`, directory: Directory.Data })
      return true
    },

    createFolder: async (relPath) => {
      if (!currentVaultPath) return false
      await ensureDir(`${vaultDir(currentVaultPath)}/${relPath}`)
      return true
    },

    deleteFolder: async (relPath) => {
      if (!currentVaultPath) return false
      try {
        await Filesystem.rmdir({
          path: `${vaultDir(currentVaultPath)}/${relPath}`,
          directory: Directory.Data,
          recursive: true
        })
      } catch { /* ignore */ }
      return true
    },

    renameFolder: async (oldPath, newPath) => {
      if (!currentVaultPath) return false
      const base = vaultDir(currentVaultPath)
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

    getVaultPath: async () => currentVaultPath,

    getLanIps: async () => [],

    openExternal: async (url) => { await Browser.open({ url }) },

    readVaultWorkspace: async (vaultId) => {
      try {
        const res = await Filesystem.readFile({
          path: `${vaultDir(vaultId)}/.topaz/workspace.json`,
          directory: Directory.Data,
          encoding: Encoding.UTF8
        })
        return JSON.parse(res.data as string)
      } catch {
        return null
      }
    },

    writeVaultWorkspace: async (vaultId, data) => {
      await ensureDir(`${vaultDir(vaultId)}/.topaz`)
      await Filesystem.writeFile({
        path: `${vaultDir(vaultId)}/.topaz/workspace.json`,
        directory: Directory.Data,
        data: JSON.stringify(data, null, 2),
        encoding: Encoding.UTF8
      })
      return true
    },

    readSyncMeta: async (vaultId) => {
      try {
        const res = await Filesystem.readFile({
          path: `${vaultDir(vaultId)}/.topaz/sync-meta.json`,
          directory: Directory.Data,
          encoding: Encoding.UTF8
        })
        return JSON.parse(res.data as string) as Record<string, number>
      } catch {
        return {}
      }
    },

    writeSyncMeta: async (vaultId, meta) => {
      await ensureDir(`${vaultDir(vaultId)}/.topaz`)
      await Filesystem.writeFile({
        path: `${vaultDir(vaultId)}/.topaz/sync-meta.json`,
        directory: Directory.Data,
        data: JSON.stringify(meta, null, 2),
        encoding: Encoding.UTF8
      })
      return true
    },

    getNoteMtime: async (vaultId, relPath) => {
      const meta = await (async () => {
        try {
          const res = await Filesystem.readFile({
            path: `${vaultDir(vaultId)}/.topaz/sync-meta.json`,
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
      if (!currentVaultPath) return []
      return readDeletedPathsForVault(currentVaultPath)
    },

    markDeletedPaths: async (paths) => {
      if (!currentVaultPath) return false
      const existing = await readDeletedPathsForVault(currentVaultPath)
      await writeDeletedPathsForVault(currentVaultPath, [...existing, ...paths])
      return true
    },

    clearDeletedPaths: async (paths) => {
      if (!currentVaultPath) return false
      const remove = new Set(paths)
      const existing = await readDeletedPathsForVault(currentVaultPath)
      await writeDeletedPathsForVault(currentVaultPath, existing.filter(p => !remove.has(p)))
      return true
    },

    unmarkDeletedPath: async (path) => {
      if (!currentVaultPath) return false
      const existing = await readDeletedPathsForVault(currentVaultPath)
      await writeDeletedPathsForVault(currentVaultPath, existing.filter(p => p !== path))
      return true
    },

    onVaultChange: () => () => {}
  }
}
