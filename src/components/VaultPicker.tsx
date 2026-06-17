import { useEffect, useState } from 'react'
import { isWeb } from '../lib/device'
import { newId } from '../lib/id'
import icon from '../assets/icon.png'
import styles from './VaultPicker.module.css'

interface Props {
  onOpen: (path: string, name: string, entries?: import('../stores/vaultStore').VaultEntry[]) => void | Promise<void>
}

export function VaultPicker({ onOpen }: Props) {
  const [vaultName, setVaultName] = useState('My Vault')
  const [recent, setRecent] = useState<{ id: string; name: string; path: string }[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [serverOk, setServerOk] = useState<boolean | null>(null)
  const [serverBuild, setServerBuild] = useState('')

  const appBuild = import.meta.env.VITE_APP_BUILD ?? ''

  useEffect(() => {
    fetch('/api/vault/health')
      .then(async (res) => {
        if (!res.ok) throw new Error('Server not ready')
        const data = await res.json() as { ok?: boolean; build?: string }
        if (!data.ok) throw new Error('Server not ready')
        setServerOk(true)
        setServerBuild(data.build ?? 'unknown')
        const cfg = await window.topaz.getConfig()
        setRecent(cfg.vaults)
      })
      .catch(() => {
        setServerOk(false)
        setError('Your Topaz box is still running the OLD version (that is why you still see the old text). Rebuild it — steps below.')
      })
  }, [])

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <img src={icon} alt="Topaz" className={styles.logo} />
        <h1 className={styles.title}>Topaz</h1>
        <p className={styles.subtitle}>Next Level Notes</p>
        {serverOk && (
          <p className={styles.buildHint}>Updated · build {serverBuild}</p>
        )}

        {serverOk === false && (
          <div className={styles.serverWarning}>
            <strong>Still on the old Topaz</strong>
            <p>If you still see &ldquo;Your connected knowledge base&rdquo;, the Docker container was never rebuilt. Git is updated — Docker is not.</p>
            <p><strong>On the computer that runs Docker</strong>, open Terminal and paste:</p>
            <code className={styles.codeBlock}>cd ~/Projects/Topaz && git pull && ./scripts/deploy-topaz.sh</code>
            <p><strong>Portainer users:</strong> Stacks → Topaz → Stop → Pull latest image / Rebuild → Start. Then hard-refresh Safari (hold refresh button → Reload Without Content Blockers).</p>
          </div>
        )}

        <div className={styles.actions}>
          <button
            className={styles.primary}
            disabled={busy || !vaultName.trim() || serverOk === false}
            onClick={async () => {
              setError('')
              setBusy(true)
              try {
                const name = vaultName.trim()
                if (isWeb && window.topaz.createAndOpenVault) {
                  const { vaultPath, name: label, entries } = await window.topaz.createAndOpenVault(name)
                  await onOpen(vaultPath, label, entries)
                } else {
                  const path = await window.topaz.createVault(name)
                  if (!path) {
                    setError('Could not create vault. Try again.')
                    return
                  }
                  await onOpen(path, name)
                }
                const cfg = await window.topaz.getConfig()
                setRecent(cfg.vaults)
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'Could not create vault.'
                if (msg.includes('Cannot POST') || msg.includes('404') || msg.includes('Failed to fetch')) {
                  setError('Server is out of date — rebuild with ./scripts/deploy-topaz.sh then refresh.')
                } else {
                  setError(msg)
                }
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
