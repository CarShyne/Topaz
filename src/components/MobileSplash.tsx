import { useEffect, useState } from 'react'
import { isCapacitor, deviceKind } from '../lib/device'
import splashPhone from '../assets/splash-ios-phone.png'
import splashTablet from '../assets/splash-ios-tablet.png'
import styles from './MobileSplash.module.css'

const MIN_MS = 2200

export function MobileSplash() {
  const [visible, setVisible] = useState(isCapacitor)
  const [kind, setKind] = useState(deviceKind())

  useEffect(() => {
    if (!isCapacitor) return
    const blurFocus = () => {
      const el = document.activeElement as HTMLElement | null
      el?.blur?.()
    }
    blurFocus()
    const onResize = () => setKind(deviceKind())
    window.addEventListener('resize', onResize)
    const t = setTimeout(() => {
      setVisible(false)
      blurFocus()
    }, MIN_MS)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  if (!visible) return null

  const src = kind === 'tablet' ? splashTablet : splashPhone

  return (
    <div className={styles.splash}>
      <img src={src} alt="Topaz" className={styles.img} />
    </div>
  )
}
