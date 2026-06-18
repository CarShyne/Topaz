import { resolveSyncServer, httpGet, parseJson } from './sync-server-url'
import { useGemStore } from '../stores/gemStore'
import { sha256Hex } from './hash'

/** Same account + gem name → same sync bucket on every device. */
export async function deriveSyncGemId(email: string, gemName: string): Promise<string> {
  const raw = `${email.trim().toLowerCase()}::${gemName.trim().toLowerCase()}`
  const hash = sha256Hex(raw)
  return hash.slice(0, 32)
}

export async function getGemSyncId(gemPath: string): Promise<string> {
  const cfg = await window.topaz.getConfig()
  const entry = cfg.gems.find(v => v.path === gemPath)
  return entry?.id ?? gemPath.replace(/[^a-zA-Z0-9-]/g, '')
}

/** Legacy: adopt remote gem id if exactly one exists on the account. */
export async function adoptRemoteGemId(gemPath: string, token: string, server: string): Promise<string> {
  const cfg = await window.topaz.getConfig()
  const entry = cfg.gems.find(v => v.path === gemPath)
  if (!entry) return getGemSyncId(gemPath)

  try {
    const base = await resolveSyncServer(server)
    const res = await httpGet(`${base}/api/gems`, 5000, { Authorization: `Bearer ${token}` })
    if (!res.ok) return entry.id

    const body = parseJson<{ gemIds?: string[]; vaultIds?: string[] }>(res.data)
    const gemIds = body.gemIds ?? body.vaultIds ?? []
    if (gemIds.length === 1 && gemIds[0] !== entry.id) {
      entry.id = gemIds[0]
      await window.topaz.saveConfig(cfg)
      return gemIds[0]
    }
  } catch {
    // offline
  }

  return entry.id
}

export async function syncIdForGem(gemPath: string): Promise<string> {
  const cfg = await window.topaz.getConfig()
  const entry = cfg.gems.find(v => v.path === gemPath)
  const { authToken, userEmail, syncServer, gemName } = useGemStore.getState()
  const name = entry?.name ?? gemName

  if (userEmail && name) {
    return deriveSyncGemId(userEmail, name)
  }
  if (authToken && entry) {
    return adoptRemoteGemId(gemPath, authToken, syncServer)
  }
  return getGemSyncId(gemPath)
}
