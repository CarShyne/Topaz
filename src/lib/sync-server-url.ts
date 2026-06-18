import { isCapacitor, isWeb } from './device'
import { httpGet, httpPost, parseJson } from './http'

export const DESKTOP_SYNC_URL = 'http://127.0.0.1:3921'
export const SYNC_PORT = 3921

const MDNS_CANDIDATES = [
  'http://topaz-sync.local:3921',
  'http://Topaz.local:3921',
  'http://topaz.local:3921',
]

const COMMON_SUBNETS = [
  '192.168.1', '192.168.0', '192.168.2', '192.168.4', '192.168.50',
  '192.168.68', '192.168.86', '192.168.100', '10.0.0', '10.0.1', '172.16.0', '172.20.10',
]

const PAIR_TIMEOUT_MS = isCapacitor ? 4500 : 2000
const HEALTH_TIMEOUT_MS = isCapacitor ? 4000 : 2500
const SCAN_BATCH_SIZE = isCapacitor ? 8 : 25

export function normalizeServer(server: string): string {
  return server.trim().replace(/\/+$/, '')
}

export function hostToSyncUrl(host: string): string {
  const h = host.trim().replace(/^https?:\/\//, '').split(':')[0].split('/')[0]
  return `http://${h}:${SYNC_PORT}`
}

function subnetFromIp(ip: string): string | null {
  const parts = ip.trim().split('.')
  if (parts.length !== 4) return null
  return `${parts[0]}.${parts[1]}.${parts[2]}`
}

export async function checkServerHealth(server: string, timeoutMs = HEALTH_TIMEOUT_MS): Promise<boolean> {
  const res = await httpGet(`${normalizeServer(server)}/api/health`, timeoutMs)
  return res.ok
}

async function checkPairCode(server: string, code: string, timeoutMs = PAIR_TIMEOUT_MS): Promise<boolean> {
  const res = await httpGet(`${normalizeServer(server)}/api/pair/${encodeURIComponent(code)}`, timeoutMs)
  return res.ok
}

async function scanSubnetForPair(subnet: string, code: string): Promise<string | null> {
  const priority = [1, 2, 10, 20, 50, 100, 101, 102, 103, 104, 105, 254]
  const hosts = [...new Set([...priority, ...Array.from({ length: 253 }, (_, i) => i + 1)])]

  for (let i = 0; i < hosts.length; i += SCAN_BATCH_SIZE) {
    const batch = hosts.slice(i, i + SCAN_BATCH_SIZE)
    const jobs = batch.map(host => {
      const url = `http://${subnet}.${host}:${SYNC_PORT}`
      return checkPairCode(url, code, PAIR_TIMEOUT_MS).then(ok => (ok ? url : null))
    })
    const hits = await Promise.all(jobs)
    const found = hits.find(Boolean)
    if (found) return found
  }
  return null
}

async function findServerByPairCode(code: string, computerIp?: string | null): Promise<string | null> {
  const trimmed = code.trim()
  if (!/^\d{6}$/.test(trimmed)) return null

  if (computerIp?.trim()) {
    const direct = hostToSyncUrl(computerIp)
    if (await checkPairCode(direct, trimmed)) return direct
  }

  for (const url of MDNS_CANDIDATES) {
    if (await checkPairCode(url, trimmed)) return url
  }

  const subnets: string[] = []
  if (computerIp?.trim()) {
    const fromIp = subnetFromIp(computerIp)
    if (fromIp) subnets.push(fromIp)
  }
  for (const subnet of COMMON_SUBNETS) {
    if (!subnets.includes(subnet)) subnets.push(subnet)
  }

  for (const subnet of subnets) {
    const found = await scanSubnetForPair(subnet, trimmed)
    if (found) return found
  }
  return null
}

async function discoverOnLan(): Promise<string | null> {
  for (const url of MDNS_CANDIDATES) {
    if (await checkServerHealth(url)) return url
  }
  for (const subnet of COMMON_SUBNETS) {
    for (let start = 1; start < 255; start += SCAN_BATCH_SIZE) {
      const jobs: Promise<string | null>[] = []
      for (let host = start; host < Math.min(start + SCAN_BATCH_SIZE, 255); host++) {
        const url = `http://${subnet}.${host}:${SYNC_PORT}`
        jobs.push(checkServerHealth(url, 1500).then(ok => (ok ? url : null)))
      }
      const hits = await Promise.all(jobs)
      const found = hits.find(Boolean)
      if (found) return found
    }
  }
  return null
}

function desktopSyncUrl(): string {
  return isWeb ? window.location.origin : DESKTOP_SYNC_URL
}

async function resolveClientSyncServer(
  cachedUrl?: string | null,
  pairCode?: string | null,
  computerIp?: string | null
): Promise<string> {
  if (cachedUrl && await checkServerHealth(cachedUrl)) {
    return normalizeServer(cachedUrl)
  }
  if (computerIp?.trim()) {
    const direct = hostToSyncUrl(computerIp)
    if (pairCode && await checkPairCode(direct, pairCode.trim())) return direct
    if (await checkServerHealth(direct)) return direct
  }
  if (pairCode) {
    const paired = await findServerByPairCode(pairCode, computerIp)
    if (paired) return paired
  }
  if (cachedUrl) return normalizeServer(cachedUrl)
  throw new Error('Enter your Topaz server address or 6-digit pairing code in Settings.')
}

export async function resolveSyncServer(
  cachedUrl?: string | null,
  pairCode?: string | null,
  computerIp?: string | null
): Promise<string> {
  if (!isCapacitor) {
    let role: 'server' | 'client' = 'server'
    try {
      const cfg = await window.topaz.getConfig()
      role = cfg.syncRole === 'client' ? 'client' : 'server'
      cachedUrl = cachedUrl ?? cfg.syncServer ?? null
      pairCode = pairCode ?? cfg.pairCode ?? null
      computerIp = computerIp ?? cfg.computerIp ?? null
    } catch {
      // no platform
    }

    if (role === 'client') {
      return resolveClientSyncServer(cachedUrl, pairCode, computerIp)
    }

    if (isWeb) return window.location.origin
    return DESKTOP_SYNC_URL
  }

  if (cachedUrl && await checkServerHealth(cachedUrl)) {
    return normalizeServer(cachedUrl)
  }

  if (computerIp?.trim()) {
    const direct = hostToSyncUrl(computerIp)
    if (pairCode && await checkPairCode(direct, pairCode.trim())) return direct
    if (await checkServerHealth(direct)) return direct
  }

  if (pairCode) {
    const paired = await findServerByPairCode(pairCode, computerIp)
    if (paired) return paired
  }

  const discovered = await discoverOnLan()
  if (discovered) return discovered

  if (!pairCode) {
    throw new Error('Enter the 6-digit code from your computer (Settings → Sync).')
  }

  throw new Error(
    'Could not reach your computer. Check the code, same Wi‑Fi, firewall port 3921, or enter your computer\'s IP below.'
  )
}

export async function createDesktopPairCode(): Promise<string> {
  const res = await httpPost(`${desktopSyncUrl()}/api/pair/new`, {})
  if (!res.ok) throw new Error('Sync server not running')
  const body = parseJson<{ code: string }>(res.data)
  return body.code
}

/** Reuse active code on desktop — only mint a new one when missing or expiring. */
export async function ensureDesktopPairCode(): Promise<string> {
  const current = await httpGet(`${desktopSyncUrl()}/api/pair/current`, 3000)
  if (current.ok) {
    const body = parseJson<{ code: string; expiresIn: number }>(current.data)
    if (body.expiresIn > 120) return body.code
  }
  return createDesktopPairCode()
}

export { httpGet, httpPost, parseJson }
