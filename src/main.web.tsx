import { createRoot } from 'react-dom/client'
import { createWebAPI } from './lib/platform-web'
import App from './App'
import './styles/global.css'

window.topaz = createWebAPI()

createRoot(document.getElementById('root')!).render(<App />)
