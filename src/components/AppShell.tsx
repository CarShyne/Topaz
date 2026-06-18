import { useGemStore } from '../stores/gemStore'
import styles from './AppShell.module.css'
import { Ribbon } from './Ribbon'
import { LeftSidebar } from './LeftSidebar'
import { Workspace } from './Workspace'
import { NoteInfoPanel } from './NoteInfoPanel'
import { StatusBar } from './StatusBar'
import { AppHeader } from './AppHeader'

export function AppShell() {
  const leftOpen = useGemStore(s => s.leftSidebarOpen)
  const rightOpen = useGemStore(s => s.rightSidebarOpen)

  return (
    <div className={styles.shell}>
      <AppHeader />
      <div className={styles.body}>
        <Ribbon />
        {leftOpen && <LeftSidebar />}
        <Workspace />
        {rightOpen && <NoteInfoPanel onClose={() => useGemStore.getState().toggleRightSidebar()} />}
      </div>
      <StatusBar />
    </div>
  )
}
