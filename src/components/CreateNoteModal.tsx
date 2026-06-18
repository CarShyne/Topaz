import { useEffect, useState } from 'react'
import { useGemStore } from '../stores/gemStore'
import { createNamedNote, listFolders } from '../lib/notes'
import styles from './CreateNoteModal.module.css'

export function CreateNoteModal() {
  const open = useGemStore(s => s.createNoteOpen)
  const setOpen = useGemStore(s => s.setCreateNoteOpen)
  const selectedFolder = useGemStore(s => s.selectedFolder)
  const [title, setTitle] = useState('')
  const [folder, setFolder] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const folders = listFolders()

  useEffect(() => {
    if (open) {
      setTitle('')
      setFolder(selectedFolder ?? '')
      setError('')
    }
  }, [open, selectedFolder])

  if (!open) return null

  const submit = async () => {
    setError('')
    setBusy(true)
    try {
      await createNamedNote(title, folder || null)
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create note')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={() => setOpen(false)}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h3>New note</h3>
        <label>Note name</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Meeting notes"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
        />
        <label>Project folder</label>
        <select value={folder} onChange={e => setFolder(e.target.value)}>
          <option value="">Gem root (no folder)</option>
          {folders.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        {folders.length === 0 && (
          <p className={styles.hint}>Create a project folder first to organize notes.</p>
        )}
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.actions}>
          <button onClick={() => setOpen(false)}>Cancel</button>
          <button className={styles.primary} onClick={submit} disabled={busy || !title.trim()}>
            {busy ? 'Creating…' : 'Create note'}
          </button>
        </div>
      </div>
    </div>
  )
}
