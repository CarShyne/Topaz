import { homedir } from 'os'
import { join, isAbsolute } from 'path'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  renameSync,
  rmSync
} from 'fs'

export const DATA_DIR = process.env.TOPAZ_DATA_DIR ?? join(homedir(), '.topaz-server')
export const VAULTS_DIR = process.env.TOPAZ_VAULTS_DIR ?? join(DATA_DIR, 'vaults')

export interface VaultEntry {
  path: string
  name: string
  isDir: boolean
}

export function ensureDataDirs() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  if (!existsSync(VAULTS_DIR)) mkdirSync(VAULTS_DIR, { recursive: true })
}

const WEB_CONFIG_PATH = join(DATA_DIR, 'web-config.json')

export interface WebVaultRef {
  id: string
  name: string
  path: string
}

export interface WebTopazConfig {
  vaults: WebVaultRef[]
  lastVaultId?: string
  syncServer?: string
  computerIp?: string
  pairCode?: string
  authToken?: string
  userEmail?: string
  hubMode?: boolean
}

export function readWebConfig(): WebTopazConfig {
  if (!existsSync(WEB_CONFIG_PATH)) return { vaults: [] }
  try {
    const cfg = JSON.parse(readFileSync(WEB_CONFIG_PATH, 'utf-8')) as WebTopazConfig
    return { ...cfg, vaults: Array.isArray(cfg.vaults) ? cfg.vaults : [] }
  } catch {
    return { vaults: [] }
  }
}

export function writeWebConfig(cfg: WebTopazConfig) {
  ensureDataDirs()
  writeFileSync(WEB_CONFIG_PATH, JSON.stringify(cfg, null, 2))
}

export function listVaultIds(): string[] {
  if (!existsSync(VAULTS_DIR)) return []
  return readdirSync(VAULTS_DIR).filter((entry) => !entry.startsWith('.'))
}

export function resolveVaultPath(vaultPath: string): string {
  if (isAbsolute(vaultPath)) return vaultPath
  return join(VAULTS_DIR, vaultPath)
}

export function walkDir(dir: string, base = dir): VaultEntry[] {
  const entries: VaultEntry[] = []
  if (!existsSync(dir)) return entries

  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue
    const full = join(dir, entry)
    const rel = full.slice(base.length + 1)
    const st = statSync(full)
    if (st.isDirectory()) {
      entries.push({ path: rel, name: entry, isDir: true })
      entries.push(...walkDir(full, base))
    } else if (entry.endsWith('.md')) {
      entries.push({ path: rel, name: entry, isDir: false })
    }
  }
  return entries
}

export function openVault(vaultPath: string): VaultEntry[] {
  const full = resolveVaultPath(vaultPath)
  if (!existsSync(full)) mkdirSync(full, { recursive: true })
  return walkDir(full)
}

export function readNote(vaultPath: string, relPath: string): string | null {
  const full = join(resolveVaultPath(vaultPath), relPath)
  if (!existsSync(full)) return null
  return readFileSync(full, 'utf-8')
}

export function writeNote(vaultPath: string, relPath: string, content: string): boolean {
  const full = join(resolveVaultPath(vaultPath), relPath)
  const dir = join(full, '..')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(full, content, 'utf-8')
  return true
}

export function deleteNote(vaultPath: string, relPath: string): boolean {
  const full = join(resolveVaultPath(vaultPath), relPath)
  if (existsSync(full)) unlinkSync(full)
  return true
}

export function renameNote(vaultPath: string, oldPath: string, newPath: string): boolean {
  const base = resolveVaultPath(vaultPath)
  const oldFull = join(base, oldPath)
  const newFull = join(base, newPath)
  const dir = join(newFull, '..')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  renameSync(oldFull, newFull)
  return true
}

export function createFolder(vaultPath: string, relPath: string): boolean {
  const full = join(resolveVaultPath(vaultPath), relPath)
  if (!existsSync(full)) mkdirSync(full, { recursive: true })
  return true
}

export function deleteFolder(vaultPath: string, relPath: string): boolean {
  const full = join(resolveVaultPath(vaultPath), relPath)
  if (existsSync(full)) rmSync(full, { recursive: true, force: true })
  return true
}

export function renameFolder(vaultPath: string, oldPath: string, newPath: string): boolean {
  const base = resolveVaultPath(vaultPath)
  const oldFull = join(base, oldPath)
  const newFull = join(base, newPath)
  const dir = join(newFull, '..')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  if (existsSync(oldFull)) renameSync(oldFull, newFull)
  return true
}

export function createVault(name: string): string {
  ensureDataDirs()
  const id = name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || `vault-${Date.now()}`
  const vaultPath = join(VAULTS_DIR, id)
  if (!existsSync(vaultPath)) mkdirSync(vaultPath, { recursive: true })

  const topazDir = join(vaultPath, '.topaz')
  if (!existsSync(topazDir)) mkdirSync(topazDir, { recursive: true })

  const generalDir = join(vaultPath, 'General')
  if (!existsSync(generalDir)) mkdirSync(generalDir, { recursive: true })

  const welcome = join(generalDir, 'Welcome.md')
  if (!existsSync(welcome)) {
    writeFileSync(
      welcome,
      `# Welcome to Topaz\n\nNext Level Notes.\n\n## Getting started\n\n- **Projects** are folders — create them in the file sidebar\n- **Notes** live inside projects\n- Link notes with \`[[double brackets]]\`\n- Sign in under Settings to sync — always free\n`
    )
  }

  return id
}

function syncMetaPath(vaultPath: string) {
  return join(resolveVaultPath(vaultPath), '.topaz', 'sync-meta.json')
}

export function readSyncMeta(vaultPath: string): Record<string, number> {
  const file = syncMetaPath(vaultPath)
  if (!existsSync(file)) return {}
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as Record<string, number>
  } catch {
    return {}
  }
}

export function writeSyncMeta(vaultPath: string, meta: Record<string, number>): boolean {
  const dir = join(resolveVaultPath(vaultPath), '.topaz')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(syncMetaPath(vaultPath), JSON.stringify(meta, null, 2))
  return true
}

export function getNoteMtime(vaultPath: string, relPath: string): number {
  const meta = readSyncMeta(vaultPath)
  const full = join(resolveVaultPath(vaultPath), relPath)
  const fsMtime = existsSync(full) ? statSync(full).mtimeMs : 0
  return Math.max(meta[relPath] ?? 0, fsMtime)
}

function deletedPathsFile(vaultPath: string) {
  return join(resolveVaultPath(vaultPath), '.topaz', 'deleted.json')
}

export function getDeletedPaths(vaultPath: string): string[] {
  const f = deletedPathsFile(vaultPath)
  if (!existsSync(f)) return []
  try {
    return JSON.parse(readFileSync(f, 'utf-8')) as string[]
  } catch {
    return []
  }
}

export function markDeletedPaths(vaultPath: string, paths: string[]): boolean {
  writeDeletedPaths(vaultPath, [...getDeletedPaths(vaultPath), ...paths])
  return true
}

export function clearDeletedPaths(vaultPath: string, paths: string[]): boolean {
  const remove = new Set(paths)
  writeDeletedPaths(vaultPath, getDeletedPaths(vaultPath).filter(p => !remove.has(p)))
  return true
}

export function unmarkDeletedPath(vaultPath: string, path: string): boolean {
  writeDeletedPaths(vaultPath, getDeletedPaths(vaultPath).filter(p => p !== path))
  return true
}

function writeDeletedPaths(vaultPath: string, paths: string[]) {
  const dir = join(resolveVaultPath(vaultPath), '.topaz')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(deletedPathsFile(vaultPath), JSON.stringify(Array.from(new Set(paths)), null, 2))
}
