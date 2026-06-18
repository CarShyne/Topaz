import { resolveSyncServer, httpGet, parseJson } from './sync-server-url'
import { useVaultStore } from '../stores/vaultStore'

/** Same account + vault name → same sync bucket on every device. */
export async function deriveSyncVaultId(email: string, vaultName: string): Promise<string> {
  const raw = `${email.trim().toLowerCase()}::${vaultName.trim().toLowerCase()}`
  const data = new TextEncoder().encode(raw)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash).slice(0, 16))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function getVaultSyncId(vaultPath: string): Promise<string> {
  const cfg = await window.topaz.getConfig()
  const entry = cfg.vaults.find(v => v.path === vaultPath)
  return entry?.id ?? vaultPath.replace(/[^a-zA-Z0-9-]/g, '')
}

/** Legacy: adopt remote vault id if exactly one exists on the account. */
export async function adoptRemoteVaultId(vaultPath: string, token: string, server: string): Promise<string> {
  const cfg = await window.topaz.getConfig()
  const entry = cfg.vaults.find(v => v.path === vaultPath)
  if (!entry) return getVaultSyncId(vaultPath)

  try {
    const base = await resolveSyncServer(server)
    const res = await httpGet(`${base}/api/vaults`, 5000, { Authorization: `Bearer ${token}` })
    if (!res.ok) return entry.id

    const { vaultIds } = parseJson<{ vaultIds: string[] }>(res.data)
    if (vaultIds.length === 1 && vaultIds[0] !== entry.id) {
      entry.id = vaultIds[0]
      await window.topaz.saveConfig(cfg)
      return vaultIds[0]
    }
  } catch {
    // offline
  }

  return entry.id
}

export async function syncIdForVault(vaultPath: string): Promise<string> {
  const cfg = await window.topaz.getConfig()
  const entry = cfg.vaults.find(v => v.path === vaultPath)
  const { authToken, userEmail, syncServer, vaultName } = useVaultStore.getState()
  const name = entry?.name ?? vaultName

  if (userEmail && name) {
    return deriveSyncVaultId(userEmail, name)
  }
  if (authToken && entry) {
    return adoptRemoteVaultId(vaultPath, authToken, syncServer)
  }
  return getVaultSyncId(vaultPath)
}
