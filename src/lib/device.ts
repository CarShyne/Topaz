export const isCapacitor = import.meta.env.VITE_PLATFORM === 'capacitor'
export const isWeb = import.meta.env.VITE_PLATFORM === 'web'

export function isTablet(): boolean {
  if (typeof window === 'undefined') return false
  return Math.min(window.innerWidth, window.innerHeight) >= 600
}

export function deviceKind(): 'phone' | 'tablet' {
  return isTablet() ? 'tablet' : 'phone'
}

export function syncUrlForPlatform(): string {
  if (typeof window !== 'undefined' && isWeb) return window.location.origin
  if (isCapacitor) return ''
  return 'http://127.0.0.1:3921'
}
