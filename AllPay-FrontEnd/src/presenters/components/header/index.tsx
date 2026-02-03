'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import UserProfile from './UserProfile';
import { useSession, signIn } from 'next-auth/react';

const Header = () => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });
  const valueSesion: any = session;

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  if (!mounted) {
    return (
      <header className="drop-shadow-1 sticky top-0 z-40 flex w-full bg-white shadow">
        <div className="shadow-2 flex flex-grow items-center justify-between px-4 py-4 md:px-4 2xl:px-8">
          <div className="text-[#562707] rounded-lg p-2">
            <pre className="font-mono font-bold text-md sm:text-xl" style={{ lineHeight: '20px' }}>
              {session ? valueSesion?.user?.nombre_de_usuario : 'Cargando...'}
            </pre>
          </div>
          <div className="block sm:w-1/3" />
          <div className="2xsm:gap-5 flex items-center gap-2">
            <UserProfile />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className={`drop-shadow-1 sticky top-0 z-40 flex w-full shadow ${
        isDarkMode ? 'bg-[#260f00]' : 'bg-white'
      }`}
    >
      <div className="shadow-2 flex flex-grow items-center justify-between px-4 py-4 md:px-4 2xl:px-8">
        <div
          className={`${isDarkMode ? 'text-white' : 'text-[#562707]'
            } rounded-lg p-2 ${isDarkMode ? 'hover:bg-[#78390e] focus:bg-[#78390e]' : 'hover:bg-gray-100 focus:bg-gray-100'}`}
          style={{
            fontSize: '14px', // Ajuste manual para tamaño personalizado
            lineHeight: '18px' // Altura de línea para mejorar la legibilidad
          }}
        >
          {session ? (
            <pre
              className="font-mono font-bold text-md sm:text-xl"
              style={{
                lineHeight: '20px'
              }}
            >
              {valueSesion.user.nombre_de_usuario}
            </pre>
          ) : (
            <p
              className="font-bold"
              style={{
                fontSize: '14px',
                lineHeight: '18px'
              }}
            >
              No hay sesión activa
            </p>
          )}
        </div>

        <div className="block sm:w-1/3" />
        <div className="2xsm:gap-5 flex items-center gap-2">
          <UserProfile />
        </div>
      </div>
    </header>
  );
};

export default Header;
