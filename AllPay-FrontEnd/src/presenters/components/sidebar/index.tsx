'use client';
import React, { useState, useEffect } from 'react';
import { Disclosure } from '@headlessui/react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useSidebar } from '@/presenters/components/sidebar/hook/useSidebar';
import { Path } from '@/application/shared/path.enum';
import Logo from '@/presenters/components/shared/logo/Logo';

interface SidebarProps {
  entorno: string;
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ entorno, sidebarOpen, setSidebarOpen }) => {
  const { theme } = useTheme();
  const { menu, moduloActivo, setModuloActivo } = useSidebar(entorno);
  const [isClosing, setIsClosing] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';


  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (!sidebarOpen) {
      setIsClosing(true);
      timer = setTimeout(() => setIsClosing(false), 300);
    } else {
      setIsClosing(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [sidebarOpen]);

  if (!mounted) {
    return null;
  }

  return (
    <>
      {sidebarOpen && !isLargeScreen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-lg transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* BOTÓN DE HAMBURGUESA SIEMPRE VISIBLE */}
      {!isLargeScreen && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`fixed top-6 left-4 z-50 flex h-8 w-8 flex-col items-center justify-center rounded-lg shadow-lg ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-gray-100'}`}
        >
          <span
            className={`${isDarkMode ? 'bg-white' : 'bg-black'
              } mb-1 h-0.5 w-6 rounded transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-y-2 rotate-45' : ''
              }`}
          />
          <span
            className={`${isDarkMode ? 'bg-white' : 'bg-black'
              } mb-1 h-0.5 w-6 rounded transition-all duration-300 ease-in-out ${sidebarOpen ? 'opacity-0' : ''
              }`}
          />
          <span
            className={`${isDarkMode ? 'bg-white' : 'bg-black'
              } h-0.5 w-6 rounded transition-all duration-300 ease-in-out ${sidebarOpen ? '-translate-y-2 -rotate-45' : ''
              }`}
          />
        </button>
      )}

      {/* SIDEBAR FIJO Y CON Z-50 */}
      {mounted && (
        <aside
          className={`fixed top-0 left-0 z-50 flex h-screen flex-col justify-between overflow-y-auto shadow-lg transition-all duration-300 ${sidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full'
            } ${isDarkMode ? 'bg-[#260f00] border-r border-white/20' : 'bg-white'}`}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: isDarkMode ? '#4D750F #3d1a00' : '#4D750F #f1f1f1'
          }}
        >
          {/* LOGO SUPERIOR */}

          <div className="relative z-50 flex items-center justify-center p-4">
            <Link href={Path.Home} className="flex items-center">
              <Image
                width={150}
                height={32}
                src={
                  isDarkMode
                    ? '/images/corporate/logo-white.png'
                    : '/images/corporate/logo.png'
                }
                alt="Logo"
                priority
              />
            </Link>

            {/* BOTÓN HAMBURGUESA QUE ABRE Y CIERRA EL SIDEBAR */}
            {!isLargeScreen && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`absolute top-4 right-4 mt-3 flex h-8 w-8 items-center justify-center rounded-lg shadow-lg text-lg font-bold ${isDarkMode ? 'bg-[#260f00] border border-white/20 text-white' : 'bg-gray-100 text-[#562707]'}`}
              >
                X
              </button>
            )}
          </div>

          {/* CONTENIDO DEL SIDEBAR */}
          <div
            className={`flex-1 overflow-y-auto px-2 ${!sidebarOpen && !isClosing ? 'hidden' : ''}`}
          >
            <ul className="mt-10 space-y-1">
              {menu
                ?.filter((subsistema) => subsistema.modulos.length > 0)
                .map((subsistema) => {
                  const moduloSeleccionado = subsistema.modulos.some(
                    (modulo) => modulo.id_modulo === moduloActivo
                  );
                  return (
                    <Disclosure as="div" key={subsistema.subsistema}>
                      {({ open }) => (
                        <>
                          <Disclosure.Button
                            className={`hs-accordion-toggle flex w-full items-center gap-x-3 rounded-lg px-2.5 py-2 text-start text-sm focus:outline-none ${sidebarOpen && moduloSeleccionado
                              ? 'bg-[#4D750F] text-white'
                              : isDarkMode
                                ? 'bg-opacity-10 text-white hover:bg-[#78390e] focus:bg-[#78390e]'
                                : 'text-[#562707] hover:bg-gray-100 focus:bg-gray-100'
                              }`}
                          >
                            {sidebarOpen && subsistema.desc_subsistema}
                            <svg
                              className={`ms-auto transition-transform ${open ? 'rotate-180' : ''
                                } ${!sidebarOpen && 'hidden'}`}
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="m18 15-6-6-6 6" />
                            </svg>
                          </Disclosure.Button>
                          {sidebarOpen && (
                            <Disclosure.Panel className="space-y-1 ps-7 pt-1">
                              <ul>
                                {subsistema.modulos.map((modulo) => (
                                  <li key={modulo.id_modulo}>
                                    <Link 
                                      href={modulo.ruta_formulario?.startsWith('/') ? modulo.ruta_formulario : `/${modulo.ruta_formulario || ''}`}
                                      onClick={() => {
                                        setModuloActivo(modulo.id_modulo);
                                        localStorage.setItem(
                                          'moduloActivo',
                                          String(modulo.id_modulo)
                                        );
                                      }}
                                      className={`flex items-center gap-x-3 rounded-lg px-2.5 py-2 text-sm ${sidebarOpen && moduloActivo === modulo.id_modulo
                                        ? 'bg-[#4D750F] text-white'
                                        : isDarkMode
                                          ? 'bg-opacity-10 text-white hover:bg-[#78390e] focus:bg-[#78390e]'
                                          : 'text-[#562707] hover:bg-gray-100'
                                        }`}
                                    >
                                      {modulo.nombre_modulo}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </Disclosure.Panel>
                          )}
                        </>
                      )}
                    </Disclosure>
                  );
                })}
            </ul>
          </div>

          {/* LOGO SIEMPRE FIJO ABAJO */}
          {sidebarOpen && (
            <div className="px-4 py-4">
              <Logo />
            </div>
          )}
        </aside>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main
        className={`transition-all duration-300 ${isLargeScreen ? (sidebarOpen ? 'ml-64' : 'ml-0') : 'ml-0'
          } ${isDarkMode ? 'bg-[#260f00]' : 'bg-transparent'}`}
      >
        <div className="p-4">{/* Aquí va el contenido principal */}</div>
      </main>
    </>
  );
};

export default Sidebar;
