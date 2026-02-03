import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useTheme } from 'next-themes';

interface AlertErrorProps {
  isOpen: boolean;
  message?: string;
  messageHtml?: React.ReactNode;
  onClose: () => void;
  autoCloseMs?: number;
}

const PORTAL_ID = 'alert-error-portal-root';

const AlertError: React.FC<AlertErrorProps> = ({
  isOpen,
  message = 'Se produjo un error',
  messageHtml,
  onClose,
  autoCloseMs
}) => {
  const portalRef = useRef<HTMLElement | null>(null);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let portalRoot = document.getElementById(PORTAL_ID);
    if (!portalRoot) {
      portalRoot = document.createElement('div');
      portalRoot.id = PORTAL_ID;
      document.body.appendChild(portalRoot);
    }
    portalRef.current = portalRoot;
  }, []);

  useEffect(() => {
    if (!autoCloseMs || !isOpen) return;
    const timer = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(timer);
  }, [autoCloseMs, isOpen, onClose]);

  if (typeof window === 'undefined' || !isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Fondo fijo con blur */}
      <div className="absolute inset-0 bg-transparent backdrop-blur-sm" />

      {/* Modal animado */}
      <div className="relative z-10 animate-modalFadeScale">
        <div className={`m-auto rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
          <div className={`w-full max-w-[95vw] md:w-[500px] max-h-[90vh] overflow-y-auto rounded-lg p-6 shadow-lg relative ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className={`absolute top-4 right-4 text-2xl font-bold ${isDarkMode ? 'text-white hover:text-red-400' : 'text-[#562707] hover:text-red-700'}`}
            >
              &times;
            </button>

            {/* Contenido */}
            <div className="mt-4 flex flex-col items-center gap-6 pt-4 text-center">
              {/* Logo */}
              <div className="w-48">
                <Image
                  src={isDarkMode ? "/images/corporate/logo-white.png" : "/images/corporate/logo.png"}
                  alt="Federación Nacional de Cacaoteros"
                  width={200}
                  height={100}
                  style={{ width: '100%', height: 'auto' }}
                  priority
                />
              </div>

              <h2 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                SEÑOR(A) RECAUDOR(A)
              </h2>

              {/* Mensaje */}
              {messageHtml && (
                <p className={`font-semibold max-w-xs ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>{messageHtml}</p>
              )}
              {message && (
                <p className={`font-semibold max-w-xs whitespace-pre-line ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                  {message}
                </p>
              )}

              {/* Botón */}
              <Button title="Aceptar" onClick={onClose}>
                Aceptar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos de animación */}
      <style jsx global>{`
        @keyframes modalFadeScale {
          0% {
            opacity: 0;
            transform: scale(0.85);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-modalFadeScale {
          animation: modalFadeScale 0.25s ease-out both;
        }
      `}</style>
    </div>
  );

  return portalRef.current ? createPortal(modalContent, portalRef.current) : modalContent;
};

export default AlertError;