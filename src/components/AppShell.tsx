import { useVaultStore } from '../stores/vaultStore'
import styles from './AppShell.module.css'
import { Ribbon } from './Ribbon'
import { LeftSidebar } from './LeftSidebar'
import { Workspace } from './Workspace'
import { NoteInfoPanel } from './NoteInfoPanel'
import { StatusBar } from './StatusBar'
import { AppHeader } from './AppHeader'

export function AppShell() {
  const leftOpen = useVaultStore(s => s.leftSidebarOpen)
  const rightOpen = useVaultStore(s => s.rightSidebarOpen)

  return (
    <div className={styles.shell}>
      <AppHeader />
      <div className={styles.body}>
        <Ribbon />
        {leftOpen && <LeftSidebar />}
        <Workspace />
        {rightOpen && <NoteInfoPanel onClose={() => useVaultStore.getState().toggleRightSidebar()} />}
      </div>
      <StatusBar />
    </div>
  )
}
