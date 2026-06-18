import { useEffect, useState } from 'react'
import { useGemStore } from '../stores/gemStore'
import { renameNote, renameFolder } from '../lib/notes'
import styles from './RenameItemModal.module.css'

export function RenameItemModal() {
  const target = useGemStore(s => s.renameTarget)
  const setTarget = useGemStore(s => s.setRenameTarget)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (target) {
      const base = target.path.split('/').pop() ?? target.path
      setName(target.isDir ? base : base.replace(/\.md$/i, ''))
      setError('')
    }
  }, [target])

  if (!target) return null

  const submit = async () => {
    setError('')
    setBusy(true)
    try {
      if (target.isDir) await renameFolder(target.path, name)
      else await renameNote(target.path, name)
      setTarget(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rename failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={() => setTarget(null)}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h3>Rename {target.isDir ? 'project' : 'note'}</h3>
        <label>Name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
        />
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.actions}>
          <button onClick={() => setTarget(null)}>Cancel</button>
          <button className={styles.primary} onClick={submit} disabled={busy || !name.trim()}>
            {busy ? 'Saving…' : 'Rename'}
          </button>
        </div>
      </div>
    </div>
  )
}
