import { useEffect } from 'react'
import { useVaultStore } from '../stores/vaultStore'
import { deleteNote, deleteFolder } from '../lib/notes'
import styles from './ExplorerContextMenu.module.css'

export function ExplorerContextMenu() {
  const menu = useVaultStore(s => s.explorerMenu)
  const setMenu = useVaultStore(s => s.setExplorerMenu)
  const setRenameTarget = useVaultStore(s => s.setRenameTarget)
  const setCreateNoteOpen = useVaultStore(s => s.setCreateNoteOpen)
  const setSelectedFolder = useVaultStore(s => s.setSelectedFolder)
  const openTab = useVaultStore(s => s.openTab)

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [menu, setMenu])

  if (!menu) return null

  const run = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenu(null)
    fn()
  }

  const onDelete = async () => {
    const msg = menu.isDir
      ? `Delete project "${menu.label}" and all notes inside?`
      : `Delete note "${menu.label}"?`
    if (!confirm(msg)) return
    if (menu.isDir) await deleteFolder(menu.path)
    else await deleteNote(menu.path)
  }

  return (
    <div
      className={styles.menu}
      style={{ left: menu.x, top: menu.y }}
      onClick={e => e.stopPropagation()}
      onContextMenu={e => e.preventDefault()}
    >
      {!menu.isDir && (
        <button onClick={run(() => openTab(menu.path))}>Open</button>
      )}
      {menu.isDir && (
        <button onClick={run(() => { setSelectedFolder(menu.path); setCreateNoteOpen(true) })}>
          New note in project
        </button>
      )}
      <button onClick={run(() => setRenameTarget({ path: menu.path, isDir: menu.isDir }))}>
        Rename
      </button>
      <button className={styles.danger} onClick={run(onDelete)}>Delete</button>
    </div>
  )
}

export function openExplorerMenu(
  e: React.MouseEvent,
  item: { path: string; isDir: boolean; label: string }
) {
  e.preventDefault()
  e.stopPropagation()
  useVaultStore.getState().setExplorerMenu({
    x: e.clientX,
    y: e.clientY,
    ...item
  })
}
