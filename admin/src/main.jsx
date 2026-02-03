import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App.jsx'
import './index.css'

// Context Providers
import AppContextProvider from './context/AppContext.jsx'
import AdminContextProvider from './context/AdminContext.jsx'
import StaffContextProvider from './context/StaffContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  // React.StrictMode is good for development (catches bugs), 
  // but sometimes causes double-renders in dev mode. This is normal.
  <React.StrictMode> 
    <BrowserRouter>
      {/* 1. AppContextProvider: Global state (e.g., currency, theme, general data).
        2. AdminContextProvider: Admin-specific state (token, room management).
        3. StaffContextProvider: Staff-specific state.
      */}
      <AppContextProvider>
        <AdminContextProvider>
          <StaffContextProvider>
            <App />
          </StaffContextProvider>
        </AdminContextProvider>
      </AppContextProvider>
    </BrowserRouter>
  </React.StrictMode>,
)