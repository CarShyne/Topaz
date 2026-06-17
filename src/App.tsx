import { useEffect } from 'react'
import { useVaultStore } from './stores/vaultStore'
import { VaultPicker } from './components/VaultPicker'
import { AppShell } from './components/AppShell'
import { CommandPalette } from './components/CommandPalette'
import { QuickSwitcher } from './components/QuickSwitcher'
import { SettingsModal } from './components/SettingsModal'
import { CreateNoteModal } from './components/CreateNoteModal'
import { CreateFolderModal } from './components/CreateFolderModal'
import { RenameItemModal } from './components/RenameItemModal'
import { ExplorerContextMenu } from './components/ExplorerContextMenu'
import { syncVault } from './lib/sync'
import { requestSyncDebounced } from './lib/sync-trigger'
import { isCapacitor, syncUrlForPlatform } from './lib/device'
import { newId } from './lib/id'
import { MobileSplash } from './components/MobileSplash'

export default function App() {
  const vaultPath = useVaultStore(s => s.vaultPath)
  const authToken = useVaultStore(s => s.authToken)
  const syncServer = useVaultStore(s => s.syncServer)

  useEffect(() => {
    window.topaz.getConfig().then(cfg => {
      if (cfg.authToken) {
        const email = cfg.userEmail ?? null
        useVaultStore.getState().setAuth(cfg.authToken, email)
      }
      if (isCapacitor) {
        if (cfg.syncServer) useVaultStore.getState().setSyncServer(cfg.syncServer)
      } else {
        useVaultStore.getState().setSyncServer(syncUrlForPlatform())
      }
      if (cfg.lastVaultId) {
        const vault = cfg.vaults.find(v => v.id === cfg.lastVaultId)
        if (vault) void openVault(vault.path, vault.name).catch(() => {})
      }
    })
  }, [])

  useEffect(() => {
    if (!vaultPath || !authToken) return
    const run = async () => {
      const cfg = await window.topaz.getConfig()
      await syncVault(
        vaultPath,
        syncServer,
        authToken,
        cfg.pairCode,
        cfg.computerIp
      ).catch(() => {})
    }
    run()
    const interval = setInterval(run, 15000)
    const unwatch = window.topaz.onVaultChange(() => requestSyncDebounced(1500))
    return () => {
      clearInterval(interval)
      unwatch()
    }
  }, [vaultPath, authToken, syncServer])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'p' && e.shiftKey) {
        e.preventDefault()
        useVaultStore.getState().setCommandPaletteOpen(true)
      } else if (mod && e.key === 'o') {
        e.preventDefault()
        useVaultStore.getState().setQuickSwitcherOpen(true)
      } else if (mod && e.key === 'n') {
        e.preventDefault()
        useVaultStore.getState().setCreateNoteOpen(true)
      } else if (mod && e.key === ',') {
        e.preventDefault()
        useVaultStore.getState().setSettingsOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      {isCapacitor && <MobileSplash />}
      {vaultPath ? <AppShell /> : <VaultPicker onOpen={openVault} />}
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

async function openVault(path: string, name: string, entries?: import('./stores/vaultStore').VaultEntry[]) {
  const list = entries ?? await window.topaz.openVault(path)
  const store = useVaultStore.getState()
  store.setVault(path, name, list)

  const welcome = list.find(e => !e.isDir && e.path.endsWith('Welcome.md'))
  const firstNote = welcome ?? list.find(e => !e.isDir && e.path.endsWith('.md'))
  if (firstNote && !isCapacitor) {
    store.openTab(firstNote.path, firstNote.name.replace(/\.md$/, ''))
  }

  const cfg = await window.topaz.getConfig()
  const id = cfg.vaults.find(v => v.path === path)?.id ?? newId()
  if (!cfg.vaults.find(v => v.path === path)) {
    cfg.vaults.push({ id, name, path })
  }
  cfg.lastVaultId = id
  await window.topaz.saveConfig(cfg).catch(() => {})
}
