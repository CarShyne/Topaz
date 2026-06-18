import { useGemStore } from '../stores/gemStore'
import { syncGem } from './sync'

let timer: ReturnType<typeof setTimeout> | null = null

export function requestSyncDebounced(delayMs = 2000) {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    const { gemPath, authToken, syncServer } = useGemStore.getState()
    if (!gemPath || !authToken) return
    void window.topaz.getConfig().then(cfg => {
      void syncGem(gemPath, syncServer, authToken, cfg.pairCode, cfg.computerIp)
    })
  }, delayMs)
}
