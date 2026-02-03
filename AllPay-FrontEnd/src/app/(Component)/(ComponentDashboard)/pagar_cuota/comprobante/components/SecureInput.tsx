import React, { useState, useEffect, useRef } from 'react';

interface SecureInputProps {
  label: string;
  value: string;
  className?: string;
  type?: 'text' | 'currency';
  error?: boolean;
}

/**
 * Componente de entrada seguro que renderiza el valor como texto en lugar de un input
 * para evitar manipulaciones a través del inspector del navegador.
 * Visualmente idéntico a AnimatedInput pero sin capacidad de edición.
 */
const SecureInput: React.FC<SecureInputProps> = ({
  label,
  value,
  className = '',
  type = 'text',
  error = false
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [originalValue, setOriginalValue] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Establecer el valor original solo cuando se recibe un valor no vacío por primera vez
  useEffect(() => {
    const stringValue = String(value || '');
    if (!isInitialized && value && stringValue.trim() !== '') {
      setOriginalValue(stringValue);
      setIsInitialized(true);
      console.log(`[SecureInput] - Valor original establecido para "${label}":`, value);
    }
  }, [value, isInitialized, label]);

  // Verificar que el valor no haya sido manipulado (solo después de la inicialización)
  useEffect(() => {
    if (isInitialized && originalValue && value !== originalValue) {
      console.error(`[SecureInput] - 🚨 POSIBLE MANIPULACIÓN DETECTADA en "${label}":`, { 
        original: originalValue, 
        current: value,
        timestamp: new Date().toISOString()
      });
    }
  }, [value, originalValue, isInitialized, label]);

  // Clases idénticas a AnimatedInput
  const inputClassNames = `
    w-full p-3 rounded-2xl appearance-none transition-all text-[rgb(var(--brown))]
    bg-gray-200 cursor-not-allowed
    ${error
      ? 'bg-red-50 border border-red-500 text-red-900 focus:ring-red-500 focus:border-red-500'
      : 'bg-white border border-brown text-brown'}
  `;

  const labelClassNames = `
    absolute left-3 px-1 transition-all pointer-events-none bg-white z-10
    ${isFocused || value ? 'top-[-10px] text-xs' : 'top-3 text-md'}
    ${error ? 'text-red-900 bg-red-50' : (isFocused || value ? 'text-[rgb(var(--green))]' : 'text-gray-500 bg-white')}
  `;

  // Formatear valor como moneda si es necesario
  const displayValue = type === 'currency' && value
    ? new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(parseFloat(value))
    : value;

  return (
    <div className={`relative w-full ${className}`}>
      <label className={labelClassNames}>
        {label}
      </label>
      
      {/* Div que simula un input pero no es editable */}
      <div
        ref={containerRef}
        className={inputClassNames}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        tabIndex={0}
        style={{
          minHeight: '48px',
          display: 'flex',
          alignItems: 'center',
          fontSize: '16px',
          fontWeight: '500'
        }}
      >
        {displayValue}
      </div>
      
      {/* Input oculto para validación */}
      <input 
        type="hidden" 
        value={value} 
        readOnly 
      />
    </div>
  );
};

export default SecureInput; 