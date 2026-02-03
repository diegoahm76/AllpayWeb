'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useTwoFactorAuthModal } from '@/presenters/components/modules/profile/hooks/useTwoFactorAuthModal';
import ModalContainer from '../../ui/ModalContainer';
import AppAuthenticationSetup from './AppAuthenticationSetup';
import SmsVerificationSetup from './SmsVerificationSetup';
import EmailVerificationSetup from './EmailVerificationSetup';
import { Button } from "@/presenters/components/ui/AnimatedButton";

interface TwoFactorAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const options = [
  {
    id: 'app',
    title: 'Aplicaciones de autenticación',
    description:
      'Obtenga el código de una aplicación como Google Authenticator o Microsoft Authenticator.'
  },
  {
    id: 'sms',
    title: 'Mensaje de texto',
    description:
      'Le enviaremos un código por SMS si necesita utilizar su método de inicio de sesión de respaldo.'
  },
  {
    id: 'email',
    title: 'Correo electrónico',
    description:
      'Le enviaremos un código al correo electrónico si necesita utilizar su método de inicio de sesión de respaldo.'
  }
];

const TwoFactorAuthModal: React.FC<TwoFactorAuthModalProps> = ({
  isOpen,
  onClose
}) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  const {
    selectedOption,
    isAppModalOpen,
    isSmsModalOpen,
    isEmailModalOpen,
    email,
    phoneNumber,
    handleSelectOption,
    handleContinue,
    setIsAppModalOpen,
    setIsSmsModalOpen,
    setIsEmailModalOpen
  } = useTwoFactorAuthModal({ isOpen, onClose });

  return (
    <>
      {isOpen && (
        <ModalContainer isOpen={isOpen} onClose={onClose}>
          <div className={isDarkMode ? 'text-white' : 'text-[#562707]'}>
            <h2 className={`text-xl font-bold mb-4 text-center ${isDarkMode ? 'text-white' : ''}`}>
              Seleccionar método de autenticación
            </h2>
            <p className={`text-center mb-4 ${isDarkMode ? 'text-white' : ''}`}>
              También debe seleccionar un método mediante el cual el proxy se autentica
              en el servidor de directorio.
            </p>

            <div className="space-y-4">
              {options.map((option) => (
                <div
                  key={option.id}
                  onClick={() => handleSelectOption(option.id)}
                  className={`cursor-pointer border-2 p-4 rounded-lg flex items-start space-x-3 transition ${selectedOption === option.id
                    ? 'border-[rgb(var(--green))]'
                    : isDarkMode ? 'border-white/30' : 'border-gray-300'
                    }`}
                >
                  <span
                    className={`text-lg ${selectedOption === option.id ? 'text-[rgb(var(--green))]' : isDarkMode ? 'text-white/70' : 'text-gray-500'
                      }`}
                  >
                    ●
                  </span>
                  <div>
                    <p className={`font-bold ${isDarkMode ? 'text-white' : ''}`}>{option.title}</p>
                    <p className={`text-sm ${isDarkMode ? 'text-white/80' : ''}`}>{option.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-center">

              <Button
                onClick={handleContinue}
                title="Continuar"
                disabled={!selectedOption}
                darkMode={isDarkMode}
              />

            </div>
          </div>
        </ModalContainer>
      )}

      {isAppModalOpen && (
        <AppAuthenticationSetup
          isOpen={isAppModalOpen}
          onClose={() => setIsAppModalOpen(false)}
          onBack={() => {
            setIsAppModalOpen(false);
            setTimeout(() => onClose(), 300);
          }}
        />
      )}

      {isSmsModalOpen && (
        <SmsVerificationSetup
          isOpen={isSmsModalOpen}
          onClose={() => setIsSmsModalOpen(false)}
          onBack={() => {
            setIsSmsModalOpen(false);
            setTimeout(() => onClose(), 300);
          }}
          phoneNumber={phoneNumber}
        />
      )}

      {isEmailModalOpen && (
        <EmailVerificationSetup
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          onBack={() => {
            setIsEmailModalOpen(false);
            setTimeout(() => onClose(), 300);
          }}
          email={email}
        />
      )}
    </>
  );
};

export default TwoFactorAuthModal;
