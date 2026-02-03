'use client';

import '@/presenters/css/globals.css';
import { Inter } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Suspense, useEffect } from 'react';
import { initializeAxiosInterceptors } from '@/utils/axiosInterceptors';
import { AuthProvider } from '@/providers/AuthProvider';

const inter = Inter({ subsets: ['latin'] });

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#4D750F]" />
    </div>}>
      {children}
    </Suspense>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    initializeAxiosInterceptors();
  }, []);

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.png" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <SessionProvider>
          <AuthProvider>
            <ThemeProvider defaultTheme="system" enableSystem>
              <SuspenseWrapper>
                {children}
              </SuspenseWrapper>
            </ThemeProvider>
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}



