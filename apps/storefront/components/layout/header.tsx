'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  ShoppingCart,
  Menu,
  X,
  User,
  Globe,
  ChevronDown,
  Package,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const locales = [
  'en', 'zh', 'ja', 'ko', 'de', 'fr', 'es', 'pt',
  'ar', 'ru', 'hi', 'th', 'vi', 'id', 'it', 'nl',
  'pl', 'sv', 'tr', 'uk',
];

const LANGUAGES: Record<string, string> = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  pt: 'Português',
  ar: 'العربية',
  ru: 'Русский',
  hi: 'हिन्दी',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  it: 'Italiano',
  nl: 'Nederlands',
  pl: 'Polski',
  sv: 'Svenska',
  tr: 'Türkçe',
  uk: 'Українська',
};

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'KRW', symbol: '₩', name: 'Korean Won' },
];

export function Header() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [searchOpen, setSearchOpen] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  // Switch locale by replacing the leading /<locale> segment in the pathname.
  const switchLocale = (nextLocale: string) => {
    const segments = pathname.split('/');
    // pathname is like "/en/search" → ["", "en", "search"]
    const current = segments[1];
    if (current && locales.includes(current)) {
      segments[1] = nextLocale;
    } else {
      segments.splice(1, 0, nextLocale);
    }
    const next = segments.join('/') || `/${nextLocale}`;
    router.push(next);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setIsLangOpen(false);
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) setIsCurrencyOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setIsAccountOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const cartCount = 2; // example count

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-600">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </div>
          <span className="text-xl font-extrabold text-gray-900">
            Water<span className="text-sky-500">Mart</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-8 lg:flex">
          <Link
            href={`/${locale}`}
            className="text-sm font-medium text-gray-700 transition-colors hover:text-sky-600"
          >
            {t('nav.home')}
          </Link>
          <Link
            href={`/${locale}/search`}
            className="text-sm font-medium text-gray-700 transition-colors hover:text-sky-600"
          >
            {t('nav.shop')}
          </Link>
          <Link
            href={`/${locale}/about`}
            className="text-sm font-medium text-gray-700 transition-colors hover:text-sky-600"
          >
            {t('nav.about')}
          </Link>
          <Link
            href={`/${locale}/contact`}
            className="text-sm font-medium text-gray-700 transition-colors hover:text-sky-600"
          >
            {t('nav.contact')}
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Search Toggle */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-sky-600"
            aria-label={t('nav.search')}
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Language Switcher */}
          <div ref={langRef} className="relative hidden sm:block">
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-1 rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
            >
              <Globe className="h-5 w-5" />
              <span className="hidden text-xs font-medium md:block">{LANGUAGES[locale]?.split(' ')[0]}</span>
              <ChevronDown className="hidden h-3 w-3 md:block" />
            </button>
            {isLangOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-100 bg-white py-2 shadow-lg">
                <div className="max-h-64 overflow-y-auto">
                  {Object.entries(LANGUAGES).map(([code, name]) => (
                    <a
                      key={code}
                      onClick={() => {
                        switchLocale(code);
                        setIsLangOpen(false);
                      }}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-gray-50',
                        code === locale ? 'font-semibold text-sky-600 bg-sky-50' : 'text-gray-700'
                      )}
                    >
                      {name}
                      {code === locale && <span className="ml-auto text-xs">✓</span>}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Currency Selector */}
          <div ref={currencyRef} className="relative hidden sm:block">
            <button
              onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
              className="flex items-center gap-1 rounded-full p-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
            >
              {currency}
              <ChevronDown className="h-3 w-3" />
            </button>
            {isCurrencyOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-gray-100 bg-white py-2 shadow-lg">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCurrency(c.code);
                      setIsCurrencyOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-gray-50 text-left',
                      currency === c.code ? 'font-semibold text-sky-600 bg-sky-50' : 'text-gray-700'
                    )}
                  >
                    <span className="font-mono">{c.symbol}</span>
                    {c.code}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart */}
          <Link
            href={`/${locale}/cart`}
            className="relative rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-sky-600"
            aria-label={t('nav.cart')}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Account */}
          <div ref={accountRef} className="relative">
            <button
              onClick={() => setIsAccountOpen(!isAccountOpen)}
              className="flex items-center gap-1 rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
            >
              <User className="h-5 w-5" />
              <ChevronDown className="hidden h-3 w-3 md:block" />
            </button>
            {isAccountOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-100 bg-white py-2 shadow-lg">
                <Link
                  href={`/${locale}/account/orders`}
                  onClick={() => setIsAccountOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Package className="h-4 w-4 text-gray-400" />
                  {t('nav.myOrders')}
                </Link>
                <Link
                  href={`/${locale}/account/settings`}
                  onClick={() => setIsAccountOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4 text-gray-400" />
                  {t('nav.settings')}
                </Link>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => setIsAccountOpen(false)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  {t('nav.logout')}
                </button>
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 lg:hidden"
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {searchOpen && (
        <div className="border-t border-gray-100 bg-white px-4 py-3 lg:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('hero.searchPlaceholder')}
              className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-sky-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value;
                  if (val.trim()) {
                    window.location.href = `/${locale}/search?q=${encodeURIComponent(val.trim())}`;
                  }
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Mobile Slide-out Menu */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed right-0 top-0 z-50 h-full w-72 bg-white shadow-xl lg:hidden overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
              <span className="text-lg font-bold text-gray-900">Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col p-4">
              <Link
                href={`/${locale}`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('nav.home')}
              </Link>
              <Link
                href={`/${locale}/search`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('nav.shop')}
              </Link>
              <Link
                href={`/${locale}/about`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('nav.about')}
              </Link>
              <Link
                href={`/${locale}/contact`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('nav.contact')}
              </Link>
              <div className="my-2 border-t border-gray-100" />
              <div className="px-4 py-2">
                <span className="text-xs font-semibold uppercase text-gray-400">{t('nav.account')}</span>
              </div>
              <Link
                href={`/${locale}/account/orders`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Package className="h-4 w-4 text-gray-400" />
                {t('nav.myOrders')}
              </Link>
              <div className="px-4 py-2">
                <span className="text-xs font-semibold uppercase text-gray-400">Language</span>
              </div>
              <div className="flex flex-wrap gap-2 px-4 py-2">
                {Object.entries(LANGUAGES).slice(0, 8).map(([code, name]) => (
                  <button
                    key={code}
                    onClick={() => {
                      switchLocale(code);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium',
                      code === locale
                        ? 'bg-sky-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
