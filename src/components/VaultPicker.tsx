import { useEffect, useState } from 'react'
import { isWeb } from '../lib/device'
import { newId } from '../lib/id'
import type { VaultEntry } from '../stores/vaultStore'
import icon from '../assets/icon.png'
import styles from './VaultPicker.module.css'

interface Props {
  onOpen: (path: string, name: string, entries?: VaultEntry[]) => void | Promise<void>
}

async function webCreateAndOpen(name: string): Promise<{ vaultPath: string; name: string; entries: VaultEntry[] }> {
  const res = await fetch('/api/vault/createAndOpen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  const text = await res.text()
  if (!res.ok) {
    let message = `Server error (${res.status})`
    try {
      const data = JSON.parse(text) as { error?: string }
      if (data.error) message = data.error
    } catch {
      if (text.includes('Cannot POST')) message = 'Old Topaz image — run ./scripts/publish-jt7777.sh then redeploy Portainer'
      else if (text) message = text.slice(0, 200)
    }
    throw new Error(message)
  }
  return JSON.parse(text) as { vaultPath: string; name: string; entries: VaultEntry[] }
}

export function VaultPicker({ onOpen }: Props) {
  const [vaultName, setVaultName] = useState('My Vault')
  const [recent, setRecent] = useState<{ id: string; name: string; path: string }[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [serverOk, setServerOk] = useState<boolean | null>(null)
  const [serverBuild, setServerBuild] = useState('')

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
      })
  }, [])

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <img src={icon} alt="Topaz" className={styles.logo} />
        <h1 className={styles.title}>Topaz</h1>
        <p className={styles.subtitle}>Next Level Notes</p>
        {serverOk && (
          <p className={styles.buildHint}>Server ready · build {serverBuild}</p>
        )}

        {serverOk === false && (
          <div className={styles.serverWarning}>
            <strong>Old Docker image</strong>
            <p>You are pulling <code>jt7777/topaz</code> but it is an <em>old</em> build (old tagline, vault broken).</p>
            <p>On your Mac, open Terminal and run once:</p>
            <code className={styles.codeBlock}>cd ~/Projects/Topaz && git pull && ./scripts/publish-jt7777.sh</code>
            <p>Then Portainer → Stacks → Topaz → <strong>Pull and redeploy</strong>.</p>
          </div>
        )}

        <div className={styles.actions}>
          <button
            className={styles.primary}
            disabled={busy || !vaultName.trim()}
            onClick={async () => {
              setError('')
              setBusy(true)
              try {
                const name = vaultName.trim()
                if (isWeb) {
                  const { vaultPath, name: label, entries } = await webCreateAndOpen(name)
                  await onOpen(vaultPath, label, entries)
                } else {
                  const path = await window.topaz.createVault(name)
                  if (!path) {
                    setError('Could not create vault. Try again.')
                    return
                  }
                  await onOpen(path, name)
                }
                setServerOk(true)
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
