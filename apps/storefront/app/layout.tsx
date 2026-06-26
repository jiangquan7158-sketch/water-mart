import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    template: '%s | WaterMart',
    default: 'WaterMart - Global Water Products Marketplace',
  },
  description:
    'Your global marketplace for premium water products, filtration systems, and hydration solutions.',
  keywords: [
    'water products',
    'filtration',
    'hydration',
    'water bottles',
    'water filters',
    'marketplace',
  ],
  authors: [{ name: 'WaterMart' }],
  metadataBase: new URL('https://watermart.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'WaterMart',
    title: 'WaterMart - Global Water Products Marketplace',
    description:
      'Your global marketplace for premium water products, filtration systems, and hydration solutions.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WaterMart - Global Water Products Marketplace',
    description:
      'Your global marketplace for premium water products, filtration systems, and hydration solutions.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
