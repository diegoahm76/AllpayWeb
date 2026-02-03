'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import ModalContainer from '../../ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { useEmailVerification } from '@/presenters/components/modules/profile/hooks/useEmailVerification';
import { Button } from '@/presenters/components/ui/AnimatedButton';

interface EmailVerificationSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  email: string;
}

const EmailVerificationSetup: React.FC<EmailVerificationSetupProps> = ({
  isOpen,
  onClose,
  onBack,
  email,
}) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  const { email: emailInput, setEmail, handleSaveEmailFactor } =
    useEmailVerification(email);

  return (
    isOpen && (
      <ModalContainer isOpen={isOpen} onClose={onClose}>
        <div className={isDarkMode ? 'text-white' : 'text-[#562707]'}>
          <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : ''}`}>
            <span className="mr-2">✉️</span> Verificar su correo electrónico
          </h2>
          <p className={`mb-4 ${isDarkMode ? 'text-white' : ''}`}>
            Ingrese su correo electrónico y le enviaremos un código de verificación.
          </p>

          <AnimatedInput
            label="Email"
            name="Correo electrónico"
            value={emailInput}
            onChange={(e) => setEmail(e.target.value)}
            readOnly
            darkMode={isDarkMode}
          />

          <div className="flex justify-end space-x-4 mt-4">

            <Button
              onClick={onBack}
              title="Cancelar"
              darkMode={isDarkMode}
            />

            <Button
              onClick={() => handleSaveEmailFactor(onClose)}
              disabled={!emailInput}
              title="Continuar"
              darkMode={isDarkMode}
            />

          </div>
        </div>
      </ModalContainer>
    )
  );
};

export default EmailVerificationSetup;
