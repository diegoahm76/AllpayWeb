'use client';

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import Sidebar from '@/presenters/components/sidebar';
import Header from '@/presenters/components/header';
import '@/presenters/css/background.css';
import { signIn, useSession } from 'next-auth/react';
import FloatingChat from '@/presenters/components/floating-chat';


export default function DefaultLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [entorno, setEntorno] = useState('');

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const valueSesion: any = session;

  useEffect(() => {
    if (valueSesion?.user?.tipo_usuario) {
      setEntorno(valueSesion.user.tipo_usuario);
    }
  }, [valueSesion]);

  return (
    <ThemeProvider attribute="class" defaultTheme="false" enableSystem={false}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} entorno={entorno} />
        <div className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto transition-all duration-300">
          <Header />

          <main>
            <div className="background2">
              <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">{children}</div>
            </div>
          </main>

          <FloatingChat />
        </div>
      </div>
    </ThemeProvider>
  );
}
