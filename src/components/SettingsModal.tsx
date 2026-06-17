import { useEffect, useState } from 'react'
import { useVaultStore } from '../stores/vaultStore'
import { login, register, syncVault } from '../lib/sync'
import { adoptRemoteVaultId } from '../lib/vault-sync-id'
import { ensureDesktopPairCode } from '../lib/sync-server-url'
import { isCapacitor, isWeb } from '../lib/device'
import styles from './SettingsModal.module.css'

export function SettingsModal() {
  const open = useVaultStore(s => s.settingsOpen)
  const setOpen = useVaultStore(s => s.setSettingsOpen)
  const setSyncServer = useVaultStore(s => s.setSyncServer)
  const userEmail = useVaultStore(s => s.userEmail)
  const syncServer = useVaultStore(s => s.syncServer)
  const syncStatus = useVaultStore(s => s.syncStatus)
  const syncError = useVaultStore(s => s.syncError)
  const vaultPath = useVaultStore(s => s.vaultPath)
  const authToken = useVaultStore(s => s.authToken)
  const vaultName = useVaultStore(s => s.vaultName)
  const setAuth = useVaultStore(s => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pairCode, setPairCode] = useState('')
  const [computerIp, setComputerIp] = useState('')
  const [desktopCode, setDesktopCode] = useState('')
  const [lanIps, setLanIps] = useState<string[]>([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [hubEnabled, setHubEnabled] = useState(true)
  const [tab, setTab] = useState<'sync' | 'editor' | 'appearance'>('sync')

  useEffect(() => {
    if (!open) return
    window.topaz.getConfig().then(cfg => {
      if (cfg.computerIp) setComputerIp(cfg.computerIp)
      if (cfg.pairCode) setPairCode(cfg.pairCode)
    })
    if (isWeb) {
      void fetch('/api/hub')
        .then(r => r.json())
        .then(d => setHubEnabled(d.enabled !== false))
        .catch(() => setHubEnabled(true))
    } else if (!isCapacitor) {
      void window.topaz.getHubMode?.().then(setHubEnabled).catch(() => setHubEnabled(true))
      void (window.topaz as { getLanIps?: () => Promise<string[]> }).getLanIps?.().then(setLanIps).catch(() => {})
    }
  }, [open])

  useEffect(() => {
    if (!open || tab !== 'sync' || isCapacitor || !hubEnabled) return
    const refresh = async () => {
      try {
        if (isWeb) {
          const current = await fetch('/api/pair/current')
          if (current.ok) {
            const body = await current.json() as { code: string; expiresIn: number }
            if (body.expiresIn > 120) {
              setDesktopCode(body.code)
              return
            }
          }
          const res = await fetch('/api/pair/new', { method: 'POST' })
          if (!res.ok) throw new Error('pair failed')
          const body = await res.json() as { code: string }
          setDesktopCode(body.code)
        } else {
          setDesktopCode(await ensureDesktopPairCode())
        }
      } catch {
        setDesktopCode('———')
      }
    }
    refresh()
    const interval = setInterval(refresh, 30_000)
    return () => clearInterval(interval)
  }, [open, tab, hubEnabled])

  if (!open) return null

  const handleAuth = async (mode: 'login' | 'register') => {
    setError('')
    setInfo('')
    if (!email.trim()) { setError('Email is required'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (isCapacitor && mode === 'login' && !/^\d{6}$/.test(pairCode.trim())) {
      setError('Enter the 6-digit code from your computer (Settings → Sync).')
      return
    }
    setBusy(true)
    if (isCapacitor) setInfo('Connecting to your computer…')
    try {
      const result = mode === 'login'
        ? await login(email, password, syncServer, pairCode.trim(), computerIp.trim() || undefined)
        : await register(email, password)
      setAuth(result.token, result.email)
      const cfg = await window.topaz.getConfig()
      cfg.authToken = result.token
      cfg.syncServer = result.server
      cfg.userEmail = result.email
      if (computerIp.trim()) cfg.computerIp = computerIp.trim()
      if (isCapacitor && pairCode.trim()) cfg.pairCode = pairCode.trim()
      await window.topaz.saveConfig(cfg)
      setSyncServer(result.server)
      if (isCapacitor && vaultPath) {
        await adoptRemoteVaultId(vaultPath, result.token, result.server)
        await syncVault(vaultPath, result.server, result.token, pairCode.trim() || undefined, computerIp.trim() || undefined)
      }
      setInfo(mode === 'register' ? 'Account created — you are signed in.' : 'Signed in successfully.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  const handleSignOut = async () => {
    setAuth(null, null)
    const cfg = await window.topaz.getConfig()
    cfg.authToken = undefined
    cfg.userEmail = undefined
    await window.topaz.saveConfig(cfg)
    setInfo('Signed out.')
  }

  const handleHubToggle = async (enabled: boolean) => {
    setHubEnabled(enabled)
    setError('')
    try {
      if (isWeb) {
        const res = await fetch('/api/hub', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled }),
        })
        if (!res.ok) throw new Error('Failed to update sync server')
        const data = await res.json() as { enabled: boolean }
        setHubEnabled(data.enabled !== false)
      } else if (!isCapacitor) {
        const result = await window.topaz.setHubMode?.(enabled)
        if (result) setHubEnabled(result.enabled)
      }
    } catch (e) {
      setHubEnabled(!enabled)
      setError(e instanceof Error ? e.message : 'Failed to update sync server')
    }
  }

  return (
    <div className={styles.overlay} onClick={() => setOpen(false)}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h2>Settings</h2>
        <div className={styles.tabs}>
          {(['sync', 'editor', 'appearance'] as const).map(t => (
            <button key={t} className={tab === t ? styles.active : ''} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'sync' && (
          <div className={styles.section}>
            <p className={styles.note}>
              Topaz sync is free — no limits, no paywalls. Notes stay on your device and sync automatically
              {isCapacitor ? ' when Topaz is open on your computer.' : ' while Topaz is running.'}
            </p>

            {!isCapacitor && (
              <div className={styles.hubSection}>
                <label className={styles.hubToggle}>
                  <input
                    type="checkbox"
                    checked={hubEnabled}
                    onChange={e => void handleHubToggle(e.target.checked)}
                  />
                  <span>Use as sync server</span>
                </label>
                <p className={styles.note}>
                  {isWeb
                    ? 'Publish this browser session as the sync hub for phones and other devices on your network.'
                    : 'Run a local sync server so phones and other devices on your network can connect to this computer.'}
                </p>
              </div>
            )}

            {!isCapacitor && hubEnabled && !userEmail && (
              <div className={styles.pairBox}>
                <p className={styles.pairLabel}>Phone pairing code</p>
                <p className={styles.pairCode}>{desktopCode || '···'}</p>
                {lanIps.length > 0 && (
                  <p className={styles.note}>Computer IP for phone (if needed): <strong>{lanIps[0]}</strong></p>
                )}
                <p className={styles.note}>Enter this code on your iPhone or iPad when signing in. Refreshes every 15 minutes.</p>
              </div>
            )}

            {userEmail ? (
              <div className={styles.signedIn}>
                <p>Signed in as <strong>{userEmail}</strong></p>
                {isCapacitor && (
                  <>
                    <p className={styles.note}>
                      Vault: <strong>{vaultName}</strong> — must match the name on your computer.
                    </p>
                    <p className={styles.note}>
                      Status: {syncStatus === 'syncing' ? 'Syncing…' : syncStatus === 'synced' ? 'Synced' : syncStatus === 'error' ? 'Error' : 'Waiting for computer'}
                    </p>
                    {syncError && <p className={styles.error}>{syncError}</p>}
                    <label>Computer code</label>
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={pairCode}
                      onChange={e => setPairCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit code"
                    />
                    <label>Computer IP (optional)</label>
                    <input
                      inputMode="decimal"
                      value={computerIp}
                      onChange={e => setComputerIp(e.target.value)}
                      placeholder="e.g. 192.168.1.5"
                      autoComplete="off"
                    />
                    <button
                      disabled={busy || !vaultPath || !authToken}
                      onClick={async () => {
                        if (!vaultPath || !authToken) return
                        setBusy(true)
                        setError('')
                        const cfg = await window.topaz.getConfig()
                        if (computerIp.trim()) cfg.computerIp = computerIp.trim()
                        if (pairCode.trim()) cfg.pairCode = pairCode.trim()
                        await window.topaz.saveConfig(cfg)
                        try {
                          await syncVault(vaultPath, syncServer, authToken, pairCode.trim() || undefined, computerIp.trim() || undefined)
                          setInfo('Sync complete.')
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Sync failed')
                        } finally {
                          setBusy(false)
                        }
                      }}
                    >
                      Sync now
                    </button>
                  </>
                )}
                {!isCapacitor && hubEnabled && (
                  <div className={styles.pairBox}>
                    <p className={styles.pairLabel}>Phone pairing code</p>
                    <p className={styles.pairCode}>{desktopCode || '···'}</p>
                  </div>
                )}
                <button onClick={handleSignOut}>Sign out</button>
              </div>
            ) : (
              <>
                {isCapacitor ? (
                  <p className={styles.note}>Open Topaz on your Mac or PC, then enter the code shown under Settings → Sync.</p>
                ) : hubEnabled ? (
                  <p className={styles.note}>Create an account here, then sign in on your phone with the pairing code above.</p>
                ) : (
                  <p className={styles.note}>Enable sync server above to pair phones and sync across devices.</p>
                )}
                {isCapacitor && (
                  <>
                    <label>Computer code</label>
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={pairCode}
                      onChange={e => setPairCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit code"
                      autoComplete="one-time-code"
                    />
                    <label>Computer IP (optional)</label>
                    <input
                      inputMode="decimal"
                      value={computerIp}
                      onChange={e => setComputerIp(e.target.value)}
                      placeholder="e.g. 192.168.1.5"
                      autoComplete="off"
                    />
                    <p className={styles.note}>Find IP on your Mac: System Settings → Network. On Windows: ipconfig in Command Prompt.</p>
                  </>
                )}
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
                <label>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={busy ? 'off' : 'new-password'} />
                <div className={styles.authBtns}>
                  <button className={styles.primary} onClick={() => handleAuth('login')} disabled={busy}>
                    {busy ? (isCapacitor ? 'Connecting…' : 'Please wait…') : 'Sign in'}
                  </button>
                  {!isCapacitor && (
                    <button onClick={() => handleAuth('register')} disabled={busy}>Create account</button>
                  )}
                </div>
              </>
            )}
            {error && <p className={styles.error}>{error}</p>}
            {info && <p className={styles.info}>{info}</p>}
          </div>
        )}

        {tab === 'editor' && (
          <div className={styles.section}>
            <p>Default editor mode: source</p>
            <p className={styles.note}>Use Cmd/Ctrl+P for command palette, Cmd/Ctrl+O for quick switcher, Cmd/Ctrl+N for new note.</p>
          </div>
        )}

        {tab === 'appearance' && (
          <div className={styles.section}>
            <p>Theme: Topaz Dark</p>
            <p>Accent: Ruby Red</p>
          </div>
        )}

        <button className={styles.close} onClick={() => setOpen(false)}>Close</button>
      </div>
    </div>
  )
}
