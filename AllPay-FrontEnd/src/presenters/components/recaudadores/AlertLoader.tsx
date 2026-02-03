// components/AlertLoader.tsx
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';


interface AlertLoaderProps {
  /** Abre o cierra el modal */
  isOpen: boolean;
  /** Texto opcional que aparecerá debajo del título */
  loadingText?: string;
}

const PORTAL_ID = 'alert-loader-portal-root';

/**
 * Alerta tipo "loader" reutilizable.
 * Muestra el logo corporativo, un título y un spinner animado.
 * Perfecta para bloquear la interfaz mientras se completan peticiones.
 *
 * Uso:
 * ----
 * const [loading, setLoading] = useState(false);
 *
 * <AlertLoader
 *   isOpen={loading}
 *   loadingText="Procesando información, por favor espere…"
 * />
 */
const AlertLoaderComponent: React.FC<AlertLoaderProps> = ({
  isOpen,
  loadingText = 'Cargando…'
}) => {
  const portalRef = useRef<HTMLElement | null>(null);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Crea el div del portal si no existe
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let portalRoot = document.getElementById(PORTAL_ID);
    if (!portalRoot) {
      portalRoot = document.createElement('div');
      portalRoot.id = PORTAL_ID;
      portalRoot.style.zIndex = '10001'; // Más alto que AlertQuestion (9999-10000)
      document.body.appendChild(portalRoot);
    }
    portalRef.current = portalRoot;

    // Bloquear scroll del body cuando el loader está abierto
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup al desmontar
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (typeof window === 'undefined' || !isOpen || !mounted) return null;

  const isDarkMode = theme === 'dark';

  const loaderContent = (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-[10002]">
        <div className={`m-auto rounded-xl p-6 ${
          isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'
        }`}>
          <div className={`w-full max-w-[95vw] md:w-[500px] rounded-lg p-6 shadow-lg ${
            isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'
          }`}>
            <div className="flex flex-col items-center gap-6 pt-4">
        {/* Logo */}
        <div className="w-24 sm:w-48">
          <Image
            src={isDarkMode ? "/images/corporate/logo-white.png" : "/images/corporate/logo.png"}
            alt="Federación Nacional de Cacaoteros"
            width={200}
            height={100}
            style={{ width: '100%', height: 'auto' }}
            priority
          />
        </div>

        {/* Título */}
        <h2 className={`font-bold text-lg ${
          isDarkMode ? 'text-white' : 'text-[#562707]'
        }`}>
          POR FAVOR ESPERE
        </h2>

        {/* Texto de apoyo */}
        <p className={`text-center max-w-xs ${
          isDarkMode ? 'text-white' : 'text-[#562707]'
        }`}>
          {loadingText}
        </p>

        {/* Spinner */}
        <div className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin ${
          isDarkMode ? 'border-white' : 'border-[#4D750F]'
        }`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Si el portal está listo, úsalo. Si no, renderiza inline.
  return portalRef.current
    ? createPortal(loaderContent, portalRef.current)
    : loaderContent;
};

export default AlertLoaderComponent;