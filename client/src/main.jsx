import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/*
        Provider order:
        1. AuthProvider      — authentication state (JWT, user object)
        2. SocketProvider    — Socket.IO connection (needs auth user to connect)
        3. NotificationProvider — notification state (needs socket for live events)
      */}
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <App />

            {/* Global Toast Container */}
            <Toaster
              position="top-right"
              reverseOrder={false}
              gutter={8}
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'rgba(15,23,42,0.95)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: '14px',
                  fontSize: '13px',
                  fontFamily: 'Inter, sans-serif',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  padding: '12px 16px',
                },
                success: {
                  iconTheme: { primary: '#22c55e', secondary: '#fff' },
                  style: { border: '1px solid rgba(34,197,94,0.3)' },
                },
                error: {
                  iconTheme: { primary: '#ef4444', secondary: '#fff' },
                  style: { border: '1px solid rgba(239,68,68,0.3)' },
                  duration: 6000,
                },
              }}
            />
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
