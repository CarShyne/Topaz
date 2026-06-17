import { useVaultStore } from '../stores/vaultStore'
import { syncVault } from './sync'

let timer: ReturnType<typeof setTimeout> | null = null

export function requestSyncDebounced(delayMs = 2000) {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    const { vaultPath, authToken, syncServer } = useVaultStore.getState()
    if (!vaultPath || !authToken) return
    void window.topaz.getConfig().then(cfg => {
      void syncVault(vaultPath, syncServer, authToken, cfg.pairCode, cfg.computerIp)
    })
  }, delayMs)
}
