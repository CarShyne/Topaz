import { useEffect, useState } from 'react'
import { isWeb } from '../lib/device'
import { newId } from '../lib/id'
import icon from '../assets/icon.png'
import styles from './VaultPicker.module.css'

interface Props { onOpen: (path: string, name: string) => void | Promise<void> }

export function VaultPicker({ onOpen }: Props) {
  const [vaultName, setVaultName] = useState('My Vault')
  const [recent, setRecent] = useState<{ id: string; name: string; path: string }[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    window.topaz.getConfig().then(cfg => setRecent(cfg.vaults))
  }, [])

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <img src={icon} alt="Topaz" className={styles.logo} />
        <h1 className={styles.title}>Topaz</h1>
        <p className={styles.subtitle}>Next Level Notes</p>

        <div className={styles.actions}>
          <button
            className={styles.primary}
            disabled={busy || !vaultName.trim()}
            onClick={async () => {
              setError('')
              setBusy(true)
              try {
                const name = vaultName.trim()
                const path = await window.topaz.createVault(name)
                if (!path) {
                  setError('Could not create vault.')
                  return
                }
                await onOpen(path, name)
                const cfg = await window.topaz.getConfig()
                setRecent(cfg.vaults)
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not create vault.')
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Creating…' : 'Create new vault'}
          </button>
          <input
            className={styles.input}
            value={vaultName}
            onChange={e => setVaultName(e.target.value)}
            placeholder="Vault name"
          />
          {!isWeb && (
          <button className={styles.secondary} onClick={async () => {
            const path = await window.topaz.pickVaultFolder()
            if (path) {
              const name = path.split('/').pop() ?? path
              const cfg = await window.topaz.getConfig()
              const existing = cfg.vaults.find(v => v.path === path)
              if (!existing) {
                cfg.vaults.push({ id: newId(), name, path })
              }
              cfg.lastVaultId = existing?.id ?? cfg.vaults[cfg.vaults.length - 1].id
              await window.topaz.saveConfig(cfg)
              onOpen(path, name)
            }
          }}>
            Open folder as vault
          </button>
          )}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {recent.length > 0 && (
          <div className={styles.recent}>
            <h3>Recent vaults</h3>
            {recent.map(v => (
              <button key={v.id} className={styles.recentItem} onClick={async () => {
                setError('')
                setBusy(true)
                try {
                  await onOpen(v.path, v.name)
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not open vault.')
                } finally {
                  setBusy(false)
                }
              }}>
                {v.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
