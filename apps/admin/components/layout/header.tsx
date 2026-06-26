'use client';

import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import clsx from 'clsx';
import * as Avatar from '@radix-ui/react-avatar';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface HeaderProps {
  onMenuToggle: () => void;
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/products': 'Products',
  '/products/scraper': 'Product Scraper',
  '/products/ai-optimize': 'AI Optimization',
  '/orders': 'Orders',
  '/affiliates': 'Affiliates',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

export default function Header({ onMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Derive page title from pathname
  const pageTitle =
    pageTitles[pathname] ||
    (() => {
      // Check prefix match for nested routes
      for (const [route, title] of Object.entries(pageTitles)) {
        if (route !== '/' && pathname.startsWith(route)) {
          return title;
        }
      }
      return 'Dashboard';
    })();

  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would navigate to a search results page
    setSearchQuery('');
    setSearchOpen(false);
  };

  return (
    <header className="flex items-center h-16 px-4 md:px-6 bg-slate-900 border-b border-slate-800 flex-shrink-0 gap-4">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-white hidden sm:block">
          {pageTitle}
        </h1>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Search */}
        {searchOpen ? (
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-48 md:w-64 h-9 pl-9 pr-3 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              onBlur={() => {
                if (!searchQuery) setSearchOpen(false);
              }}
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          </form>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Open search"
          >
            <Search className="w-5 h-5" />
          </button>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>
          <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
            3
          </span>
        </div>

        {/* User avatar dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="User menu"
            >
              <Avatar.Root className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-medium flex-shrink-0">
                <Avatar.Fallback>AD</Avatar.Fallback>
              </Avatar.Root>
              <ChevronDown className="hidden sm:block w-4 h-4 text-slate-400" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[12rem] bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-1 animate-fade-in"
              sideOffset={8}
              align="end"
            >
              <div className="px-3 py-2 border-b border-slate-700 mb-1">
                <p className="text-sm font-medium text-white">Admin User</p>
                <p className="text-xs text-slate-400">admin@watermart.com</p>
              </div>
              <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-md cursor-pointer outline-none transition-colors">
                <User className="w-4 h-4" />
                Profile
              </DropdownMenu.Item>
              <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-md cursor-pointer outline-none transition-colors">
                <Settings className="w-4 h-4" />
                Settings
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="h-px bg-slate-700 my-1" />
              <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-700 rounded-md cursor-pointer outline-none transition-colors">
                <LogOut className="w-4 h-4" />
                Sign Out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
