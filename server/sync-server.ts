import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { join } from 'path'
import { homedir } from 'os'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import type { Server } from 'http'
import { Bonjour } from 'bonjour-service'

export const SYNC_PORT = 3921
const JWT_SECRET = process.env.TOPAZ_JWT_SECRET ?? 'topaz-dev-secret-change-in-production'
const DATA_DIR = process.env.TOPAZ_DATA_DIR ?? join(homedir(), '.topaz-server')
const DB_PATH = join(DATA_DIR, 'store.json')
const PAIR_PATH = join(DATA_DIR, 'pairing.json')

interface PairState { code: string; expires: number }

interface User { id: string; email: string; password_hash: string; created_at: number }
interface GemFile { user_id: string; gem_id: string; path: string; content: string; mtime: number }
interface Store { users: User[]; gem_files: GemFile[] }

interface LegacyVaultFile { user_id: string; vault_id: string; path: string; content: string; mtime: number }
interface LegacyStore { users?: User[]; gem_files?: GemFile[]; vault_files?: LegacyVaultFile[] }

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

function loadStore(): Store {
  if (!existsSync(DB_PATH)) return { users: [], gem_files: [] }
  const raw = JSON.parse(readFileSync(DB_PATH, 'utf-8')) as LegacyStore
  if (Array.isArray(raw.gem_files)) {
    return { users: raw.users ?? [], gem_files: raw.gem_files }
  }
  if (Array.isArray(raw.vault_files)) {
    return {
      users: raw.users ?? [],
      gem_files: raw.vault_files.map((f) => ({
        user_id: f.user_id,
        gem_id: f.vault_id,
        path: f.path,
        content: f.content,
        mtime: f.mtime,
      })),
    }
  }
  return { users: raw.users ?? [], gem_files: [] }
}

function saveStore(store: Store) {
  writeFileSync(DB_PATH, JSON.stringify(store, null, 2))
}

function loadPair(): PairState | null {
  if (!existsSync(PAIR_PATH)) return null
  try { return JSON.parse(readFileSync(PAIR_PATH, 'utf-8')) as PairState } catch { return null }
}

function savePair(state: PairState) {
  writeFileSync(PAIR_PATH, JSON.stringify(state, null, 2))
}

function newPairCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function mountSyncRoutes(app: express.Application) {
  function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET) as { userId: string; email: string }
      ;(req as express.Request & { user: typeof payload }).user = payload
      next()
    } catch {
      res.status(401).json({ error: 'Invalid token' })
    }
  }

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'topaz-sync' }))

  app.get('/api/discover', (_req, res) => {
    res.json({ service: 'topaz-sync', version: 1, port: SYNC_PORT })
  })

  app.post('/api/pair/new', (_req, res) => {
    const code = newPairCode()
    const expires = Date.now() + 15 * 60 * 1000
    savePair({ code, expires })
    res.json({ code, expiresIn: 900 })
  })

  app.get('/api/pair/current', (_req, res) => {
    const pair = loadPair()
    if (pair && pair.expires > Date.now()) {
      res.json({ code: pair.code, expiresIn: Math.max(0, Math.floor((pair.expires - Date.now()) / 1000)) })
      return
    }
    res.status(404).json({ error: 'No active code' })
  })

  app.get('/api/pair/:code', (req, res) => {
    const pair = loadPair()
    const code = (req.params.code as string).trim()
    if (pair && pair.code === code && pair.expires > Date.now()) {
      res.json({ ok: true, service: 'topaz-sync', port: SYNC_PORT })
      return
    }
    res.status(404).json({ error: 'Invalid or expired code' })
  })

  app.post('/api/auth/register', (req, res) => {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

    const store = loadStore()
    if (store.users.find(u => u.email === email)) return res.status(409).json({ error: 'Email already registered' })

    const id = crypto.randomUUID()
    store.users.push({ id, email, password_hash: bcrypt.hashSync(password, 10), created_at: Date.now() })
    saveStore(store)

    const token = jwt.sign({ userId: id, email }, JWT_SECRET, { expiresIn: '365d' })
    res.json({ token, email })
  })

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body
    const store = loadStore()
    const user = store.users.find(u => u.email === email)
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '365d' })
    res.json({ token, email: user.email })
  })

  app.get('/api/gems', auth, (req, res) => {
    const user = (req as express.Request & { user: { userId: string } }).user
    const store = loadStore()
    const gemIds = Array.from(new Set(
      store.gem_files.filter(g => g.user_id === user.userId).map(g => g.gem_id)
    ))
    res.json({ gemIds })
  })

  app.post('/api/sync/:gemId', auth, (req, res) => {
    const user = (req as express.Request & { user: { userId: string } }).user
    const gemId = req.params.gemId as string
    const { files, deleted } = req.body as {
      files: { path: string; content: string; mtime: number }[]
      deleted?: string[]
    }
    const store = loadStore()

    for (const f of files ?? []) {
      const idx = store.gem_files.findIndex(
        g => g.user_id === user.userId && g.gem_id === gemId && g.path === f.path
      )
      if (idx >= 0) {
        if (f.mtime >= store.gem_files[idx].mtime) {
          store.gem_files[idx] = { user_id: user.userId, gem_id: gemId, path: f.path, content: f.content, mtime: f.mtime }
        }
      } else {
        store.gem_files.push({ user_id: user.userId, gem_id: gemId, path: f.path, content: f.content, mtime: f.mtime })
      }
    }

    if (deleted?.length) {
      const remove = new Set(deleted)
      store.gem_files = store.gem_files.filter(
        g => !(g.user_id === user.userId && g.gem_id === gemId && remove.has(g.path))
      )
    }

    saveStore(store)
    const remote = store.gem_files.filter(g => g.user_id === user.userId && g.gem_id === gemId)
    res.json({ files: remote.map(({ path, content, mtime }) => ({ path, content, mtime })), deleted: deleted ?? [] })
  })
}

export function createSyncApp() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '50mb' }))
  mountSyncRoutes(app)
  return app
}

let httpServer: Server | null = null
let bonjour: Bonjour | null = null

export function startSyncServer(): Promise<void> {
  if (httpServer) return Promise.resolve()

  const app = createSyncApp()
  return new Promise((resolve, reject) => {
    httpServer = app.listen(SYNC_PORT, '0.0.0.0', () => {
      try {
        bonjour = new Bonjour()
        bonjour.publish({ name: 'topaz-sync', type: 'topaz-sync', port: SYNC_PORT })
      } catch {
      }
      resolve()
    })
    httpServer.on('error', reject)
  })
}

export function stopSyncServer() {
  bonjour?.unpublishAll()
  bonjour?.destroy()
  bonjour = null
  if (httpServer) {
    httpServer.close()
    httpServer = null
  }
}

export function isSyncServerRunning() {
  return httpServer !== null
}
