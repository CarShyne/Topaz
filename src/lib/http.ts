import { Capacitor, CapacitorHttp } from '@capacitor/core'

export interface HttpResult {
  ok: boolean
  status: number
  data: string
}

function useNativeHttp(): boolean {
  return Capacitor.isNativePlatform()
}

export async function httpGet(url: string, timeoutMs = 2500, headers: Record<string, string> = {}): Promise<HttpResult> {
  if (useNativeHttp()) {
    try {
      const res = await CapacitorHttp.get({
        url,
        headers: { Accept: 'application/json', ...headers },
        connectTimeout: timeoutMs,
        readTimeout: timeoutMs,
      })
      const data = typeof res.data === 'string' ? res.data : JSON.stringify(res.data ?? '')
      return { ok: res.status >= 200 && res.status < 300, status: res.status, data }
    } catch {
      return { ok: false, status: 0, data: '' }
    }
  }

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(url, { method: 'GET', signal: ctrl.signal, headers: { Accept: 'application/json', ...headers } })
    clearTimeout(timer)
    return { ok: res.ok, status: res.status, data: await res.text() }
  } catch {
    return { ok: false, status: 0, data: '' }
  }
}

export async function httpPost(
  url: string,
  body: unknown,
  timeoutMs = 10000,
  headers: Record<string, string> = {}
): Promise<HttpResult> {
  const json = JSON.stringify(body)
  if (useNativeHttp()) {
    try {
      const res = await CapacitorHttp.post({
        url,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
        data: body,
        connectTimeout: timeoutMs,
        readTimeout: timeoutMs,
      })
      const data = typeof res.data === 'string' ? res.data : JSON.stringify(res.data ?? '')
      return { ok: res.status >= 200 && res.status < 300, status: res.status, data }
    } catch {
      return { ok: false, status: 0, data: '' }
    }
  }

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
      body: json,
    })
    clearTimeout(timer)
    return { ok: res.ok, status: res.status, data: await res.text() }
  } catch {
    return { ok: false, status: 0, data: '' }
  }
}

export function parseJson<T>(data: string): T {
  try {
    return JSON.parse(data) as T
  } catch {
    throw new Error(data || 'Invalid response')
  }
}
