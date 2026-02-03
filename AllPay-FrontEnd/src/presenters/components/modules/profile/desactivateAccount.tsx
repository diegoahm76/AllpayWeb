'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useDeactivateAccount } from '@/presenters/components/modules/profile/hooks/useDeactiveAccount';
import { Button } from "@/presenters/components/ui/AnimatedButton";


interface DesactivateAccountProps {
  personaId: number | null;
}

const DesactivateAccount: React.FC<DesactivateAccountProps> = ({ personaId }) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  const { isChecked, setIsChecked, handleDeactivateAccount } = useDeactivateAccount(personaId);

  return (
    <div
      className={`p-6 w-full rounded-xl mt-6 shadow-md ${isDarkMode ? 'bg-[#78390e]' : 'bg-slate-200'}`}
    >
      <div
        className={`rounded-xl p-4 shadow-md ${isDarkMode ? 'bg-[#260f00] border border-white/20 text-white' : 'bg-white text-[#562707]'}`}
      >
        <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : ''}`}>Desactivar cuenta</h3>

        <div className="flex items-center space-x-2 mt-2">
          <input
            type="checkbox"
            className={`w-4 h-4 ${isDarkMode ? 'accent-white' : ''}`}
            checked={isChecked}
            onChange={() => setIsChecked(!isChecked)}
          />
          <label className={isDarkMode ? 'text-white' : ''}>
            Confirmar la desactivación de mi cuenta *
          </label>
        </div>

        <div className="flex justify-center">

          <Button
            onClick={handleDeactivateAccount}
            title="Desactivar cuentas"
            darkMode={isDarkMode}
          />

        </div>
      </div>
    </div>
  );
};

export default DesactivateAccount;
