'use client';

import { useEffect, useState, useRef } from 'react';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import Logout from '@/presenters/components/modules/auth/Logout';
import { SessionHook } from '@/adapters/modules/auth/session-hook';
import Link from 'next/link';
import LogoNoche from '@/presenters/components/shared/logo/logoNoche';
import LogoDia from '@/presenters/components/shared/logo/LogoDia';
import { useProfileImage } from './hooks/useProfileImage';
import LogoHome from '@/presenters/components/shared/logo/LogoHome';
import LogoNotificacion from '@/presenters/components/shared/logo/LogoNotificacion';
// import LogoActivo from '../ui/LogoActivo';
import { useRouter } from 'next/navigation';
import Badge from '@mui/material/Badge';
import { signIn, useSession } from 'next-auth/react';
import { fetchBandejaByPersona } from './services/index.service';

const DropdownUser = () => {
  const { theme, setTheme } = useTheme();
  const { sessionToken } = SessionHook();
  const [, setIsLoading] = useState(true);
  const [menuUser, setMenuUser] = useState(false);
  const [menuAlert, setMenuAlert] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { imageProfile, isLoading: isProfileLoading } = useProfileImage();

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setMenuUser(false);
        setMenuAlert(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const dropdown = (value: string) => {
    if (value === 'user') {
      setMenuAlert(false);
      setMenuUser(!menuUser);
    } else {
      setMenuAlert(!menuAlert);
      setMenuUser(false);
    }
  };

  useEffect(() => {
    if (sessionToken !== null) {
      setIsLoading(false);
    }
  }, [sessionToken]);

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });
  
  const token = (session as any)?.user?.tokens?.access;
  const [pendientesLeer, setPendientesLeer] = useState(false);
  const [bandejaData, setBandejaData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!token) {
        return;
      }

      try {
        const data = await fetchBandejaByPersona(token);
        if (data) {
          setBandejaData(data);
          setPendientesLeer(data.pendientes_leer);

          // Guardar en sessionStorage como "bandeja"
          sessionStorage.setItem('bandeja', JSON.stringify(data));
        }
      } catch (error) {
        console.error('[UserProfile] - Error al cargar bandeja:', error);
      }
    };

    // Al montar, cargar primero desde sessionStorage si existe
    const stored = sessionStorage.getItem('bandeja');
    
    if (stored) {
      try {
        const bandejaGuardada = JSON.parse(stored);
        setBandejaData(bandejaGuardada);
        setPendientesLeer(bandejaGuardada.pendientes_leer);
      } catch (error) {
        console.error('[UserProfile] - Error al parsear bandeja guardada:', error);
      }
    }

    // Ejecutar inmediatamente al montar si hay token
    if (token) {
      loadData();
    }

    // Ejecutar cada 5 minutos (300000 ms) solo si hay token
    const intervalId = setInterval(() => {
      if (token) {
        loadData();
      }
    }, 300000);

    // Limpiar el intervalo al desmontar
    return () => clearInterval(intervalId);
  }, [token]);

  

  const handleClick = () => {
    if (!bandejaData) return;
    sessionStorage.setItem('bandeja', JSON.stringify(bandejaData));
    router.push('/seguridad/alertas/');
  };

  const isDarkMode = mounted && theme === 'dark';

  if (!mounted) return null;

  return (
    <div className="relative">
      <div className="flex items-center gap-4">

      {/* Cambiar tema */}
      <span className="text-left sm:block">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-12 w-12 items-center justify-center rounded-lg p-2"
          >
            {theme !== 'dark' ? <LogoNoche /> : <LogoDia />}
          </button>
        </span>
        {/* Notificaciones */}
        <span className="text-left sm:block">
          {' '}
          <button onClick={handleClick}>
            <Badge
              color="secondary"
              variant="dot"
              invisible={!pendientesLeer}
              sx={{
                '& .MuiBadge-dot': {
                  backgroundColor: '#4D750F',
                  width: 15,
                  height: 15,
                  borderRadius: '50%'
                }
              }}
            >
              <LogoNotificacion />
            </Badge>
          </button>
        </span>
        <span className="mt-2 text-left sm:block">
          {' '}
          {/* Añade mt-2 (margin-top: 0.5rem) o el valor que necesites */}
          <button onClick={() => router.push('/home')}>
            <LogoHome />
          </button>
        </span>

        {/* Imagen del perfil del usuario */}
        <span className="text-left sm:block">
          <div className="flex items-center justify-center">
            <button
              ref={buttonRef}
              onClick={() => dropdown('user')}
              className="h-12 w-12 cursor-pointer rounded-lg p-2"
            >
              <div className="items-center">
                {(() => {
    
                  
                  const imageSrc = isProfileLoading || !imageProfile
                    ? '/images/user.jpg'
                    : imageProfile;
                  
                  
                  return (
                    <img
                      className="h-8 w-12 rounded-full"
                      src={imageSrc}
                      alt="Profile"
                      onError={(e) => {
                        console.error('[UserProfile] - Error al cargar imagen:', e);
                        e.currentTarget.src = '/images/user.jpg';
                      }}
                    
                    />
                  );
                })()}
              </div>
            </button>
          </div>

          {menuUser && (
            <div
              ref={menuRef}
              className={`duration-00 absolute end-0 z-10 mt-2 w-56 transform rounded-md shadow-lg transition-all ${
                menuUser
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none -translate-y-2 opacity-0'
              } ${
                isDarkMode
                  ? 'bg-[#260f00] text-white border border-white/20 divide-y divide-white/20'
                  : 'bg-white border border-gray-100 divide-y divide-gray-100'
              }`}
              role="menu"
            >
              <div className="p-2">
                <Link
                  href="/profile"
                  className={`block rounded-lg px-4 py-2 text-sm ${
                    isDarkMode
                      ? 'text-white hover:bg-[#78390e] focus:bg-[#78390e]'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setMenuUser(false)}
                  role="menuitem"
                >
                  Mi Perfil
                </Link>
              </div>

              <div className="p-2">
                <Logout />
              </div>
            </div>
          )}
        </span>
        {/* Fin menu */}
        <span className="h-12 w-12 rounded-full">
          <Image
            width={112}
            height={112}
            src={'/images/corporate/icon.png'}
            style={{
              width: 'auto',
              height: 'auto'
            }}
            alt=""
            className="rounded-full"
          />
        </span>
      </div>
    </div>
  );
};

export default DropdownUser;
