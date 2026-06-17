import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.topaz.notes',
  appName: 'Topaz',
  webDir: 'dist-mobile',
  ios: {
    contentInset: 'never',
    backgroundColor: '#080808',
    path: 'ios',
    packageManager: 'SPM'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#080808',
      overlaysWebView: true
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true
    }
  },
  server: {
    androidScheme: 'https'
  }
}

export default config
