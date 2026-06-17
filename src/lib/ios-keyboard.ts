import { isCapacitor } from './device'

/** Keep the web layout in sync with the iOS visual viewport when the keyboard opens. */
export function installIosKeyboardLayout(): () => void {
  if (!isCapacitor || typeof window === 'undefined') return () => {}

  const root = document.documentElement
  const viewport = window.visualViewport

  const apply = () => {
    const height = viewport?.height ?? window.innerHeight
    const offsetTop = viewport?.offsetTop ?? 0
    root.style.setProperty('--app-height', `${height}px`)
    root.style.setProperty('--app-offset-top', `${offsetTop}px`)
    const keyboardLikelyOpen = height < window.screen.height * 0.72
    root.classList.toggle('keyboard-open', keyboardLikelyOpen)
  }

  apply()
  viewport?.addEventListener('resize', apply)
  viewport?.addEventListener('scroll', apply)
  window.addEventListener('orientationchange', apply)

  return () => {
    viewport?.removeEventListener('resize', apply)
    viewport?.removeEventListener('scroll', apply)
    window.removeEventListener('orientationchange', apply)
    root.classList.remove('keyboard-open')
    root.style.removeProperty('--app-height')
    root.style.removeProperty('--app-offset-top')
  }
}
