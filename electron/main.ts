import { app, BrowserWindow, dialog, ipcMain, shell, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync, renameSync, rmSync } from 'fs'
import { homedir, networkInterfaces } from 'os'
import chokidar, { type FSWatcher } from 'chokidar'
import { startSyncServer, stopSyncServer, SYNC_PORT } from '../server/sync-server'

let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null
let vaultWatcher: FSWatcher | null = null
let currentVaultPath: string | null = null
let tray: Tray | null = null
let quitting = false

const TOPAZ_DIR = join(homedir(), '.topaz')
const CONFIG_PATH = join(TOPAZ_DIR, 'config.json')

interface TopazConfig {
  vaults: { id: string; name: string; path: string }[]
  lastVaultId?: string
  syncServer?: string
  authToken?: string
  userEmail?: string
  hubMode?: boolean
}

function ensureConfig(): TopazConfig {
  if (!existsSync(TOPAZ_DIR)) mkdirSync(TOPAZ_DIR, { recursive: true })
  if (!existsSync(CONFIG_PATH)) {
    const cfg: TopazConfig = { vaults: [], hubMode: true }
    writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2))
    return cfg
  }
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
}

function saveConfig(cfg: TopazConfig) {
  if (!existsSync(TOPAZ_DIR)) mkdirSync(TOPAZ_DIR, { recursive: true })
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2))
}

function walkDir(dir: string, base = dir): { path: string; name: string; isDir: boolean }[] {
  const entries: { path: string; name: string; isDir: boolean }[] = []
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

function splashPath(...parts: string[]) {
  return join(__dirname, '../../resources', ...parts)
}

function createSplash() {
  const splashHtml = splashPath('splash.html')
  if (!existsSync(splashHtml)) return

  splashWindow = new BrowserWindow({
    width: 720,
    height: 424,
    frame: false,
    transparent: false,
    backgroundColor: '#080808',
    alwaysOnTop: true,
    center: true,
    resizable: false,
    skipTaskbar: true,
    show: false,
    icon: splashPath('icon.png')
  })

  splashWindow.loadFile(splashHtml)
  splashWindow.once('ready-to-show', () => splashWindow?.show())
}

const SPLASH_MIN_MS = 3000

function createWindow() {
  const splashStartedAt = Date.now()
  createSplash()

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0a0a0a',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    const elapsed = Date.now() - splashStartedAt
    const wait = Math.max(0, SPLASH_MIN_MS - elapsed)
    setTimeout(() => {
      if (splashWindow) {
        splashWindow.close()
        splashWindow = null
      }
      mainWindow?.show()
    }, wait)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    vaultWatcher?.close()
  })

  mainWindow.on('close', (e) => {
    if (!quitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })
}

function createTray() {
  const iconPath = splashPath('icon.png')
  if (!existsSync(iconPath)) return

  const icon = nativeImage.createFromPath(iconPath)
  const trayIcon = process.platform === 'darwin'
    ? icon.resize({ width: 18, height: 18 })
    : icon.resize({ width: 16, height: 16 })

  tray = new Tray(trayIcon)
  tray.setToolTip('Topaz — sync active')
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Open Topaz',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        } else {
          createWindow()
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Topaz',
      click: () => {
        quitting = true
        app.quit()
      }
    }
  ]))
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.focus()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })
}

app.whenReady().then(async () => {
  if (process.platform === 'darwin') {
    const dockIconPath = splashPath('icon.png')
    if (existsSync(dockIconPath)) {
      app.dock.setIcon(nativeImage.createFromPath(dockIconPath))
    }
  }
  try {
    if (ensureConfig().hubMode !== false) {
      await startSyncServer()
    }
    createTray()
  } catch (err) {
    console.error('Failed to start sync server:', err)
  }
  createWindow()
})

app.on('before-quit', () => {
  quitting = true
  stopSyncServer()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running in tray on Windows/Linux
  }
})
app.on('activate', () => { if (!mainWindow) createWindow() })

ipcMain.handle('get-config', () => ensureConfig())

ipcMain.handle('get-hub-mode', () => ensureConfig().hubMode !== false)

ipcMain.handle('set-hub-mode', async (_e, enabled: boolean) => {
  const cfg = ensureConfig()
  cfg.hubMode = enabled
  saveConfig(cfg)
  try {
    if (enabled) {
      await startSyncServer()
    } else {
      stopSyncServer()
    }
  } catch (err) {
    console.error('Failed to toggle sync server:', err)
  }
  return { enabled: cfg.hubMode !== false, port: SYNC_PORT }
})

ipcMain.handle('get-lan-ips', () => {
  const ips: string[] = []
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === 'IPv4' && !a.internal) ips.push(a.address)
    }
  }
  return ips
})

ipcMain.handle('save-config', (_e, cfg: TopazConfig) => {
  saveConfig(cfg)
  return true
})

ipcMain.handle('pick-vault-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('create-vault', async (_e, name: string) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Choose location for new vault'
  })
  if (result.canceled) return null
  const vaultPath = join(result.filePaths[0], name)
  if (!existsSync(vaultPath)) mkdirSync(vaultPath, { recursive: true })
  const topazDir = join(vaultPath, '.topaz')
  if (!existsSync(topazDir)) mkdirSync(topazDir, { recursive: true })
  const generalDir = join(vaultPath, 'General')
  if (!existsSync(generalDir)) mkdirSync(generalDir, { recursive: true })
  const welcome = join(generalDir, 'Welcome.md')
  if (!existsSync(welcome)) {
    writeFileSync(welcome, `# Welcome to Topaz\n\nNext Level Notes.\n\n## Getting started\n\n- **Projects** are folders — create them in the file sidebar\n- **Notes** live inside projects\n- Link notes with \`[[double brackets]]\`\n- Sign in under Settings to sync — always free\n`)
  }
  return vaultPath
})

ipcMain.handle('open-vault', async (_e, vaultPath: string) => {
  currentVaultPath = vaultPath
  vaultWatcher?.close()
  vaultWatcher = chokidar.watch(vaultPath, {
    ignored: /(^|[/\\])\../,
    persistent: true,
    ignoreInitial: true
  })
  vaultWatcher.on('all', (event: string, filePath: string) => {
    mainWindow?.webContents.send('vault-change', { event, filePath: filePath.slice(vaultPath.length + 1) })
  })
  return walkDir(vaultPath)
})

ipcMain.handle('read-note', (_e, relPath: string) => {
  if (!currentVaultPath) return null
  const full = join(currentVaultPath, relPath)
  if (!existsSync(full)) return null
  return readFileSync(full, 'utf-8')
})

ipcMain.handle('write-note', (_e, relPath: string, content: string) => {
  if (!currentVaultPath) return false
  const full = join(currentVaultPath, relPath)
  const dir = join(full, '..')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(full, content, 'utf-8')
  return true
})

ipcMain.handle('delete-note', (_e, relPath: string) => {
  if (!currentVaultPath) return false
  const full = join(currentVaultPath, relPath)
  if (existsSync(full)) unlinkSync(full)
  return true
})

ipcMain.handle('rename-note', (_e, oldPath: string, newPath: string) => {
  if (!currentVaultPath) return false
  const oldFull = join(currentVaultPath, oldPath)
  const newFull = join(currentVaultPath, newPath)
  const dir = join(newFull, '..')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  renameSync(oldFull, newFull)
  return true
})

ipcMain.handle('create-folder', (_e, relPath: string) => {
  if (!currentVaultPath) return false
  const full = join(currentVaultPath, relPath)
  if (!existsSync(full)) mkdirSync(full, { recursive: true })
  return true
})

ipcMain.handle('delete-folder', (_e, relPath: string) => {
  if (!currentVaultPath) return false
  const full = join(currentVaultPath, relPath)
  if (existsSync(full)) rmSync(full, { recursive: true, force: true })
  return true
})

ipcMain.handle('rename-folder', (_e, oldPath: string, newPath: string) => {
  if (!currentVaultPath) return false
  const oldFull = join(currentVaultPath, oldPath)
  const newFull = join(currentVaultPath, newPath)
  const dir = join(newFull, '..')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  if (existsSync(oldFull)) renameSync(oldFull, newFull)
  return true
})

ipcMain.handle('get-vault-path', () => currentVaultPath)

ipcMain.handle('open-external', (_e, url: string) => shell.openExternal(url))

ipcMain.handle('read-vault-workspace', (_e, vaultPath: string) => {
  const ws = join(vaultPath, '.topaz', 'workspace.json')
  if (!existsSync(ws)) return null
  return JSON.parse(readFileSync(ws, 'utf-8'))
})

ipcMain.handle('write-vault-workspace', (_e, vaultPath: string, data: unknown) => {
  const dir = join(vaultPath, '.topaz')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'workspace.json'), JSON.stringify(data, null, 2))
  return true
})

function syncMetaPath(vaultPath: string) {
  return join(vaultPath, '.topaz', 'sync-meta.json')
}

function readSyncMetaFile(vaultPath: string): Record<string, number> {
  const file = syncMetaPath(vaultPath)
  if (!existsSync(file)) return {}
  try { return JSON.parse(readFileSync(file, 'utf-8')) as Record<string, number> } catch { return {} }
}

function writeSyncMetaFile(vaultPath: string, meta: Record<string, number>) {
  const dir = join(vaultPath, '.topaz')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(syncMetaPath(vaultPath), JSON.stringify(meta, null, 2))
}

ipcMain.handle('read-sync-meta', (_e, vaultPath: string) => readSyncMetaFile(vaultPath))

ipcMain.handle('write-sync-meta', (_e, vaultPath: string, meta: Record<string, number>) => {
  writeSyncMetaFile(vaultPath, meta)
  return true
})

ipcMain.handle('get-note-mtime', (_e, vaultPath: string, relPath: string) => {
  const meta = readSyncMetaFile(vaultPath)
  const full = join(vaultPath, relPath)
  const fsMtime = existsSync(full) ? statSync(full).mtimeMs : 0
  return Math.max(meta[relPath] ?? 0, fsMtime)
})

function deletedPathsFile() {
  return join(currentVaultPath!, '.topaz', 'deleted.json')
}

function readDeletedPaths(): string[] {
  if (!currentVaultPath) return []
  const f = deletedPathsFile()
  if (!existsSync(f)) return []
  try { return JSON.parse(readFileSync(f, 'utf-8')) as string[] } catch { return [] }
}

function writeDeletedPaths(paths: string[]) {
  if (!currentVaultPath) return
  const dir = join(currentVaultPath, '.topaz')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(deletedPathsFile(), JSON.stringify([...new Set(paths)], null, 2))
}

ipcMain.handle('get-deleted-paths', () => readDeletedPaths())

ipcMain.handle('mark-deleted-paths', (_e, paths: string[]) => {
  writeDeletedPaths([...readDeletedPaths(), ...paths])
  return true
})

ipcMain.handle('clear-deleted-paths', (_e, paths: string[]) => {
  const remove = new Set(paths)
  writeDeletedPaths(readDeletedPaths().filter(p => !remove.has(p)))
  return true
})

ipcMain.handle('unmark-deleted-path', (_e, path: string) => {
  writeDeletedPaths(readDeletedPaths().filter(p => p !== path))
  return true
})
