// components/AlertSuccess.tsx
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useTheme } from 'next-themes';

interface AlertSuccessProps {
  isOpen: boolean;
  message?: string;
  messageHtml?: React.ReactNode;
  onClose: () => void;
  autoCloseMs?: number;
}

const PORTAL_ID = 'alert-success-portal-root';

const AlertSuccess: React.FC<AlertSuccessProps> = ({
  isOpen,
  message,
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

  if (typeof window === 'undefined' || !isOpen || !mounted) return null;

  const isDarkMode = theme === 'dark';

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Fondo estático con blur */}
      <div className="absolute inset-0 bg-transparent backdrop-blur-sm" />

      {/* Modal animado */}
      <div className="relative z-10 animate-modalFadeScale">
        <div className={`m-auto rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
          <div className={`w-full max-w-[95vw] md:w-[500px] max-h-[90vh] overflow-y-auto rounded-lg p-6 shadow-lg relative ${
            isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'
          }`}>
            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className={`absolute top-4 right-4 text-2xl font-bold hover:text-red-700 ${
                isDarkMode ? 'text-white' : 'text-[#562707]'
              }`}
            >
              &times;
            </button>

            {/* Contenido */}
            <div className="mt-4 flex flex-col items-center gap-6 pt-4 text-center">
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

              <h2 className={`font-bold text-lg mb-2 ${
                isDarkMode ? 'text-white' : 'text-[#562707]'
              }`}>
                SEÑOR(A) RECAUDOR(A)
              </h2>

              {message && (
                <p className={`font-semibold max-w-xs mb-2 ${
                  isDarkMode ? 'text-white' : 'text-[#562707]'
                }`}>{message}</p>
              )}
              {messageHtml && (
                <p className={`font-semibold max-w-xs mb-2 ${
                  isDarkMode ? 'text-white' : 'text-[#562707]'
                }`}>{messageHtml}</p>
              )}

              <Button title="Aceptar" onClick={onClose}>Aceptar</Button>
            </div>
          </div>
        </div>
      </div>

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

export default AlertSuccess;
