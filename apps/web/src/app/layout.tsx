import type { Metadata } from 'next';
import Script from 'next/script';
import { Toaster } from 'sonner';
import { inter, jakarta, jetbrains } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'UltraIa — AI that creates AI and learns from AI',
  description:
    'Describe a task, UltraIa builds a purpose-built AI agent and improves it from real usage feedback, with human approval at every step.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        {children}
        <Toaster theme="dark" position="bottom-right" richColors />
        {process.env.NODE_ENV === 'development' && (
          <Script id="dev-cleanup" strategy="afterInteractive">
            {`(() => {
              if (typeof window === 'undefined') return;
              const BLOCKED = ['#aiinhbfoop','[class*="plurality"]','[class*="deepl"]','iframe[src*="chrome-extension"]','script[src*="chrome-extension"]','link[href*="chrome-extension"]'];
              const remove = () => BLOCKED.forEach(s => document.querySelectorAll(s).forEach(e => e.remove()));
              remove();
              new MutationObserver(muts => {
                for (const m of muts) for (const n of m.addedNodes) {
                  if (n instanceof HTMLElement && !n.closest('#__next') && ['SCRIPT','LINK','STYLE','IFRAME'].includes(n.tagName)) n.remove();
                }
              }).observe(document.documentElement, {childList:true,subtree:true});
            })();`}
          </Script>
        )}
      </body>
    </html>
  );
}

