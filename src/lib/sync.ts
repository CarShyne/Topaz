import { useVaultStore } from '../stores/vaultStore'
import { isCapacitor } from './device'
import { checkServerHealth, normalizeServer, resolveSyncServer, httpPost, parseJson } from './sync-server-url'
import { syncIdForVault } from './vault-sync-id'
import { getNoteSyncMtime, setSyncMtime } from './sync-meta'

async function parseResponse(res: { ok: boolean; status: number; data: string }): Promise<{ error?: string; token?: string; email?: string }> {
  try {
    return parseJson(res.data)
  } catch {
    throw new Error(res.data || `Server returned ${res.status}`)
  }
}

export async function login(
  email: string,
  password: string,
  cachedServer?: string | null,
  pairCode?: string | null,
  computerIp?: string | null
) {
  const base = await resolveSyncServer(cachedServer, pairCode, computerIp)
  const res = await httpPost(`${base}/api/auth/login`, { email: email.trim(), password })
  if (!res.ok && res.status === 0) {
    throw new Error(
      isCapacitor
        ? 'Cannot reach Topaz on your computer. Same Wi‑Fi, firewall port 3921, correct code.'
        : 'Sync is not available. Restart Topaz.'
    )
  }
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(body.error ?? 'Login failed')
  return { ...(body as { token: string; email: string }), server: base }
}

export async function register(email: string, password: string) {
  const base = await resolveSyncServer()
  const res = await httpPost(`${base}/api/auth/register`, { email: email.trim(), password })
  if (!res.ok && res.status === 0) throw new Error('Sync is not available. Restart Topaz.')
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(body.error ?? 'Registration failed')
  return { ...(body as { token: string; email: string }), server: base }
}

export { checkServerHealth, resolveSyncServer }

export async function syncVault(
  vaultPath: string,
  server: string,
  token: string,
  pairCode?: string | null,
  computerIp?: string | null
) {
  const store = useVaultStore.getState()
  store.setSyncStatus('syncing')

  try {
    const base = await resolveSyncServer(server, pairCode, computerIp)
    const reachable = await checkServerHealth(base)
    if (!reachable) {
      store.setSyncStatus('error')
      store.setSyncError('Computer not reachable. Open Topaz and check your code or IP.')
      return
    }

    const deletedPaths = await window.topaz.getDeletedPaths?.().catch(() => []) ?? []
    const deletedSet = new Set(deletedPaths)

    const entries = await window.topaz.openVault(vaultPath)
    const files: { path: string; content: string; mtime: number }[] = []

    for (const e of entries.filter(e => !e.isDir && !deletedSet.has(e.path))) {
      const content = await window.topaz.readNote(e.path)
      if (content !== null) {
        const mtime = await getNoteSyncMtime(vaultPath, e.path)
        files.push({ path: e.path, content, mtime })
      }
    }

    const vaultId = await syncIdForVault(vaultPath)

    const res = await httpPost(
      `${normalizeServer(base)}/api/sync/${vaultId}`,
      { files, deleted: deletedPaths },
      60000,
      { Authorization: `Bearer ${token}` }
    )

    if (!res.ok) throw new Error(`Sync failed (${res.status})`)

    const remote = parseJson<{ files: { path: string; content: string; mtime: number }[] }>(res.data)

    for (const f of remote.files) {
      if (deletedSet.has(f.path)) continue
      const local = await window.topaz.readNote(f.path)
      const localMtime = await getNoteSyncMtime(vaultPath, f.path)
      const remoteMtime = f.mtime ?? 0
      const shouldApply = local === null || (local !== f.content && remoteMtime >= localMtime)

      if (shouldApply) {
        await window.topaz.writeNote(f.path, f.content)
        store.setNoteContent(f.path, f.content)
        await setSyncMtime(vaultPath, f.path, remoteMtime)
      }
    }

    const updated = await window.topaz.openVault(vaultPath)
    store.setEntries(updated.filter(e => e.isDir || !deletedSet.has(e.path)))
    store.setSyncStatus('synced')
    store.setSyncError(null)
    store.setSyncServer(base)
    const cfg = await window.topaz.getConfig()
    cfg.syncServer = base
    await window.topaz.saveConfig(cfg)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync failed'
    console.warn('Sync failed:', msg)
    store.setSyncStatus('error')
    store.setSyncError(msg)
  }
}
