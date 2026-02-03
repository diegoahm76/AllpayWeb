import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

interface ModalContainerProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';
}

const ModalContainer: React.FC<ModalContainerProps> = ({
  isOpen,
  onClose,
  children,
  size = 'md'
}) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen) return null;

  const isDarkMode = mounted && theme === 'dark';

  const sizeClasses = {
    xs: 'w-[80%] md:w-[300px]',
    sm: 'w-[90%] md:w-[400px]',
    md: 'w-[90%] md:w-[500px]',
    lg: 'w-[90%] md:w-[600px]',
    xl: 'w-[90%] md:w-[700px]',
    '2xl': 'w-[90%] md:w-[800px]',
    '3xl': 'w-[90%] md:w-[900px]',
    '4xl': 'w-[90%] md:w-[1000px]',
    '5xl': 'w-[90%] md:w-[1100px]',
    '6xl': 'w-[90%] md:w-[1200px]',
    full: 'w-full'
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-transparent bg-opacity-50 z-50 backdrop-blur overflow-x-hidden">
      <div className={`m-auto rounded-xl ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'} ${size === 'xs' ? 'p-2' : 'p-6'}`}> 
        <div className={`w-full max-w-[95vw] md:${sizeClasses[size]} rounded-lg p-6 shadow-lg relative ${isDarkMode ? 'bg-[#260f00]' : 'bg-white'}`}>
          {/* Botón de cierre */}
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 text-2xl font-bold hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
          >
            &times;
          </button>

          {/* Contenido del modal */}
          <div className="mt-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalContainer;
