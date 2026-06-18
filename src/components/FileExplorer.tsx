import { useState } from 'react'
import { ChevronRight, ChevronDown, FileText, Folder, FolderPlus, FilePlus, Pencil, Trash2 } from 'lucide-react'
import { useGemStore } from '../stores/gemStore'
import { deleteNote, deleteFolder } from '../lib/notes'
import { openExplorerMenu } from './ExplorerContextMenu'
import styles from './FileExplorer.module.css'

function ItemActions({ path, isDir, label }: { path: string; isDir: boolean; label: string }) {
  const setRenameTarget = useGemStore(s => s.setRenameTarget)

  const onDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const msg = isDir
      ? `Delete project "${label}" and all notes inside?`
      : `Delete note "${label}"?`
    if (!confirm(msg)) return
    if (isDir) await deleteFolder(path)
    else await deleteNote(path)
  }

  const onRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    setRenameTarget({ path, isDir })
  }

  return (
    <div className={styles.actions}>
      <button className={styles.actionBtn} title="Rename" onClick={onRename}>
        <Pencil size={12} />
      </button>
      <button className={styles.actionBtn} title="Delete" onClick={onDelete}>
        <Trash2 size={12} />
      </button>
    </div>
  )
}

export function FileExplorer() {
  const entries = useGemStore(s => s.entries)
  const openTab = useGemStore(s => s.openTab)
  const activeTabId = useGemStore(s => s.activeTabId)
  const tabs = useGemStore(s => s.tabs)
  const selectedFolder = useGemStore(s => s.selectedFolder)
  const setSelectedFolder = useGemStore(s => s.setSelectedFolder)
  const setCreateNoteOpen = useGemStore(s => s.setCreateNoteOpen)
  const setCreateFolderOpen = useGemStore(s => s.setCreateFolderOpen)
  const activePath = tabs.find(t => t.id === activeTabId)?.path

  const folders = new Set<string>()
  const files: { path: string; name: string }[] = []
  for (const e of entries) {
    if (e.isDir) folders.add(e.path)
    else files.push(e)
  }

  const rootFiles = files.filter(f => !f.path.includes('/'))
  const rootFolders = [...folders].filter(f => !f.includes('/')).sort()

  return (
    <div className={styles.explorer}>
      <div className={styles.toolbar}>
        <button className={styles.toolBtn} title="New project (folder)" onClick={() => setCreateFolderOpen(true)}>
          <FolderPlus size={14} />
          <span>Project</span>
        </button>
        <button className={styles.toolBtn} title="New note" onClick={() => setCreateNoteOpen(true)}>
          <FilePlus size={14} />
          <span>Note</span>
        </button>
      </div>
      {rootFolders.length === 0 && rootFiles.length === 0 && (
        <p className={styles.empty}>Create a project folder, then add notes inside it.</p>
      )}
      {rootFolders.map(f => (
        <FolderNode
          key={f}
          path={f}
          name={f}
          entries={entries}
          activePath={activePath}
          selectedFolder={selectedFolder}
          onSelect={setSelectedFolder}
          onOpen={openTab}
          depth={0}
        />
      ))}
      {rootFiles.map(f => (
        <div key={f.path} className={styles.itemRow}>
        <button
          className={`${styles.file} ${styles.depth0} ${activePath === f.path ? styles.active : ''}`}
          onClick={() => openTab(f.path)}
          onContextMenu={e => openExplorerMenu(e, { path: f.path, isDir: false, label: f.name.replace(/\.md$/, '') })}
        >
            <FileText size={14} />
            <span>{f.name.replace(/\.md$/, '')}</span>
          </button>
          <ItemActions path={f.path} isDir={false} label={f.name.replace(/\.md$/, '')} />
        </div>
      ))}
    </div>
  )
}

function FolderNode({ path, name, entries, activePath, selectedFolder, onSelect, onOpen, depth }: {
  path: string; name: string
  entries: { path: string; name: string; isDir: boolean }[]
  activePath?: string; selectedFolder: string | null
  onSelect: (f: string) => void; onOpen: (p: string) => void; depth: number
}) {
  const [open, setOpen] = useState(true)
  const setCreateNoteOpen = useGemStore(s => s.setCreateNoteOpen)
  const childFolders = entries.filter(e => e.isDir && e.path.startsWith(path + '/') && !e.path.slice(path.length + 1).includes('/'))
  const childFiles = entries.filter(e => !e.isDir && e.path.startsWith(path + '/') && !e.path.slice(path.length + 1).includes('/'))
  const isSelected = selectedFolder === path

  return (
    <div>
      <div className={styles.folderRow}>
        <button
          className={`${styles.folder} ${isSelected ? styles.selected : ''} ${styles[`depth${Math.min(depth, 3)}` as keyof typeof styles] ?? ''}`}
          onClick={() => { onSelect(path); setOpen(!open) }}
          onContextMenu={e => openExplorerMenu(e, { path, isDir: true, label: name })}
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Folder size={14} />
          <span>{name}</span>
        </button>
        <ItemActions path={path} isDir label={name} />
        {isSelected && (
          <button
            className={styles.folderAdd}
            title="New note in this project"
            onClick={(e) => { e.stopPropagation(); setCreateNoteOpen(true) }}
          >
            <FilePlus size={12} />
          </button>
        )}
      </div>
      {open && (
        <>
          {childFolders.map(f => (
            <FolderNode
              key={f.path}
              path={f.path}
              name={f.name}
              entries={entries}
              activePath={activePath}
              selectedFolder={selectedFolder}
              onSelect={onSelect}
              onOpen={onOpen}
              depth={depth + 1}
            />
          ))}
          {childFiles.map(f => (
            <div key={f.path} className={styles.itemRow}>
              <button
                className={`${styles.file} ${activePath === f.path ? styles.active : ''} ${styles[`depth${Math.min(depth + 1, 3)}` as keyof typeof styles] ?? ''}`}
                onClick={() => onOpen(f.path)}
                onContextMenu={e => openExplorerMenu(e, { path: f.path, isDir: false, label: f.name.replace(/\.md$/, '') })}
              >
                <FileText size={14} />
                <span>{f.name.replace(/\.md$/, '')}</span>
              </button>
              <ItemActions path={f.path} isDir={false} label={f.name.replace(/\.md$/, '')} />
            </div>
          ))}
        </>
      )}
    </div>
  )
}
