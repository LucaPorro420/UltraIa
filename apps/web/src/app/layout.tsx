import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Toaster } from 'sonner';
import { inter, jakarta, jetbrains } from '@/lib/fonts';
import { WebVitalsReporter } from '@/components/performance/web-vitals';
import './globals.css';
import { setupDevCleanup } from './development-cleanup';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#8b5cf6',
};

export const metadata: Metadata = {
  title: 'UltraIa — AI that creates AI and learns from AI',
  description:
    'Describe a task, UltraIa builds a purpose-built AI agent and improves it from real usage feedback, with human approval at every step.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'UltraIa',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <WebVitalsReporter />
        {children}
        <Toaster theme="dark" position="bottom-right" richColors />
        {process.env.NODE_ENV === 'development' && setupDevCleanup()}
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }`}
        </Script>
      </body>
    </html>
  );
}

