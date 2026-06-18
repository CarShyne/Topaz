import { useEffect, useState } from 'react'
import { isElectron, isWeb } from '../lib/device'
import { newId } from '../lib/id'
import type { GemEntry } from '../stores/gemStore'
import icon from '../assets/icon.png'
import styles from './GemPicker.module.css'

interface Props {
  onOpen: (path: string, name: string, entries?: GemEntry[]) => void | Promise<void>
}

async function webCreateAndOpen(name: string): Promise<{ gemPath: string; name: string; entries: GemEntry[] }> {
  const res = await fetch('/api/gem/createAndOpen', {
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
  return JSON.parse(text) as { gemPath: string; name: string; entries: GemEntry[] }
}

export function GemPicker({ onOpen }: Props) {
  const [gemName, setGemName] = useState('My Gem')
  const [recent, setRecent] = useState<{ id: string; name: string; path: string }[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [serverOk, setServerOk] = useState<boolean | null>(isWeb ? null : true)
  const [serverBuild, setServerBuild] = useState('')

  useEffect(() => {
    if (isWeb) {
      fetch('/api/gem/health')
        .then(async (res) => {
          if (!res.ok) throw new Error('Server not ready')
          const data = await res.json() as { ok?: boolean; build?: string }
          if (!data.ok) throw new Error('Server not ready')
          setServerOk(true)
          setServerBuild(data.build ?? 'unknown')
          const cfg = await window.topaz.getConfig()
          setRecent(cfg.gems)
        })
        .catch(() => {
          setServerOk(false)
        })
      return
    }

    void window.topaz.getConfig().then(cfg => {
      setRecent(cfg.gems)
    })
  }, [])

  return (
    <div className={styles.screen}>
      <div className={styles.panel}>
        <header className={styles.hero}>
          <img src={icon} alt="Topaz" className={styles.logo} />
          <h1 className={styles.title}>Topaz</h1>
          <p className={styles.subtitle}>Next Level Notes</p>
          {isWeb && serverOk && (
            <p className={styles.buildHint}>Server ready · build {serverBuild}</p>
          )}
        </header>

        {isWeb && serverOk === false && (
          <div className={styles.serverWarning}>
            <strong>Old Docker image</strong>
            <p>You are pulling <code>jt7777/topaz</code> but it is an <em>old</em> build (old tagline, gem creation broken).</p>
            <p>On your Mac, open Terminal and run once:</p>
            <code className={styles.codeBlock}>cd ~/Projects/Topaz && git pull && ./scripts/publish-jt7777.sh</code>
            <p>Check server: open <code>/api/gem/check</code> — build id must match your latest publish.</p>
            <p>Safari: delete the old home-screen shortcut, hard-refresh, then add to home screen again.</p>
          </div>
        )}

        <section className={styles.createSection}>
          <form
            className={styles.createForm}
            onSubmit={async (e) => {
              e.preventDefault()
              setError('')
              setBusy(true)
              try {
                const name = gemName.trim()
                if (isWeb) {
                  const { gemPath, name: label, entries } = await webCreateAndOpen(name)
                  await onOpen(gemPath, label, entries)
                } else {
                  const path = await window.topaz.createGem(name)
                  if (!path) {
                    setError('Could not create gem. Try again.')
                    return
                  }
                  await onOpen(path, name)
                }
                if (isWeb) setServerOk(true)
                const cfg = await window.topaz.getConfig()
                setRecent(cfg.gems)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not create gem.')
              } finally {
                setBusy(false)
              }
            }}
          >
            <label className={styles.fieldLabel} htmlFor="gem-name">Gem name</label>
            <input
              id="gem-name"
              className={styles.input}
              value={gemName}
              onChange={e => setGemName(e.target.value)}
              placeholder="My Gem"
            />
            <button
              type="submit"
              className={styles.primary}
              disabled={busy || !gemName.trim()}
            >
              {busy ? 'Creating…' : 'Create New Gem'}
            </button>
          </form>

          {isElectron && (
            <button
              type="button"
              className={styles.secondary}
              onClick={async () => {
                const path = await window.topaz.pickGemFolder()
                if (path) {
                  const name = path.split('/').pop() ?? path
                  const cfg = await window.topaz.getConfig()
                  const existing = cfg.gems.find(v => v.path === path)
                  if (!existing) {
                    cfg.gems.push({ id: newId(), name, path })
                  }
                  cfg.lastGemId = existing?.id ?? cfg.gems[cfg.gems.length - 1].id
                  await window.topaz.saveConfig(cfg)
                  onOpen(path, name)
                }
              }}
            >
              Open existing folder
            </button>
          )}
        </section>

        {error && <p className={styles.error}>{error}</p>}

        {recent.length > 0 && (
          <section className={styles.recent}>
            <h2 className={styles.recentTitle}>Recent gems</h2>
            <ul className={styles.recentList}>
              {recent.map(v => (
                <li key={v.id}>
                  <button
                    type="button"
                    className={styles.recentItem}
                    disabled={busy}
                    onClick={async () => {
                      setError('')
                      setBusy(true)
                      try {
                        await onOpen(v.path, v.name)
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Could not open gem.')
                      } finally {
                        setBusy(false)
                      }
                    }}
                  >
                    <span className={styles.gemDot} aria-hidden />
                    {v.name}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
