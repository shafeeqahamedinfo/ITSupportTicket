import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import NotificationPanel from '../components/NotificationPanel';

/**
 * MainLayout
 * Wraps all authenticated pages with Sidebar + Header + NotificationPanel.
 * The NotificationPanel slides in from the right when the bell icon is clicked.
 */
export default function MainLayout({ children, title = 'SmartCampus ITCare' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }} className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-200 w-full max-w-full overflow-x-hidden">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, marginLeft: 260 }}
        className="main-content transition-all duration-200 w-full max-w-full overflow-x-hidden"
      >
        {/* Header */}
        <Header
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Page Content with Standard Container Padding */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-[1500px] w-full max-w-full mx-auto overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Global Notification Panel */}
      <NotificationPanel />

      <style>{`
        @media (max-width: 1024px) {
          .main-content { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
