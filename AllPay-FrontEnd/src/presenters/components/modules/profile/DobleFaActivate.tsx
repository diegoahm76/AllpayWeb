'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import TwoFactorAuthModal from './TwoFactorAuthModal';
import { useDobleFaActivate } from '@/presenters/components/modules/profile/hooks/useDobleFaActivate';
import { Button } from "@/presenters/components/ui/AnimatedButton";

const DobleFaActivate: React.FC = () => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  const { isModalOpen, setIsModalOpen, hasTwoFactorAuth, handleDisableTwoFactorAuth } = useDobleFaActivate();

  return (
    <div
      className={`p-6 w-full rounded-xl mt-6 shadow-md ${isDarkMode ? 'bg-[#78390e]' : 'bg-slate-200'}`}
    >
      <div
        className={`rounded-xl px-12 py-8 shadow-md ${isDarkMode ? 'bg-[#260f00] border border-white/20 text-white' : 'bg-white text-[#562707]'}`}
      >
        <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : ''}`}>Autenticación doble factor</h2>
        <p className={isDarkMode ? 'text-white' : ''}>
          {hasTwoFactorAuth
            ? 'La autenticación de dos factores está activada.'
            : 'Aún no está habilitada.'}
        </p>
        <p className={`mb-4 ${isDarkMode ? 'text-white' : ''}`}>
          La autenticación de dos factores agrega una capa adicional de seguridad a su cuenta.
        </p>
        <div className="mt-6">
          <div className="flex justify-center space-x-4">

            <Button
              onClick={() => setIsModalOpen(true)}
              title={hasTwoFactorAuth
                ? 'Autenticación activada'
                : 'Habilitar autenticación'}
              darkMode={isDarkMode}
            />

            {hasTwoFactorAuth && (

              <Button
                onClick={handleDisableTwoFactorAuth}
                title="Desactivar doble factor"
                darkMode={isDarkMode}
              />

            )}
          </div>
        </div>
      </div>

      <TwoFactorAuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default DobleFaActivate;
