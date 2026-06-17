import { useEffect, useState } from 'react'
import { useVaultStore } from '../stores/vaultStore'
import { createProjectFolder } from '../lib/notes'
import styles from './CreateFolderModal.module.css'

export function CreateFolderModal() {
  const open = useVaultStore(s => s.createFolderOpen)
  const setOpen = useVaultStore(s => s.setCreateFolderOpen)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) { setName(''); setError('') }
  }, [open])

  if (!open) return null

  const submit = async () => {
    setError('')
    setBusy(true)
    try {
      await createProjectFolder(name)
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create project')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={() => setOpen(false)}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h3>New project</h3>
        <p className={styles.desc}>Projects are folders. Notes live inside them.</p>
        <label>Project name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Research, Work, Personal"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
        />
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.actions}>
          <button onClick={() => setOpen(false)}>Cancel</button>
          <button className={styles.primary} onClick={submit} disabled={busy || !name.trim()}>
            {busy ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </div>
    </div>
  )
}
