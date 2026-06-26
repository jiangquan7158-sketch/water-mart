'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  Mail,
  MapPin,
  Phone,
  ChevronRight,
  Youtube,
  Twitter,
  Instagram,
  Facebook,
} from 'lucide-react';

export function Footer() {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-600">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              </div>
              <span className="text-xl font-extrabold text-white">
                Water<span className="text-sky-400">Mart</span>
              </span>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-gray-400">
              {t('hero.subtitle')}
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-400" />
                <span className="text-gray-400">123 Water Street, Suite 100<br />San Francisco, CA 94105</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 flex-shrink-0 text-sky-400" />
                <a href="mailto:hello@watermart.com" className="text-gray-400 hover:text-white transition-colors">
                  hello@watermart.com
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 flex-shrink-0 text-sky-400" />
                <a href="tel:+1800WATERMART" className="text-gray-400 hover:text-white transition-colors">
                  +1 (800) WATERMART
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              {t('footer.quickLinks')}
            </h3>
            <ul className="space-y-3 text-sm">
              {[
                { key: 'nav.home', href: `/${locale}` },
                { key: 'nav.shop', href: `/${locale}/search` },
                { key: 'footer.aboutUs', href: `/${locale}/about` },
                { key: 'footer.blog', href: `/${locale}/blog` },
                { key: 'footer.careers', href: `/${locale}/careers` },
                { key: 'footer.press', href: `/${locale}/press` },
              ].map((link) => (
                <li key={link.key}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-1 text-gray-400 transition-colors hover:text-white"
                  >
                    <ChevronRight className="h-3 w-3" />
                    {t(link.key as any)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              {t('footer.customerService')}
            </h3>
            <ul className="space-y-3 text-sm">
              {[
                { key: 'footer.helpCenter', href: `/${locale}/help` },
                { key: 'footer.trackOrder', href: `/${locale}/track` },
                { key: 'footer.returns', href: `/${locale}/returns` },
                { key: 'footer.shippingInfo', href: `/${locale}/shipping` },
                { key: 'footer.privacyPolicy', href: `/${locale}/privacy` },
                { key: 'footer.termsOfService', href: `/${locale}/terms` },
              ].map((link) => (
                <li key={link.key}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-1 text-gray-400 transition-colors hover:text-white"
                  >
                    <ChevronRight className="h-3 w-3" />
                    {t(link.key as any)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              {t('footer.newsletter')}
            </h3>
            <p className="mb-4 text-sm text-gray-400">{t('footer.newsletterDesc')}</p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex gap-2"
            >
              <input
                type="email"
                placeholder={t('footer.emailPlaceholder')}
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
              >
                {t('footer.subscribe')}
              </button>
            </form>
            {/* Social Links */}
            <div className="mt-6">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t('footer.followUs')}
              </h4>
              <div className="flex gap-3">
                {[
                  { icon: Facebook, href: '#', label: 'Facebook' },
                  { icon: Twitter, href: '#', label: 'Twitter' },
                  { icon: Instagram, href: '#', label: 'Instagram' },
                  { icon: Youtube, href: '#', label: 'YouTube' },
                ].map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition-colors hover:bg-sky-500 hover:text-white"
                    aria-label={social.label}
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-xs text-gray-500">{t('footer.copyright')}</p>
          <div className="flex items-center gap-3">
            {/* Payment Method Icons */}
            <div className="flex items-center gap-1.5">
              <div className="rounded bg-white px-2 py-1 text-[10px] font-bold text-blue-800">VISA</div>
              <div className="rounded bg-white px-2 py-1 text-[10px] font-bold text-red-500">MC</div>
              <div className="rounded bg-white px-2 py-1 text-[10px] font-bold text-blue-600">AMEX</div>
              <div className="rounded bg-white px-2 py-1 text-[10px] font-bold text-[#003087]">PayPal</div>
              <div className="rounded bg-white px-2 py-1 text-[10px] font-bold text-green-600">Stripe</div>
              <div className="rounded bg-white px-2 py-1 text-[10px] font-bold text-gray-800">Apple Pay</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
