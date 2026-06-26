'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Droplets,
} from 'lucide-react';
import clsx from 'clsx';
import * as Tooltip from '@radix-ui/react-tooltip';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Orders', href: '/orders', icon: ShoppingBag },
  { label: 'Affiliates', href: '/affiliates', icon: Users },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar({
  collapsed,
  mobileOpen,
  onClose,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* Logo area */}
      <div className="flex items-center h-16 px-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-sm">
            <Droplets className="w-5 h-5" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-lg text-white whitespace-nowrap">
              WaterMart
              <span className="text-blue-400"> Admin</span>
            </span>
          )}
        </div>
        {mobileOpen && (
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Close sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const active = isActive(item.href);

          const linkContent = (
            <Link
              href={item.href}
              onClick={mobileOpen ? onClose : undefined}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                active
                  ? 'bg-blue-600/10 text-blue-400 border-l-3 border-blue-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 border-l-3 border-transparent'
              )}
            >
              <IconComponent
                className={clsx(
                  'w-5 h-5 flex-shrink-0',
                  active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                )}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip.Provider key={item.href} delayDuration={300}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>{linkContent}</Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="right"
                      sideOffset={8}
                      className="z-50 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 border border-slate-700 rounded-md shadow-lg"
                    >
                      {item.label}
                      <Tooltip.Arrow className="fill-slate-800" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            );
          }

          return <div key={item.href}>{linkContent}</div>;
        })}
      </nav>

      {/* Collapse toggle - desktop only, hidden on mobile */}
      <div className="p-3 border-t border-slate-800 hidden lg:block">
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center w-full p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              {!collapsed && <span className="ml-2 text-xs">Collapse</span>}
            </>
          )}
        </button>
      </div>
    </div>
  );

  return sidebarContent;
}
