import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { Keyboard, KeyboardResize, KeyboardStyle } from '@capacitor/keyboard'
import { StatusBar, Style } from '@capacitor/status-bar'
import { createCapacitorAPI } from './lib/platform-capacitor'
import { installIosKeyboardLayout } from './lib/ios-keyboard'
import App from './App'
import './styles/global.css'
import './styles/mobile.css'

document.documentElement.classList.add('platform-ios')

window.topaz = createCapacitorAPI()

async function initNativeChrome() {
  if (!Capacitor.isNativePlatform()) return
  try {
    await Keyboard.setStyle({ style: KeyboardStyle.Dark })
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body })
    await Keyboard.setScroll({ isDisabled: false })
  } catch {
    // plugin unavailable in web preview
  }
  try {
    await StatusBar.setOverlaysWebView({ overlay: true })
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#080808' })
    await StatusBar.hide()
  } catch {
    // plugin unavailable in web preview
  }
}

void initNativeChrome()
const teardownKeyboardLayout = installIosKeyboardLayout()

createRoot(document.getElementById('root')!).render(<App />)

if (import.meta.hot) {
  import.meta.hot.dispose(() => teardownKeyboardLayout())
}
