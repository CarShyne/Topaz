import { useEffect, useState } from 'react'
import { useGemStore } from '../stores/gemStore'
import { login, register, syncGem } from '../lib/sync'
import { adoptRemoteGemId } from '../lib/gem-sync-id'
import { ensureDesktopPairCode } from '../lib/sync-server-url'
import { isCapacitor, isWeb } from '../lib/device'
import styles from './SettingsModal.module.css'

export function SettingsModal() {
  const open = useGemStore(s => s.settingsOpen)
  const setOpen = useGemStore(s => s.setSettingsOpen)
  const setSyncServer = useGemStore(s => s.setSyncServer)
  const userEmail = useGemStore(s => s.userEmail)
  const syncServer = useGemStore(s => s.syncServer)
  const syncStatus = useGemStore(s => s.syncStatus)
  const syncError = useGemStore(s => s.syncError)
  const gemPath = useGemStore(s => s.gemPath)
  const authToken = useGemStore(s => s.authToken)
  const gemName = useGemStore(s => s.gemName)
  const setAuth = useGemStore(s => s.setAuth)
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
  const [syncRole, setSyncRole] = useState<'server' | 'client'>('server')
  const [remoteServer, setRemoteServer] = useState('')
  const [tab, setTab] = useState<'sync' | 'editor' | 'appearance'>('sync')

  useEffect(() => {
    if (!open) return
    window.topaz.getConfig().then(cfg => {
      if (cfg.computerIp) setComputerIp(cfg.computerIp)
      if (cfg.pairCode) setPairCode(cfg.pairCode)
      if (cfg.syncServer && cfg.syncRole === 'client') setRemoteServer(cfg.syncServer)
      if (!isCapacitor) setSyncRole(cfg.syncRole === 'client' ? 'client' : 'server')
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
    if (!open || tab !== 'sync' || isCapacitor || syncRole !== 'server') return
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
  }, [open, tab, syncRole])

  const saveSyncRole = async (role: 'server' | 'client') => {
    setSyncRole(role)
    const cfg = await window.topaz.getConfig()
    cfg.syncRole = role
    await window.topaz.saveConfig(cfg)
  }

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
    if (!isCapacitor && syncRole === 'client' && !remoteServer.trim() && !/^\d{6}$/.test(pairCode.trim())) {
      setError('Enter your Topaz server address or 6-digit pairing code.')
      return
    }
    setBusy(true)
    if (isCapacitor) setInfo('Connecting to your computer…')
    try {
      const loginServer = !isCapacitor && syncRole === 'client'
        ? (remoteServer.trim() || syncServer)
        : syncServer
      const result = mode === 'login'
        ? await login(email, password, loginServer, pairCode.trim(), computerIp.trim() || remoteServer.trim() || undefined)
        : await register(email, password, loginServer, pairCode.trim(), computerIp.trim() || remoteServer.trim() || undefined)
      setAuth(result.token, result.email)
      const cfg = await window.topaz.getConfig()
      cfg.authToken = result.token
      cfg.syncServer = result.server
      cfg.userEmail = result.email
      if (!isCapacitor) cfg.syncRole = syncRole
      if (computerIp.trim()) cfg.computerIp = computerIp.trim()
      if (!isCapacitor && syncRole === 'client' && remoteServer.trim()) {
        cfg.syncServer = remoteServer.trim().replace(/\/+$/, '')
      }
      if (isCapacitor && pairCode.trim()) cfg.pairCode = pairCode.trim()
      if (!isCapacitor && syncRole === 'client' && pairCode.trim()) cfg.pairCode = pairCode.trim()
      await window.topaz.saveConfig(cfg)
      setSyncServer(result.server)
      if (gemPath) {
        await adoptRemoteGemId(gemPath, result.token, result.server)
        await syncGem(
          gemPath,
          result.server,
          result.token,
          pairCode.trim() || undefined,
          computerIp.trim() || remoteServer.trim() || undefined
        )
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
                <p className={styles.roleLabel}>How is this device used?</p>
                <label className={styles.roleOption}>
                  <input
                    type="radio"
                    name="syncRole"
                    checked={syncRole === 'server'}
                    onChange={() => void saveSyncRole('server')}
                  />
                  <span>This is my sync server</span>
                </label>
                <label className={styles.roleOption}>
                  <input
                    type="radio"
                    name="syncRole"
                    checked={syncRole === 'client'}
                    onChange={() => void saveSyncRole('client')}
                  />
                  <span>Connect to another Topaz server</span>
                </label>
                <p className={styles.note}>
                  {syncRole === 'server'
                    ? 'Sign in here to store notes on this device. Other phones and browsers can pair using the code below.'
                    : 'Sign in with your account to pull notes from another Topaz server (Pi, Mac, or Docker).'}
                </p>
              </div>
            )}

            {!isCapacitor && syncRole === 'client' && (
              <>
                <label>Topaz server address</label>
                <input
                  value={remoteServer}
                  onChange={e => setRemoteServer(e.target.value)}
                  placeholder="http://192.168.1.5:3921"
                  autoComplete="off"
                />
                <label>Pairing code (if needed)</label>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pairCode}
                  onChange={e => setPairCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit code from server Settings"
                  autoComplete="one-time-code"
                />
              </>
            )}

            {(!isCapacitor && syncRole === 'server') && (
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
                    ? 'Allow phones and other devices on your network to sync through this instance.'
                    : 'Run a local sync server so phones and other devices on your network can connect to this computer.'}
                </p>
              </div>
            )}

            {!isCapacitor && syncRole === 'server' && hubEnabled && !userEmail && (
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
                <p className={styles.note}>
                  Gem: <strong>{gemName}</strong>
                  {isCapacitor ? ' — must match the name on your computer.' : ''}
                </p>
                <p className={styles.note}>
                  Status: {syncStatus === 'syncing' ? 'Syncing…' : syncStatus === 'synced' ? 'Synced' : syncStatus === 'error' ? 'Error' : isCapacitor ? 'Waiting for computer' : 'Ready'}
                </p>
                {syncError && <p className={styles.error}>{syncError}</p>}
                {!isCapacitor && syncRole === 'client' && (
                  <>
                    <label>Topaz server address</label>
                    <input
                      value={remoteServer}
                      onChange={e => setRemoteServer(e.target.value)}
                      placeholder="http://192.168.1.5:3921"
                      autoComplete="off"
                    />
                    <label>Pairing code (if needed)</label>
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={pairCode}
                      onChange={e => setPairCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit code"
                    />
                  </>
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
                    />
                    <label>Computer IP (optional)</label>
                    <input
                      inputMode="decimal"
                      value={computerIp}
                      onChange={e => setComputerIp(e.target.value)}
                      placeholder="e.g. 192.168.1.5"
                      autoComplete="off"
                    />
                  </>
                )}
                <button
                  disabled={busy || !gemPath || !authToken}
                  onClick={async () => {
                    if (!gemPath || !authToken) return
                    setBusy(true)
                    setError('')
                    const cfg = await window.topaz.getConfig()
                    if (computerIp.trim()) cfg.computerIp = computerIp.trim()
                    if (pairCode.trim()) cfg.pairCode = pairCode.trim()
                    if (!isCapacitor && syncRole === 'client' && remoteServer.trim()) {
                      cfg.syncServer = remoteServer.trim().replace(/\/+$/, '')
                    }
                    await window.topaz.saveConfig(cfg)
                    if (cfg.syncServer) setSyncServer(cfg.syncServer)
                    try {
                      await syncGem(
                        gemPath,
                        cfg.syncServer ?? syncServer,
                        authToken,
                        pairCode.trim() || undefined,
                        computerIp.trim() || remoteServer.trim() || undefined
                      )
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
                {!isCapacitor && syncRole === 'server' && hubEnabled && (
                  <div className={styles.pairBox}>
                    <p className={styles.pairLabel}>Phone pairing code</p>
                    <p className={styles.pairCode}>{desktopCode || '···'}</p>
                    {lanIps.length > 0 && (
                      <p className={styles.note}>Computer IP for phone (if needed): <strong>{lanIps[0]}</strong></p>
                    )}
                  </div>
                )}
                <button onClick={handleSignOut}>Sign out</button>
              </div>
            ) : (
              <>
                {isCapacitor ? (
                  <p className={styles.note}>Open Topaz on your Mac or PC, then enter the code shown under Settings → Sync.</p>
                ) : !isCapacitor && syncRole === 'client' ? (
                  <p className={styles.note}>Enter the server address above, then sign in to pull your account notes.</p>
                ) : syncRole === 'server' && hubEnabled ? (
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
