import { useEffect } from 'react'
import { useGemStore } from './stores/gemStore'
import { GemPicker } from './components/GemPicker'
import { AppShell } from './components/AppShell'
import { CommandPalette } from './components/CommandPalette'
import { QuickSwitcher } from './components/QuickSwitcher'
import { SettingsModal } from './components/SettingsModal'
import { CreateNoteModal } from './components/CreateNoteModal'
import { CreateFolderModal } from './components/CreateFolderModal'
import { RenameItemModal } from './components/RenameItemModal'
import { ExplorerContextMenu } from './components/ExplorerContextMenu'
import { syncGem } from './lib/sync'
import { requestSyncDebounced } from './lib/sync-trigger'
import { isCapacitor, isWeb, syncUrlForPlatform } from './lib/device'
import { newId } from './lib/id'
import { MobileSplash } from './components/MobileSplash'

export default function App() {
  const gemPath = useGemStore(s => s.gemPath)
  const authToken = useGemStore(s => s.authToken)
  const syncServer = useGemStore(s => s.syncServer)

  useEffect(() => {
    window.topaz.getConfig().then(cfg => {
      if (cfg.authToken) {
        const email = cfg.userEmail ?? null
        useGemStore.getState().setAuth(cfg.authToken, email)
      }
      if (isCapacitor) {
        if (cfg.syncServer) useGemStore.getState().setSyncServer(cfg.syncServer)
      } else if (cfg.syncRole === 'client' && cfg.syncServer) {
        useGemStore.getState().setSyncServer(cfg.syncServer)
      } else {
        useGemStore.getState().setSyncServer(syncUrlForPlatform())
      }
      if (cfg.lastGemId) {
        const gem = cfg.gems.find(v => v.id === cfg.lastGemId)
        if (gem) void openGem(gem.path, gem.name).catch(() => {})
      }
    })
  }, [])

  useEffect(() => {
    if (!gemPath || !authToken) return
    const run = async () => {
      const cfg = await window.topaz.getConfig()
      await syncGem(
        gemPath,
        syncServer,
        authToken,
        cfg.pairCode,
        cfg.computerIp
      ).catch(() => {})
    }
    run()
    const interval = setInterval(run, 15000)
    const unwatch = window.topaz.onGemChange(() => requestSyncDebounced(1500))
    return () => {
      clearInterval(interval)
      unwatch()
    }
  }, [gemPath, authToken, syncServer])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'p' && e.shiftKey) {
        e.preventDefault()
        useGemStore.getState().setCommandPaletteOpen(true)
      } else if (mod && e.key === 'o') {
        e.preventDefault()
        useGemStore.getState().setQuickSwitcherOpen(true)
      } else if (mod && e.key === 'n') {
        e.preventDefault()
        useGemStore.getState().setCreateNoteOpen(true)
      } else if (mod && e.key === ',') {
        e.preventDefault()
        useGemStore.getState().setSettingsOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      {isCapacitor && <MobileSplash />}
      {gemPath ? <AppShell /> : <GemPicker onOpen={openGem} />}
      <CommandPalette />
      <QuickSwitcher />
      <SettingsModal />
      <CreateNoteModal />
      <CreateFolderModal />
      <RenameItemModal />
      <ExplorerContextMenu />
    </>
  )
}

async function openGem(path: string, name: string, entries?: import('./stores/gemStore').GemEntry[]) {
  const list = entries ?? await window.topaz.openGem(path)
  const store = useGemStore.getState()
  store.setGem(path, name, list)

  const welcome = list.find(e => !e.isDir && e.path.endsWith('Welcome.md'))
  const firstNote = welcome ?? list.find(e => !e.isDir && e.path.endsWith('.md'))
  if (firstNote && !isCapacitor) {
    store.openTab(firstNote.path, firstNote.name.replace(/\.md$/, ''))
  }

  const cfg = await window.topaz.getConfig()
  const id = cfg.gems.find(v => v.path === path)?.id ?? newId()
  if (!cfg.gems.find(v => v.path === path)) {
    cfg.gems.push({ id, name, path })
  }
  cfg.lastGemId = id
  await window.topaz.saveConfig(cfg).catch(() => {})
}
