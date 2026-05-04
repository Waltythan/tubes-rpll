import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './hooks/useAuth'
import { LoadingProvider } from './hooks/useLoading'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LoadingProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </LoadingProvider>
  </React.StrictMode>
)
