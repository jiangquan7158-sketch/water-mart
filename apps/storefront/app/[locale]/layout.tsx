import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Toaster } from 'sonner';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

const locales = [
  'en', 'zh', 'ja', 'ko', 'de', 'fr', 'es', 'pt',
  'ar', 'ru', 'hi', 'th', 'vi', 'id', 'it', 'nl',
  'pl', 'sv', 'tr', 'uk',
];

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'font-sans text-sm',
          duration: 4000,
        }}
      />
    </NextIntlClientProvider>
  );
}
