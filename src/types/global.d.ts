declare global {
  interface Window {
    topaz: import('../lib/platform').TopazAPI
  }
}

export {}
