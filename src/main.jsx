import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// SW'yi hemen kaydet; yeni sürüm gelince sayfayı otomatik yenile
registerSW({
  immediate: true,
  onRegistered(r) {
    // Her 60 dakikada bir güncelleme kontrolü
    r && setInterval(() => r.update(), 60 * 60 * 1000)
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
