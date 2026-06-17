import express from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import type { Server } from 'http'
import { Bonjour } from 'bonjour-service'
import { createSyncApp } from './sync-server'
import { vaultRouter } from './vault-routes'
import { ensureDataDirs } from './vault-fs'

export const PORT = Number(process.env.PORT ?? 3921)
const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..', 'dist-web')

let hubEnabled = process.env.TOPAZ_HUB !== 'false'
let bonjour: Bonjour | null = null
let httpServer: Server | null = null

export function isHubEnabled(): boolean {
  return hubEnabled
}

function bonjourAllowed(): boolean {
  if (process.env.TOPAZ_NO_BONJOUR === 'true') return false
  return process.env.TOPAZ_BONJOUR === 'true'
}

function setHubPublishing(enabled: boolean) {
  if (!bonjourAllowed()) return

  if (enabled) {
    try {
      if (!bonjour) bonjour = new Bonjour()
      bonjour.unpublishAll()
      bonjour.publish({ name: 'topaz-sync', type: 'topaz-sync', port: PORT })
    } catch {
      // Bonjour is optional — sync still works on localhost / LAN IP
    }
    return
  }

  bonjour?.unpublishAll()
  bonjour?.destroy()
  bonjour = null
}

export function createHubApp(): express.Application {
  ensureDataDirs()

  const app = express()
  app.use(express.json({ limit: '50mb' }))
  app.use('/api/vault', vaultRouter)
  app.use(createSyncApp())

  app.get('/api/hub', (_req, res) => {
    res.json({ enabled: hubEnabled, port: PORT })
  })

  app.post('/api/hub', (req, res) => {
    const { enabled } = req.body as { enabled?: boolean }
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled (boolean) required' })
    }
    hubEnabled = enabled
    setHubPublishing(hubEnabled)
    res.json({ enabled: hubEnabled, port: PORT })
  })

  if (existsSync(WEB_ROOT)) {
    app.use(express.static(WEB_ROOT))
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(join(WEB_ROOT, 'index.html'))
    })
  }

  return app
}

export function startHubServer(): Promise<void> {
  if (httpServer) return Promise.resolve()

  const app = createHubApp()
  return new Promise((resolve, reject) => {
    httpServer = app.listen(PORT, '0.0.0.0', () => {
      if (hubEnabled && bonjourAllowed()) setHubPublishing(true)
      console.log(`Topaz hub listening on 0.0.0.0:${PORT} (hub publishing ${hubEnabled ? 'on' : 'off'})`)
      resolve()
    })
    httpServer.on('error', reject)
  })
}

export function stopHubServer() {
  setHubPublishing(false)
  if (httpServer) {
    httpServer.close()
    httpServer = null
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)

if (isMain) {
  startHubServer().catch(err => {
    console.error('Failed to start Topaz hub:', err)
    process.exit(1)
  })
}
