import { useGemStore } from '../stores/gemStore'
import styles from './AppHeader.module.css'
import icon from '../assets/icon.png'

export function AppHeader() {
  const gemName = useGemStore(s => s.gemName)
  const syncStatus = useGemStore(s => s.syncStatus)
  const userEmail = useGemStore(s => s.userEmail)

  return (
    <header className={styles.header} data-tauri-drag-region>
      <div className={styles.left}>
        <img src={icon} alt="Topaz" className={styles.logo} />
        <span className={styles.brand}>Topaz</span>
        {gemName && <span className={styles.gem}>— {gemName}</span>}
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
