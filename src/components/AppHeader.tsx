import { useVaultStore } from '../stores/vaultStore'
import styles from './AppHeader.module.css'
import icon from '../assets/icon.png'

export function AppHeader() {
  const vaultName = useVaultStore(s => s.vaultName)
  const syncStatus = useVaultStore(s => s.syncStatus)
  const userEmail = useVaultStore(s => s.userEmail)

  return (
    <header className={styles.header} data-tauri-drag-region>
      <div className={styles.left}>
        <img src={icon} alt="Topaz" className={styles.logo} />
        <span className={styles.brand}>Topaz</span>
        {vaultName && <span className={styles.vault}>— {vaultName}</span>}
      </div>
      <div className={styles.right}>
        {userEmail && <span className={styles.user}>{userEmail}</span>}
        {syncStatus !== 'idle' && (
          <span className={`${styles.sync} ${styles[syncStatus]}`}>
            {syncStatus === 'syncing' ? 'Syncing…' : syncStatus === 'synced' ? 'Synced' : syncStatus === 'error' ? 'Sync error' : ''}
          </span>
        )}
      </div>
    </header>
  )
}
