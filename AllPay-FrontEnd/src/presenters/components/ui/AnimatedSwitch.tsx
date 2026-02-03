'use client';

import React from 'react';

interface AnimatedSwitchProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  darkMode?: boolean;
}

const AnimatedSwitch: React.FC<AnimatedSwitchProps> = ({
  label = 'Activo',
  checked,
  onChange,
  disabled = false,
  darkMode = false
}) => {
  return (
    <div className="flex h-full items-center gap-2">
      <span className={`text-sm font-medium ${
        disabled 
          ? 'text-gray-400' 
          : darkMode 
            ? 'text-white' 
            : 'text-[#562707]'
      }`}>
        {label}
      </span>
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="peer sr-only"
        />
        <div
          className={`peer h-6 w-11 rounded-full bg-gray-200 
            peer-focus:ring-4 peer-focus:ring-[#4D750F]/50 
            peer-focus:outline-none 
            after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full 
            after:border after:border-gray-300 after:bg-white 
            after:transition-all after:content-[''] 
            peer-checked:after:translate-x-full peer-checked:after:border-white 
            peer-checked:bg-[#4D750F] 
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        ></div>
      </label>
    </div>
  );
};

export default AnimatedSwitch;
