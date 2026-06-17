import { useEffect, useState } from 'react'
import { isWeb } from '../lib/device'
import icon from '../assets/icon.png'
import styles from './VaultPicker.module.css'

interface Props { onOpen: (path: string, name: string) => void }

export function VaultPicker({ onOpen }: Props) {
  const [vaultName, setVaultName] = useState('My Vault')
  const [recent, setRecent] = useState<{ id: string; name: string; path: string }[]>([])

  useEffect(() => {
    window.topaz.getConfig().then(cfg => setRecent(cfg.vaults))
  }, [])

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <img src={icon} alt="Topaz" className={styles.logo} />
        <h1 className={styles.title}>Topaz</h1>
        <p className={styles.subtitle}>Your connected knowledge base</p>

        <div className={styles.actions}>
          <button className={styles.primary} onClick={async () => {
            const path = await window.topaz.createVault(vaultName)
            if (path) {
              const cfg = await window.topaz.getConfig()
              const id = crypto.randomUUID()
              cfg.vaults.push({ id, name: vaultName, path })
              cfg.lastVaultId = id
              await window.topaz.saveConfig(cfg)
              onOpen(path, vaultName)
            }
          }}>
            Create new vault
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
                cfg.vaults.push({ id: crypto.randomUUID(), name, path })
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

        {recent.length > 0 && (
          <div className={styles.recent}>
            <h3>Recent vaults</h3>
            {recent.map(v => (
              <button key={v.id} className={styles.recentItem} onClick={() => onOpen(v.path, v.name)}>
                {v.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
