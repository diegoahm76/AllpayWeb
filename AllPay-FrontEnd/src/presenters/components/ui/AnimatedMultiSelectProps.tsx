import React, { useState } from 'react';
import {
  Select,
  MenuItem,
  Chip,
  Box,
  FormControl,
  InputLabel,
  OutlinedInput,
  SelectChangeEvent
} from '@mui/material';
interface Option {
    key: string | number;
    value: string | number;
    title: string;
  }
  
  interface AnimatedChipSelectProps {
    label: string;
    name: string;
    value: (string | number)[];
    onChange: (event: SelectChangeEvent<(string | number)[]>) => void | any ;
    options: Option[];
    error?: boolean;
    theme?: 'dark' | 'light';
  }
  
 
  const AnimatedChipSelect: React.FC<AnimatedChipSelectProps> = ({
    label,
    name,
    value,
    onChange,
    options,
    error,
    theme = 'light'
  }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
  
    const isActive = isFocused || isOpen;
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#260f00' : 'white';
    const baseTextColor = isDark ? '#ffffff' : '#562707';
    const borderBase = isDark ? 'rgba(255, 255, 255, 0.3)' : '#562707';
    const activeColor = '#4D750F';

    const getColor = () => {
      if (error) return '#dc2626';
      if (isActive) return activeColor;
      return baseTextColor;
    };
  
    return (
      <FormControl fullWidth error={error} sx={{ mb: 2 }}>
        <InputLabel
          id={`${name}-label`}
          shrink
          sx={{
            color: getColor(),
            backgroundColor: bgColor,
            px: 0.5,
            mx: 1,
            fontSize: '0.75rem',
            zIndex: 1,
            '&.Mui-focused': {
              color: getColor()
            }
          }}
        >
          {label}
        </InputLabel>
  
        <Select
          labelId={`${name}-label`}
          id={`${name}-select`}
          multiple
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onOpen={() => setIsOpen(true)}
          onClose={() => setIsOpen(false)}
          input={<OutlinedInput notched />}
          renderValue={(selected) => (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
                maxHeight: '100px',
                overflowY: 'auto'
              }}
            >
              {selected.map((val) => {
                const item = options.find(opt => opt.value === val);
                return (
                  <Chip
                    key={val}
                    label={item?.title || val}
                    sx={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#E5E7EB',
                      color: baseTextColor
                    }}
                  />
                );
              })}
            </Box>
          )}
          sx={{
            borderRadius: '1rem',
            backgroundColor: bgColor,
            color: baseTextColor,
            minHeight: '56px',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: borderBase
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: getColor()
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: activeColor
            },
            '& .MuiSelect-icon': {
              color: getColor()
            }
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundColor: bgColor,
                color: baseTextColor
              }
            }
          }}
        >
          {options.map((opt) => (
            <MenuItem
              key={opt.key}
              value={opt.value}
              sx={{
                color: baseTextColor,
                backgroundColor: bgColor,
                '&:hover': {
                  backgroundColor: isDark ? '#3a1a00' : '#F3F4F6'
                }
              }}
            >
              {opt.title}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };
  
  export default AnimatedChipSelect;