export type SyncMeta = Record<string, number>

export async function readSyncMeta(gemPath: string): Promise<SyncMeta> {
  const meta = await window.topaz.readSyncMeta(gemPath)
  return meta ?? {}
}

export async function writeSyncMeta(gemPath: string, meta: SyncMeta): Promise<void> {
  await window.topaz.writeSyncMeta(gemPath, meta)
}

export async function bumpSyncMtime(gemPath: string, relPath: string, mtime = Date.now()): Promise<void> {
  const meta = await readSyncMeta(gemPath)
  meta[relPath] = mtime
  await writeSyncMeta(gemPath, meta)
}

export async function getNoteSyncMtime(gemPath: string, relPath: string): Promise<number> {
  return window.topaz.getNoteMtime(gemPath, relPath)
}

export async function setSyncMtime(gemPath: string, relPath: string, mtime: number): Promise<void> {
  const meta = await readSyncMeta(gemPath)
  meta[relPath] = mtime
  await writeSyncMeta(gemPath, meta)
}
