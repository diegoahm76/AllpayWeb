'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';

const Logo = ({ className }: { className?: string }) => {
  const { theme } = useTheme(); // Obteniendo el tema actual

  return (
    <div className="flex items-center justify-center w-full">
      <Image
        width={140} // Mantener las dimensiones fijas
        height={155} // Ajusta la altura para que mantenga proporciones similares
        src={
          theme === 'dark'
            ? '/images/corporate/newLogo.png' // Logo para modo oscuro
            : '/images/corporate/newLogoBrown.png' // Logo para modo claro
        }
        alt="Logo"
        className={`m-auto w-auto h-auto max-w-[140px] max-h-[155px] ${className}`} // Limita el tamaño máximo
        priority
      />
    </div>
  );
};

export default Logo;
