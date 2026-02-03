'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import ModalContainer from '../../ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { useSmsVerification } from '@/presenters/components/modules/profile/hooks/useSmsVerification';
import { Button } from "@/presenters/components/ui/AnimatedButton";

interface SmsVerificationSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  phoneNumber: string;
}

const SmsVerificationSetup: React.FC<SmsVerificationSetupProps> = ({
  isOpen,
  onClose,
  onBack,
  phoneNumber
}) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  const { phoneNumber: phoneInput, setPhoneNumber, handleSaveSmsFactor } =
    useSmsVerification(phoneNumber, onClose);

  return (
    isOpen && (
      <ModalContainer isOpen={isOpen} onClose={onClose}>
        <div className={isDarkMode ? 'text-white' : 'text-[#562707]'}>
          <h2 className={`text-xl font-bold mb-4 flex items-center ${isDarkMode ? 'text-white' : ''}`}>
            <span className="mr-2">💬</span> Verificar su número de móvil para SMS
          </h2>

          <p className={`mb-4 ${isDarkMode ? 'text-white' : ''}`}>
            Ingrese su número de teléfono móvil con el código de país y le enviaremos un código de verificación.
          </p>

          <AnimatedInput
            label="Número de teléfono móvil"
            name="telefono"
            value={phoneInput}
            onChange={(e) => setPhoneNumber(e.target.value)}
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
              onClick={handleSaveSmsFactor}
              disabled={!phoneInput}
              title="Continuar"
              darkMode={isDarkMode}
            />

          </div>
        </div>
      </ModalContainer>
    )
  );
};

export default SmsVerificationSetup;
