export type SyncMeta = Record<string, number>

export async function readSyncMeta(vaultPath: string): Promise<SyncMeta> {
  const meta = await window.topaz.readSyncMeta(vaultPath)
  return meta ?? {}
}

export async function writeSyncMeta(vaultPath: string, meta: SyncMeta): Promise<void> {
  await window.topaz.writeSyncMeta(vaultPath, meta)
}

export async function bumpSyncMtime(vaultPath: string, relPath: string, mtime = Date.now()): Promise<void> {
  const meta = await readSyncMeta(vaultPath)
  meta[relPath] = mtime
  await writeSyncMeta(vaultPath, meta)
}

export async function getNoteSyncMtime(vaultPath: string, relPath: string): Promise<number> {
  return window.topaz.getNoteMtime(vaultPath, relPath)
}

export async function setSyncMtime(vaultPath: string, relPath: string, mtime: number): Promise<void> {
  const meta = await readSyncMeta(vaultPath)
  meta[relPath] = mtime
  await writeSyncMeta(vaultPath, meta)
}
