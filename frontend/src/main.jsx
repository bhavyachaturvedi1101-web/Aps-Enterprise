import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { setupAuthFetch } from './services/api.js'

// Initialize global authentication interceptor for all HTTP requests
setupAuthFetch();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
