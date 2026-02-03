'use client';

import React from 'react';
import { signOut } from 'next-auth/react';
import Image from 'next/image';
import { getFullLoginUrl } from '@/utils/authRedirect';

interface SessionExpiredAlertProps {
  onClose: () => void;
}

const SessionExpiredAlert: React.FC<SessionExpiredAlertProps> = ({ onClose }) => {
  const handleClose = async () => {
    await signOut({
      redirect: false,
      callbackUrl: getFullLoginUrl()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-transparent backdrop-blur-sm" />
      <div className="relative z-10 animate-modalFadeScale">
        <div className="m-auto rounded-xl p-6 bg-slate-200">
          <div className="w-full max-w-[95vw] md:w-[500px] max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-lg relative">
            <div className="mt-4 flex flex-col items-center gap-6 pt-4 text-center">
              <div className="w-48">
                <Image
                  src="/images/corporate/logo.png"
                  alt="Federación Nacional de Cacaoteros"
                  width={200}
                  height={100}
                  style={{ width: '100%', height: 'auto' }}
                  priority
                />
              </div>

              <h2 className="text-[#562707] font-bold text-lg">
                SEÑOR(A) RECAUDOR(A)
              </h2>

              <p className="text-[#562707] font-semibold max-w-xs">
                Sesión Expirada, por favor vuelva a iniciar sesión
              </p>

              <button
                onClick={handleClose}
                className="px-6 py-2 bg-[#562707] text-white rounded-lg hover:bg-[#78390e] transition-colors"
              >
                Aceptar
              </button>
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
};

export default SessionExpiredAlert; 