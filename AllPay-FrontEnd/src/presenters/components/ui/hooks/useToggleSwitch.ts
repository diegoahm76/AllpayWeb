'use client';

import { useState, useCallback } from 'react';
import type { UseToggleSwitchProps, UseToggleSwitchReturn } from '../ToggleSwitch.types';

export const useToggleSwitch = ({
  initialChecked = false,
  onChange,
  disabled = false
}: UseToggleSwitchProps = {}): UseToggleSwitchReturn => {
  const [checked, setCheckedState] = useState<boolean>(initialChecked);

  const setChecked = useCallback((newChecked: boolean) => {
    if (disabled) return;
    
    setCheckedState(newChecked);
    onChange?.(newChecked);
  }, [disabled, onChange]);

  const toggle = useCallback(() => {
    if (disabled) return;
    
    setCheckedState(prev => {
      const newValue = !prev;
      onChange?.(newValue);
      return newValue;
    });
  }, [disabled, onChange]);

  return {
    checked,
    toggle,
    setChecked
  };
};

export default useToggleSwitch;