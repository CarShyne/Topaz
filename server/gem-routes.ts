import { Router } from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync, unlinkSync, readdirSync, readFileSync } from 'fs'
import * as gem from './gem-fs'
import { TOPAZ_BUILD } from './build-info'

export const gemRouter = Router()

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_DIST = join(__dirname, '..', 'dist-web')

function registerGemInConfig(name: string, gemPath: string) {
  const cfg = gem.readWebConfig()
  const displayName = name.trim()
  let entry = cfg.gems.find((g) => g.path === gemPath)
  if (!entry) {
    entry = { id: gemPath, name: displayName, path: gemPath }
    cfg.gems.push(entry)
  } else {
    entry.name = displayName
  }
  cfg.lastGemId = entry.id
  gem.writeWebConfig(cfg)
  return { gemPath, name: displayName, entries: gem.openGem(gemPath) }
}

gemRouter.get('/health', (_req, res) => {
  try {
    gem.ensureDataDirs()
    const probe = join(gem.DATA_DIR, '.write-test')
    writeFileSync(probe, 'ok')
    unlinkSync(probe)
    res.json({
      ok: true,
      build: TOPAZ_BUILD,
      dataDir: gem.DATA_DIR,
      gemsDir: gem.GEMS_DIR,
      gemCount: gem.listGemIds().length,
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

gemRouter.get('/whatami', (_req, res) => {
  let jsFile = ''
  let hasNewTagline = false
  let hasOldTagline = false
  try {
    const assets = join(WEB_DIST, 'assets')
    jsFile = readdirSync(assets).find((f) => f.startsWith('index.web') && f.endsWith('.js')) ?? ''
    if (jsFile) {
      const js = readFileSync(join(assets, jsFile), 'utf-8')
      hasNewTagline = js.includes('Next Level Notes')
      hasOldTagline = js.includes('Create new vault') || js.includes('My Vault')
    }
  } catch {
    // dist-web may be missing in dev
  }
  res.json({
    build: TOPAZ_BUILD,
    jsFile,
    hasNewTagline,
    hasOldTagline,
    gemApi: true,
    expectedSubtitle: 'Next Level Notes',
  })
})

gemRouter.get('/check', (_req, res) => {
  res.type('text/plain').send(
    [
      'Topaz server check',
      `build: ${TOPAZ_BUILD}`,
      'gem-api: ok',
      'expected-tagline: Next Level Notes',
      '',
      'If the app still shows old gem UI text, Safari is showing a cached old page.',
      'Fix: delete the home-screen shortcut, hard-refresh, or open in a private tab.',
      'Also confirm Portainer recreated the container after docker push.',
    ].join('\n')
  )
})

gemRouter.post('/getConfig', (_req, res) => {
  try {
    res.json({ config: gem.readWebConfig() })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

gemRouter.post('/saveConfig', (req, res) => {
  const { config } = req.body as { config?: gem.WebTopazConfig }
  if (!config || typeof config !== 'object') {
    return res.status(400).json({ error: 'config object required' })
  }
  try {
    gem.writeWebConfig(config)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

function requireGemPath(
  gemPath: unknown,
  res: { status: (code: number) => { json: (body: unknown) => void } }
): gemPath is string {
  if (typeof gemPath !== 'string' || !gemPath.trim()) {
    res.status(400).json({ error: 'gemPath required' })
    return false
  }
  return true
}

gemRouter.post('/openGem', (req, res) => {
  const { gemPath } = req.body as { gemPath?: string }
  if (!requireGemPath(gemPath, res)) return
  try {
    const entries = gem.openGem(gemPath)
    res.json({ entries })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

gemRouter.post('/readNote', (req, res) => {
  const { gemPath, path } = req.body as { gemPath?: string; path?: string }
  if (!requireGemPath(gemPath, res)) return
  if (typeof path !== 'string') return res.status(400).json({ error: 'path required' })
  try {
    res.json({ content: gem.readNote(gemPath, path) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

gemRouter.post('/writeNote', (req, res) => {
  const { gemPath, path, content } = req.body as { gemPath?: string; path?: string; content?: string }
  if (!requireGemPath(gemPath, res)) return
  if (typeof path !== 'string' || typeof content !== 'string') {
    return res.status(400).json({ error: 'path and content required' })
  }
  try {
    res.json({ ok: gem.writeNote(gemPath, path, content) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

gemRouter.post('/deleteNote', (req, res) => {
  const { gemPath, path } = req.body as { gemPath?: string; path?: string }
  if (!requireGemPath(gemPath, res)) return
  if (typeof path !== 'string') return res.status(400).json({ error: 'path required' })
  try {
    res.json({ ok: gem.deleteNote(gemPath, path) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

gemRouter.post('/renameNote', (req, res) => {
  const { gemPath, oldPath, newPath } = req.body as { gemPath?: string; oldPath?: string; newPath?: string }
  if (!requireGemPath(gemPath, res)) return
  if (typeof oldPath !== 'string' || typeof newPath !== 'string') {
    return res.status(400).json({ error: 'oldPath and newPath required' })
  }
  try {
    res.json({ ok: gem.renameNote(gemPath, oldPath, newPath) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

gemRouter.post('/createFolder', (req, res) => {
  const { gemPath, path } = req.body as { gemPath?: string; path?: string }
  if (!requireGemPath(gemPath, res)) return
  if (typeof path !== 'string') return res.status(400).json({ error: 'path required' })
  try {
    res.json({ ok: gem.createFolder(gemPath, path) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

gemRouter.post('/deleteFolder', (req, res) => {
  const { gemPath, path } = req.body as { gemPath?: string; path?: string }
  if (!requireGemPath(gemPath, res)) return
  if (typeof path !== 'string') return res.status(400).json({ error: 'path required' })
  try {
    res.json({ ok: gem.deleteFolder(gemPath, path) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

gemRouter.post('/renameFolder', (req, res) => {
  const { gemPath, oldPath, newPath } = req.body as { gemPath?: string; oldPath?: string; newPath?: string }
  if (!requireGemPath(gemPath, res)) return
  if (typeof oldPath !== 'string' || typeof newPath !== 'string') {
    return res.status(400).json({ error: 'oldPath and newPath required' })
  }
  try {
    res.json({ ok: gem.renameFolder(gemPath, oldPath, newPath) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

gemRouter.post('/getDeletedPaths', (req, res) => {
  const { gemPath } = req.body as { gemPath?: string }
  if (!requireGemPath(gemPath, res)) return
  try {
    res.json({ paths: gem.getDeletedPaths(gemPath) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

gemRouter.post('/markDeletedPaths', (req, res) => {
  const { gemPath, paths } = req.body as { gemPath?: string; paths?: string[] }
  if (!requireGemPath(gemPath, res)) return
  if (!Array.isArray(paths)) return res.status(400).json({ error: 'paths required' })
  try {
    res.json({ ok: gem.markDeletedPaths(gemPath, paths) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

gemRouter.post('/clearDeletedPaths', (req, res) => {
  const { gemPath, paths } = req.body as { gemPath?: string; paths?: string[] }
  if (!requireGemPath(gemPath, res)) return
  if (!Array.isArray(paths)) return res.status(400).json({ error: 'paths required' })
  try {
    res.json({ ok: gem.clearDeletedPaths(gemPath, paths) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

gemRouter.post('/unmarkDeletedPath', (req, res) => {
  const { gemPath, path } = req.body as { gemPath?: string; path?: string }
  if (!requireGemPath(gemPath, res)) return
  if (typeof path !== 'string') return res.status(400).json({ error: 'path required' })
  try {
    res.json({ ok: gem.unmarkDeletedPath(gemPath, path) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

gemRouter.post('/readSyncMeta', (req, res) => {
  const { gemPath } = req.body as { gemPath?: string }
  if (!requireGemPath(gemPath, res)) return
  try {
    res.json({ meta: gem.readSyncMeta(gemPath) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

gemRouter.post('/writeSyncMeta', (req, res) => {
  const { gemPath, meta } = req.body as { gemPath?: string; meta?: Record<string, number> }
  if (!requireGemPath(gemPath, res)) return
  if (!meta || typeof meta !== 'object') return res.status(400).json({ error: 'meta required' })
  try {
    res.json({ ok: gem.writeSyncMeta(gemPath, meta) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

gemRouter.post('/getNoteMtime', (req, res) => {
  const { gemPath, path } = req.body as { gemPath?: string; path?: string }
  if (!requireGemPath(gemPath, res)) return
  if (typeof path !== 'string') return res.status(400).json({ error: 'path required' })
  try {
    res.json({ mtime: gem.getNoteMtime(gemPath, path) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

gemRouter.post('/createGem', (req, res) => {
  const { name } = req.body as { name?: string }
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name required' })
  }
  try {
    const gemPath = gem.createGem(name.trim())
    registerGemInConfig(name, gemPath)
    res.json({ gemPath })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

gemRouter.post('/createAndOpen', (req, res) => {
  const { name } = req.body as { name?: string }
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name required' })
  }
  try {
    const gemPath = gem.createGem(name.trim())
    const result = registerGemInConfig(name, gemPath)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})
