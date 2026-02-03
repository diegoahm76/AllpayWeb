'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import type { 
  ToggleSwitchProps, 
  ToggleSwitchSize, 
  ToggleSwitchVariant,
  ToggleSwitchSizeConfig,
  ToggleSwitchVariantConfig 
} from './ToggleSwitch.types';

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  size = 'md',
  variant = 'primary',
  disabled = false,
  loading = false,
  showIcons = false,
  labelPosition = 'right',
  className = '',
  id,
  name,
  darkMode = false
}) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && (darkMode || theme === 'dark');
  // Configuraciones de tamaño
  const sizeConfig: Record<ToggleSwitchSize, ToggleSwitchSizeConfig> = {
    sm: {
      switch: 'h-5 w-9',
      thumb: 'h-4 w-4 after:h-4 after:w-4',
      translate: 'peer-checked:after:translate-x-4',
      focus: '',
      text: 'text-xs'
    },
    md: {
      switch: 'h-6 w-11',
      thumb: 'h-5 w-5 after:h-5 after:w-5',
      translate: 'peer-checked:after:translate-x-5',
      focus: '',
      text: 'text-sm'
    },
    lg: {
      switch: 'h-8 w-14',
      thumb: 'h-7 w-7 after:h-7 after:w-7',
      translate: 'peer-checked:after:translate-x-6',
      focus: '',
      text: 'text-base'
    }
  };

  // Configuraciones de color
  const variantConfig: Record<ToggleSwitchVariant, ToggleSwitchVariantConfig> = {
    primary: {
      bg: 'peer-checked:bg-blue-600',
      ring: '',
      thumb: 'after:bg-white'
    },
    success: {
      bg: 'peer-checked:bg-green-600',
      ring: '',
      thumb: 'after:bg-white'
    },
    warning: {
      bg: 'peer-checked:bg-yellow-500',
      ring: '',
      thumb: 'after:bg-white'
    },
    danger: {
      bg: 'peer-checked:bg-red-600',
      ring: '',
      thumb: 'after:bg-white'
    },
    info: {
      bg: 'peer-checked:bg-cyan-600',
      ring: '',
      thumb: 'after:bg-white'
    }
  };

  const currentSize = sizeConfig[size];
  const currentVariant = variantConfig[variant];

  // Renderizado del switch
  const switchElement = (
    <label className={`relative inline-flex items-center ${disabled || loading ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => !disabled && !loading && onChange(e.target.checked)}
        disabled={disabled || loading}
        id={id}
        name={name}
        aria-describedby={description ? `${id}-description` : undefined}
      />
      
      {/* Contenedor del switch */}
      <div
        className={`
          ${currentSize.switch}
          ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded-full peer 
          ${currentSize.focus} 
          ${currentVariant.ring}
          ${currentVariant.bg}
          after:content-[''] after:absolute after:top-[2px] after:start-[2px] 
          ${currentSize.thumb}
          after:bg-white ${isDarkMode ? 'after:border-gray-500' : 'after:border-gray-300'} after:border after:rounded-full 
          after:transition-all after:duration-300 after:ease-in-out
          ${currentSize.translate} 
          peer-checked:after:border-white
          ${disabled || loading ? 'opacity-50' : ''}
          transition-colors duration-300 ease-in-out
        `}
      >
        {/* Iconos opcionales */}
        {showIcons && (
          <>
            {/* Icono para estado inactivo */}
            <div className={`absolute inset-y-0 left-0 flex items-center justify-center w-1/2 transition-opacity duration-300 ${checked ? 'opacity-0' : 'opacity-100'}`}>
              <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            
            {/* Icono para estado activo */}
            <div className={`absolute inset-y-0 right-0 flex items-center justify-center w-1/2 transition-opacity duration-300 ${checked ? 'opacity-100' : 'opacity-0'}`}>
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </>
        )}
        
        {/* Indicador de loading */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900"></div>
          </div>
        )}
      </div>
    </label>
  );

  // Renderizado de la etiqueta
  const labelElement = label && (
    <div className={`${labelPosition === 'left' ? 'order-1' : 'order-3'}`}>
      <div className={`${currentSize.text} font-medium ${
        disabled || loading 
          ? 'text-gray-400' 
          : isDarkMode 
            ? 'text-white' 
            : 'text-[rgb(var(--brown))]'
      }`}>
        {label}
      </div>
      {description && (
        <div 
          className={`${currentSize.text === 'text-xs' ? 'text-xs' : 'text-xs'} ${
            isDarkMode ? 'text-gray-300' : 'text-[rgb(var(--brown))]'
          } opacity-70 mt-1`}
          id={id ? `${id}-description` : undefined}
        >
          {description}
        </div>
      )}
    </div>
  );

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      {labelPosition === 'left' && labelElement}
      <div className={`${labelPosition === 'left' ? 'order-2' : 'order-1'} flex items-center`}>
        {switchElement}
      </div>
      {labelPosition === 'right' && labelElement}
    </div>
  );
};

export default ToggleSwitch;