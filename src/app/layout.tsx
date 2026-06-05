
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { Inter, Lexend, PT_Sans } from 'next/font/google';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { BgmPlayer } from '@/components/bgm-player';
import { FirebaseErrorListener } from '@/components/firebase-error-listener';
import { BgmNotifier } from '@/components/bgm-notifier';
import { PouchNotifier } from '@/components/pouch-notifier';
import { cn } from '@/lib/utils';
import Head from 'next/head';
import Script from 'next/script';
import { ThemeProvider } from '@/components/theme-provider';
import { BgmProvider } from '@/context/bgm-context';
import { LoadingProvider } from '@/context/loading-context';
import { PwaInstallProvider } from '@/context/pwa-install-context';
import { InstallPwaModal } from '@/components/install-pwa-modal';

const fontBody = PT_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '700'],
});

const fontHeadline = PT_Sans({
  subsets: ['latin'],
  variable: '--font-headline',
  weight: ['700'],
});


export const metadata: Metadata = {
  title: 'Icie Wifi Portal',
  description: 'Your one-stop portal for Icie Piso Wifi deals, promos, and events.',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  return (
    <html lang="en" suppressHydrationWarning>
       <head>
          <link rel="manifest" href="/manifest.webmanifest" />
          <link rel="apple-touch-icon" href="/icons/icon-192x192.png"></link>
          <meta name="theme-color" content="#ffffff" />
      </head>
      <body className={`${fontBody.variable} ${fontHeadline.variable} font-body antialiased bg-background`}>
        <FirebaseClientProvider>
          <BgmProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem={false}
            >
              <LoadingProvider>
                <PwaInstallProvider>
                  <div className="min-h-screen flex flex-col">
                    {children}
                  </div>
                  <div id="bubble-bg" className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-[-1]">
                    {Array.from({ length: 15 }).map((_, i) => (
                      <div
                        key={i}
                        className="bubble"
                        style={{
                          left: `${Math.random() * 100}%`,
                          width: `${20 + Math.random() * 40}px`,
                          height: `${20 + Math.random() * 40}px`,
                          animationDuration: `${10 + Math.random() * 10}s`,
                          animationDelay: `${Math.random() * 5}s`,
                        }}
                      />
                    ))}
                  </div>
                  <BgmNotifier />
                  <PouchNotifier />
                  <InstallPwaModal />
                  <Toaster />
                  <FirebaseErrorListener />
                </PwaInstallProvider>
              </LoadingProvider>
            </ThemeProvider>
          </BgmProvider>
        </FirebaseClientProvider>
        <Script id="service-worker-registration">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(registration => {
                  console.log('SW registered: ', registration);
                }).catch(registrationError => {
                  console.log('SW registration failed: ', registrationError);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
