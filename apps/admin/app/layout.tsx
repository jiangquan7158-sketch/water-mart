'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { Toaster } from 'sonner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const handleResize = useCallback(() => {
    const mobile = window.innerWidth < 1024;
    setIsMobile(mobile);
    if (mobile) {
      setSidebarCollapsed(false);
      setMobileMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const handleCloseMobile = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const handleToggleMobile = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar - desktop */}
      <div
        className={`hidden lg:flex flex-shrink-0 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          mobileOpen={false}
          onClose={() => {}}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* Sidebar - mobile overlay */}
      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleCloseMobile}
          />
          {/* Side panel */}
          <div className="absolute inset-y-0 left-0 w-64 animate-slide-in-left">
            <Sidebar
              collapsed={false}
              mobileOpen={true}
              onClose={handleCloseMobile}
              onToggleCollapse={() => {}}
            />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header onMenuToggle={handleToggleMobile} />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>

      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
          },
        }}
      />
    </div>
  );
}
