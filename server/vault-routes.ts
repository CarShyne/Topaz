import { Router } from 'express'
import { join } from 'path'
import { writeFileSync, unlinkSync } from 'fs'
import * as vault from './vault-fs'

export const vaultRouter = Router()

vaultRouter.get('/health', (_req, res) => {
  try {
    vault.ensureDataDirs()
    const probe = join(vault.DATA_DIR, '.write-test')
    writeFileSync(probe, 'ok')
    unlinkSync(probe)
    res.json({
      ok: true,
      dataDir: vault.DATA_DIR,
      vaultsDir: vault.VAULTS_DIR,
      vaultCount: vault.listVaultIds().length,
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

vaultRouter.post('/getConfig', (_req, res) => {
  try {
    res.json({ config: vault.readWebConfig() })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

vaultRouter.post('/saveConfig', (req, res) => {
  const { config } = req.body as { config?: vault.WebTopazConfig }
  if (!config || typeof config !== 'object') {
    return res.status(400).json({ error: 'config object required' })
  }
  try {
    vault.writeWebConfig(config)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

function requireVaultPath(
  vaultPath: unknown,
  res: { status: (code: number) => { json: (body: unknown) => void } }
): vaultPath is string {
  if (typeof vaultPath !== 'string' || !vaultPath.trim()) {
    res.status(400).json({ error: 'vaultPath required' })
    return false
  }
  return true
}

vaultRouter.post('/openVault', (req, res) => {
  const { vaultPath } = req.body as { vaultPath?: string }
  if (!requireVaultPath(vaultPath, res)) return
  try {
    const entries = vault.openVault(vaultPath)
    res.json({ entries })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

vaultRouter.post('/readNote', (req, res) => {
  const { vaultPath, path } = req.body as { vaultPath?: string; path?: string }
  if (!requireVaultPath(vaultPath, res)) return
  if (typeof path !== 'string') return res.status(400).json({ error: 'path required' })
  try {
    res.json({ content: vault.readNote(vaultPath, path) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

vaultRouter.post('/writeNote', (req, res) => {
  const { vaultPath, path, content } = req.body as { vaultPath?: string; path?: string; content?: string }
  if (!requireVaultPath(vaultPath, res)) return
  if (typeof path !== 'string' || typeof content !== 'string') {
    return res.status(400).json({ error: 'path and content required' })
  }
  try {
    res.json({ ok: vault.writeNote(vaultPath, path, content) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

vaultRouter.post('/deleteNote', (req, res) => {
  const { vaultPath, path } = req.body as { vaultPath?: string; path?: string }
  if (!requireVaultPath(vaultPath, res)) return
  if (typeof path !== 'string') return res.status(400).json({ error: 'path required' })
  try {
    res.json({ ok: vault.deleteNote(vaultPath, path) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

vaultRouter.post('/renameNote', (req, res) => {
  const { vaultPath, oldPath, newPath } = req.body as { vaultPath?: string; oldPath?: string; newPath?: string }
  if (!requireVaultPath(vaultPath, res)) return
  if (typeof oldPath !== 'string' || typeof newPath !== 'string') {
    return res.status(400).json({ error: 'oldPath and newPath required' })
  }
  try {
    res.json({ ok: vault.renameNote(vaultPath, oldPath, newPath) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

vaultRouter.post('/createFolder', (req, res) => {
  const { vaultPath, path } = req.body as { vaultPath?: string; path?: string }
  if (!requireVaultPath(vaultPath, res)) return
  if (typeof path !== 'string') return res.status(400).json({ error: 'path required' })
  try {
    res.json({ ok: vault.createFolder(vaultPath, path) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

vaultRouter.post('/deleteFolder', (req, res) => {
  const { vaultPath, path } = req.body as { vaultPath?: string; path?: string }
  if (!requireVaultPath(vaultPath, res)) return
  if (typeof path !== 'string') return res.status(400).json({ error: 'path required' })
  try {
    res.json({ ok: vault.deleteFolder(vaultPath, path) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

vaultRouter.post('/renameFolder', (req, res) => {
  const { vaultPath, oldPath, newPath } = req.body as { vaultPath?: string; oldPath?: string; newPath?: string }
  if (!requireVaultPath(vaultPath, res)) return
  if (typeof oldPath !== 'string' || typeof newPath !== 'string') {
    return res.status(400).json({ error: 'oldPath and newPath required' })
  }
  try {
    res.json({ ok: vault.renameFolder(vaultPath, oldPath, newPath) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

vaultRouter.post('/getDeletedPaths', (req, res) => {
  const { vaultPath } = req.body as { vaultPath?: string }
  if (!requireVaultPath(vaultPath, res)) return
  try {
    res.json({ paths: vault.getDeletedPaths(vaultPath) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

vaultRouter.post('/markDeletedPaths', (req, res) => {
  const { vaultPath, paths } = req.body as { vaultPath?: string; paths?: string[] }
  if (!requireVaultPath(vaultPath, res)) return
  if (!Array.isArray(paths)) return res.status(400).json({ error: 'paths required' })
  try {
    res.json({ ok: vault.markDeletedPaths(vaultPath, paths) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

vaultRouter.post('/clearDeletedPaths', (req, res) => {
  const { vaultPath, paths } = req.body as { vaultPath?: string; paths?: string[] }
  if (!requireVaultPath(vaultPath, res)) return
  if (!Array.isArray(paths)) return res.status(400).json({ error: 'paths required' })
  try {
    res.json({ ok: vault.clearDeletedPaths(vaultPath, paths) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

vaultRouter.post('/unmarkDeletedPath', (req, res) => {
  const { vaultPath, path } = req.body as { vaultPath?: string; path?: string }
  if (!requireVaultPath(vaultPath, res)) return
  if (typeof path !== 'string') return res.status(400).json({ error: 'path required' })
  try {
    res.json({ ok: vault.unmarkDeletedPath(vaultPath, path) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

vaultRouter.post('/readSyncMeta', (req, res) => {
  const { vaultPath } = req.body as { vaultPath?: string }
  if (!requireVaultPath(vaultPath, res)) return
  try {
    res.json({ meta: vault.readSyncMeta(vaultPath) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

vaultRouter.post('/writeSyncMeta', (req, res) => {
  const { vaultPath, meta } = req.body as { vaultPath?: string; meta?: Record<string, number> }
  if (!requireVaultPath(vaultPath, res)) return
  if (!meta || typeof meta !== 'object') return res.status(400).json({ error: 'meta required' })
  try {
    res.json({ ok: vault.writeSyncMeta(vaultPath, meta) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

vaultRouter.post('/getNoteMtime', (req, res) => {
  const { vaultPath, path } = req.body as { vaultPath?: string; path?: string }
  if (!requireVaultPath(vaultPath, res)) return
  if (typeof path !== 'string') return res.status(400).json({ error: 'path required' })
  try {
    res.json({ mtime: vault.getNoteMtime(vaultPath, path) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

vaultRouter.post('/createVault', (req, res) => {
  const { name } = req.body as { name?: string }
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name required' })
  }
  try {
    const vaultPath = vault.createVault(name.trim())
    const cfg = vault.readWebConfig()
    const displayName = name.trim()
    let entry = cfg.vaults.find((v) => v.path === vaultPath)
    if (!entry) {
      entry = { id: vaultPath, name: displayName, path: vaultPath }
      cfg.vaults.push(entry)
    } else {
      entry.name = displayName
    }
    cfg.lastVaultId = entry.id
    vault.writeWebConfig(cfg)
    res.json({ vaultPath })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})
