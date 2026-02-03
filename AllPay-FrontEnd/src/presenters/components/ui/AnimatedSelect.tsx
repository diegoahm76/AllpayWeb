import React, { useState } from 'react';

interface FloatingSelectProps {
  label: string;
  labelSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: {
    key: string | number;
    value: string | number;
    title: string;
  }[];
  error?: boolean;
  disabled?: boolean;
  darkMode?: boolean;
}

const AnimatedSelect: React.FC<FloatingSelectProps> = ({
  label,
  labelSize = 'md',
  name,
  value,
  onChange,
  options,
  error,
  disabled = false,
  darkMode = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  // Arrow icons are injected via data-URI depending on darkMode; no static paths needed

  const positionClass = isFocused || value ? 'top-[-10px]' : 'top-3';
  const computedLabelSize = `text-${labelSize}`;
  const labelBgClass = error ? 'bg-red-50' : (darkMode ? 'bg-[#260f00]' : 'bg-white');
  const labelTextClass = error
    ? 'text-red-900'
    : (isFocused || value)
      ? (darkMode ? 'text-white font-bold' : 'text-[rgb(var(--green))]')
      : (darkMode ? 'text-white' : 'text-gray-500');

  const selectBaseClasses = `w-full rounded-2xl border p-3  outline-none appearance-none transition-all cursor-pointer ${computedLabelSize}`;
  const selectStateClasses = error
    ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 focus:ring-red-500 focus:border-red-500'
    : (darkMode
      ? 'bg-[#260f00] border border-white/30 text-white focus:border-[rgb(var(--green))]'
      : 'bg-white border border-[#562707] text-[#562707] focus:border-[rgb(var(--green))]');

  const arrowColor = darkMode ? '%23e5e7eb' : 'rgb(75, 85, 99)';
  const arrowDown = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${arrowColor}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`;
  const arrowUp = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${arrowColor}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 15 12 9 18 15'%3E%3C/polyline%3E%3C/svg%3E")`;

  return (
    <div className="relative w-full">
      <style jsx global>{`
        /* Forzar fondo transparente en selects en modo oscuro */
        select[class*="bg-transparent"][class*="text-white"] {
          background-color: transparent !important;
          -webkit-text-fill-color: inherit !important;
          -webkit-box-shadow: none !important;
          box-shadow: none !important;
        }
      `}</style>
      
      {/* Label flotante */}
      <label
        className={`
    absolute left-3 px-1 transition-all pointer-events-none ${labelBgClass}
    ${positionClass} ${computedLabelSize}
    ${labelTextClass}
  `}
      >
        {label}
      </label>

      <select
        name={name}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        className={`${selectBaseClasses} ${selectStateClasses}`}
        style={{
          backgroundImage: isFocused ? arrowUp : arrowDown,
          backgroundPosition: 'right 1rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1rem'
        }}
      >
        {!value && (
          <option value="" disabled hidden>
          </option>
        )}

        {options.map((opt, index) => (
          <option
            key={`${opt.key}-${index}`}
            value={opt.value}
            style={{ backgroundColor: darkMode ? '#260f00' : 'white', color: darkMode ? '#ffffff' : undefined }}
          >
            {opt.title}
          </option>
        ))}
      </select>
    </div>
  );
};

export default AnimatedSelect;
