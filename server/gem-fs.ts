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

const LEGACY_GEMS_DIR = join(DATA_DIR, 'vaults')
const DEFAULT_GEMS_DIR = process.env.TOPAZ_GEMS_DIR ?? process.env.TOPAZ_VAULTS_DIR ?? join(DATA_DIR, 'gems')

function resolveGemsDir(): string {
  if (process.env.TOPAZ_GEMS_DIR || process.env.TOPAZ_VAULTS_DIR) return DEFAULT_GEMS_DIR
  if (existsSync(DEFAULT_GEMS_DIR)) return DEFAULT_GEMS_DIR
  if (existsSync(LEGACY_GEMS_DIR)) return LEGACY_GEMS_DIR
  return DEFAULT_GEMS_DIR
}

export const GEMS_DIR = resolveGemsDir()

export interface GemEntry {
  path: string
  name: string
  isDir: boolean
}

export function ensureDataDirs() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  if (!existsSync(GEMS_DIR)) mkdirSync(GEMS_DIR, { recursive: true })
}

const WEB_CONFIG_PATH = join(DATA_DIR, 'web-config.json')

export interface WebGemRef {
  id: string
  name: string
  path: string
}

export interface WebTopazConfig {
  gems: WebGemRef[]
  lastGemId?: string
  syncServer?: string
  computerIp?: string
  pairCode?: string
  authToken?: string
  userEmail?: string
  hubMode?: boolean
  syncRole?: 'server' | 'client'
}

type LegacyWebTopazConfig = WebTopazConfig & {
  vaults?: WebGemRef[]
  lastVaultId?: string
}

export function readWebConfig(): WebTopazConfig {
  if (!existsSync(WEB_CONFIG_PATH)) return { gems: [] }
  try {
    const raw = JSON.parse(readFileSync(WEB_CONFIG_PATH, 'utf-8')) as LegacyWebTopazConfig
    const gems = Array.isArray(raw.gems)
      ? raw.gems
      : Array.isArray(raw.vaults)
        ? raw.vaults
        : []
    const lastGemId = raw.lastGemId ?? raw.lastVaultId
    const { vaults: _vaults, lastVaultId: _lastVaultId, ...rest } = raw
    return { ...rest, gems, ...(lastGemId !== undefined ? { lastGemId } : {}) }
  } catch {
    return { gems: [] }
  }
}

export function writeWebConfig(cfg: WebTopazConfig) {
  ensureDataDirs()
  writeFileSync(WEB_CONFIG_PATH, JSON.stringify(cfg, null, 2))
}

export function listGemIds(): string[] {
  if (!existsSync(GEMS_DIR)) return []
  return readdirSync(GEMS_DIR).filter((entry) => !entry.startsWith('.'))
}

export function resolveGemPath(gemPath: string): string {
  if (isAbsolute(gemPath)) return gemPath
  return join(GEMS_DIR, gemPath)
}

export function walkDir(dir: string, base = dir): GemEntry[] {
  const entries: GemEntry[] = []
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

export function openGem(gemPath: string): GemEntry[] {
  const full = resolveGemPath(gemPath)
  if (!existsSync(full)) mkdirSync(full, { recursive: true })
  return walkDir(full)
}

export function readNote(gemPath: string, relPath: string): string | null {
  const full = join(resolveGemPath(gemPath), relPath)
  if (!existsSync(full)) return null
  return readFileSync(full, 'utf-8')
}

export function writeNote(gemPath: string, relPath: string, content: string): boolean {
  const full = join(resolveGemPath(gemPath), relPath)
  const dir = join(full, '..')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(full, content, 'utf-8')
  return true
}

export function deleteNote(gemPath: string, relPath: string): boolean {
  const full = join(resolveGemPath(gemPath), relPath)
  if (existsSync(full)) unlinkSync(full)
  return true
}

export function renameNote(gemPath: string, oldPath: string, newPath: string): boolean {
  const base = resolveGemPath(gemPath)
  const oldFull = join(base, oldPath)
  const newFull = join(base, newPath)
  const dir = join(newFull, '..')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  renameSync(oldFull, newFull)
  return true
}

export function createFolder(gemPath: string, relPath: string): boolean {
  const full = join(resolveGemPath(gemPath), relPath)
  if (!existsSync(full)) mkdirSync(full, { recursive: true })
  return true
}

export function deleteFolder(gemPath: string, relPath: string): boolean {
  const full = join(resolveGemPath(gemPath), relPath)
  if (existsSync(full)) rmSync(full, { recursive: true, force: true })
  return true
}

export function renameFolder(gemPath: string, oldPath: string, newPath: string): boolean {
  const base = resolveGemPath(gemPath)
  const oldFull = join(base, oldPath)
  const newFull = join(base, newPath)
  const dir = join(newFull, '..')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  if (existsSync(oldFull)) renameSync(oldFull, newFull)
  return true
}

export function createGem(name: string): string {
  ensureDataDirs()
  const id = name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || `gem-${Date.now()}`
  const gemPath = join(GEMS_DIR, id)
  if (!existsSync(gemPath)) mkdirSync(gemPath, { recursive: true })

  const topazDir = join(gemPath, '.topaz')
  if (!existsSync(topazDir)) mkdirSync(topazDir, { recursive: true })

  const generalDir = join(gemPath, 'General')
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

function syncMetaPath(gemPath: string) {
  return join(resolveGemPath(gemPath), '.topaz', 'sync-meta.json')
}

export function readSyncMeta(gemPath: string): Record<string, number> {
  const file = syncMetaPath(gemPath)
  if (!existsSync(file)) return {}
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as Record<string, number>
  } catch {
    return {}
  }
}

export function writeSyncMeta(gemPath: string, meta: Record<string, number>): boolean {
  const dir = join(resolveGemPath(gemPath), '.topaz')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(syncMetaPath(gemPath), JSON.stringify(meta, null, 2))
  return true
}

export function getNoteMtime(gemPath: string, relPath: string): number {
  const meta = readSyncMeta(gemPath)
  const full = join(resolveGemPath(gemPath), relPath)
  const fsMtime = existsSync(full) ? statSync(full).mtimeMs : 0
  return Math.max(meta[relPath] ?? 0, fsMtime)
}

function deletedPathsFile(gemPath: string) {
  return join(resolveGemPath(gemPath), '.topaz', 'deleted.json')
}

export function getDeletedPaths(gemPath: string): string[] {
  const f = deletedPathsFile(gemPath)
  if (!existsSync(f)) return []
  try {
    return JSON.parse(readFileSync(f, 'utf-8')) as string[]
  } catch {
    return []
  }
}

export function markDeletedPaths(gemPath: string, paths: string[]): boolean {
  writeDeletedPaths(gemPath, [...getDeletedPaths(gemPath), ...paths])
  return true
}

export function clearDeletedPaths(gemPath: string, paths: string[]): boolean {
  const remove = new Set(paths)
  writeDeletedPaths(gemPath, getDeletedPaths(gemPath).filter(p => !remove.has(p)))
  return true
}

export function unmarkDeletedPath(gemPath: string, path: string): boolean {
  writeDeletedPaths(gemPath, getDeletedPaths(gemPath).filter(p => p !== path))
  return true
}

function writeDeletedPaths(gemPath: string, paths: string[]) {
  const dir = join(resolveGemPath(gemPath), '.topaz')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(deletedPathsFile(gemPath), JSON.stringify(Array.from(new Set(paths)), null, 2))
}
