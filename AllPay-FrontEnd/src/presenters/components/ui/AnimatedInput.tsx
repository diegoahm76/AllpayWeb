'use client';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Upload, X, File } from 'lucide-react';
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from 'date-fns/locale';
import { Month } from 'date-fns';

registerLocale('es', es);

interface AnimatedInputProps {
  label: string;
  name: string;
  value: string;
  id?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | any>) => void;
  readOnly?: boolean;
  disabled?: boolean;
  required?: boolean;
  type?: 'text' | 'number' | 'password' | 'date' | 'email' | 'file';
  error?: boolean;
  labelSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  maxDate?: string;
  minDate?: string;
  autoComplete?: 'on' | 'off' | 'new-password' | 'username' | 'email';
  step?: string;
  accept?: string; // Para especificar tipos de archivo aceptados
  multiple?: boolean; // Para permitir múltiples archivos
  darkMode?: boolean; // Activa estilos de modo oscuro propios del componente
}

const AnimatedInput: React.FC<AnimatedInputProps> = ({
  label,
  name,
  id,
  value,
  onChange,
  readOnly = false,
  disabled = false,
  required = false,
  type = 'text',
  error,
  maxDate,
  minDate,
  autoComplete = 'on',
  step,
  accept,
  multiple = false,
  labelSize,
  darkMode = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Sincronizar selectedFile con el value prop para archivos
  useEffect(() => {
    if (type === 'file') {
      // Si el value está vacío, limpiar selectedFile
      if (!value) {
        setSelectedFile(null);
      }
    }
  }, [value, type]);

  const inputClassNames = `
    w-full p-3 rounded-2xl appearance-none placeholder-transparent transition-all ${darkMode ? 'text-white' : 'text-[rgb(var(--brown))]'} 
    ${disabled ? 'cursor-not-allowed' : 'cursor-pointer' }
    ${error
      ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 focus:ring-red-500 focus:border-red-500'
      : disabled
        ? `${darkMode 
            ? 'bg-transparent border border-white/30 focus:border-[rgb(var(--green))]' 
            : 'bg-transparent border border-brown focus:border-[rgb(var(--green))]'}`
        : `${darkMode 
            ? 'bg-[#260f00] border border-white/30 focus:border-[rgb(var(--green))]'
            : 'bg-white border border-brown focus:border-[rgb(var(--green))]'}`}
  `;

  const positionClass = isFocused || value ? 'top-[-10px]' : 'top-3';
  const sizeClass = labelSize ? `text-${labelSize}` : (isFocused || value ? 'text-xs' : 'text-md');
  const labelBgClass = error ? 'bg-red-50' : (darkMode ? 'bg-[#260f00]' : 'bg-white');
  const labelTextClass = error
    ? 'text-red-900'
    : (isFocused || value)
      ? (darkMode ? 'text-white font-bold' : 'text-[rgb(var(--green))]')
      : (darkMode ? 'text-white' : 'text-gray-500');
  const labelClassNames = `
    absolute left-3 px-1 transition-all pointer-events-none ${labelBgClass} z-10
    ${positionClass} ${sizeClass}
    ${labelTextClass}
  `;

  const handleDateChange = (date: Date | null) => {
    if (onChange && date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      const event = {
        target: {
          name,
          value: `${year}-${month}-${day}`,
          displayValue: `${day}/${month}/${year}`
        }
      } as any;
      onChange(event);
    }
  };

  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;

    let year, month, day;
    if (dateStr.includes('/')) {
      [day, month, year] = dateStr.split('/');
    } else {
      [year, month, day] = dateStr.split('-');
    }

    const date = new Date(Number(year), Number(month) - 1, Number(day), 12);
    return date;
  };

  // Funciones para manejo de archivos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    
    if (onChange) {
      const customEvent = {
        target: {
          name,
          value: file ? file.name : '',
          files: e.target.files,
          file: file
        }
      } as any;
      onChange(customEvent);
    }
    
    // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
    e.target.value = '';
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (onChange) {
      const customEvent = {
        target: {
          name,
          value: '',
          files: null,
          file: null
        }
      } as any;
      onChange(customEvent);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      
      if (onChange) {
        const customEvent = {
          target: {
            name,
            value: file.name,
            files: files,
            file: file
          }
        } as any;
        onChange(customEvent);
      }
      
      // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
      const fileInput = document.getElementById(`file-input-${name}`) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const datepickerThemeClass = darkMode ? 'datepicker-dark' : 'datepicker-light';

  return (
    <div className="relative w-full">
      <style jsx global>{`
        .react-datepicker-wrapper {
          display: block;
          width: 100%;
        }

        .react-datepicker__input-container {
          display: block;
          width: 100%;
        }

        .react-datepicker__input-container input {
          width: 100%;
        }

        .react-datepicker-popper {
          background-color: transparent;
          z-index: 9999 !important;
        }

        .datepicker-popper {
          z-index: 9999 !important;
        }

        .react-datepicker {
          font-family: inherit;
          border: 1px solid rgb(var(--green));
          border-radius: 1rem;
          background-color: white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 
                      0 2px 4px -1px rgba(0, 0, 0, 0.06);
          z-index: 9999;
        }
        
        .react-datepicker__triangle {
          display: none;
        }

        .react-datepicker__header {
  
          padding: 0;
          position: relative;
          
          border-top-left-radius: 0 !important;
          border-top-right-radius: 0 !important;
          background-color: transparent !important;
          border-bottom: none !important;
        }

        .react-datepicker__month-container {
        }

        .react-datepicker__current-month {
          display: none;
        }

        .custom-select {
          color: rgb(75, 85, 99) !important;
          border: none !important;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          padding: 0.2rem 1.5rem 0.2rem 0.5rem !important;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          text-align: center;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='rgb(75, 85, 99)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
          background-repeat: no-repeat !important;
          background-position: right 2px center !important;
          background-size: 16px !important;
        }

        .custom-select option {
          color: rgb(var(--brown));
          background-color: white;
          padding: 4px 8px;
        }

        /* Estilos para el dropdown */
        .react-datepicker__header select {
          max-height: 200px !important;
          overflow-y: auto !important;
        }

        .react-datepicker__month-dropdown,
        .react-datepicker__year-dropdown {
          max-height: 120px !important; /* Altura reducida */
          overflow-y: auto !important;
        }

        select.custom-select option:hover {
          background-color: rgb(var(--gray-20));
          color: white;
        }

        /* Estilos para el scrollbar del dropdown */
        select.custom-select::-webkit-scrollbar {
          width: 6px;
        }

        select.custom-select::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        select.custom-select::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }

        select.custom-select::-webkit-scrollbar-thumb:hover {
          background: #555;
        }

        .react-datepicker__day-names {
          text-color: black !important;
          padding: 0.5rem 0;
          border-bottom: 1px solid white;
          margin: 0;
          display: flex;
          justify-content: space-around;
        }

        .react-datepicker__day-name {
          color: rgb(75, 85, 99);
          font-weight: 500;
          width: 2rem;
          line-height: 2rem;
          margin: 0.2rem;
          text-align: center;
        }
        
        .react-datepicker__month {
          background-color: white;
          margin: 0;
          padding: 0.5rem 0;
        }

        .react-datepicker__week {
          display: flex;
          justify-content: space-around;
        }

        .react-datepicker__day {
          border-radius: 0.5rem;
          margin: 0.2rem;
          width: 2rem;
          line-height: 2rem;
          display: inline-flex;
          justify-content: center;
          align-items: center;
        }

        .react-datepicker__day:hover {
          background-color: rgba(var(--gray-40)) !important;
        }
        
        .react-datepicker__day--selected {
          background-color: rgb(var(--gray-20)) !important;
          color: white !important;
        }
        
        .react-datepicker__day--keyboard-selected {
        background-color: rgb(var(--gray-20)) !important;
          color: white;
        }

        .react-datepicker__day--disabled {
          color: #cbd5e0 !important;
          text-decoration: line-through;
          cursor: not-allowed;
        }

        .react-datepicker__day--disabled:hover {
          background-color: transparent !important;
        }

        .react-datepicker__navigation {
          display: none;
        }
        
        .react-datepicker__today-button {
          background-color: white;
          color: rgb(75, 85, 99);
          border: none;
          padding: 0.5rem;
          font-weight: 500;
          border-bottom-left-radius: 1rem;
          border-bottom-right-radius: 1rem;
          border-top: 1px solid rgb(229, 231, 235);
        }

        /* Modo oscuro del DatePicker, activado con popperClassName/calendarClassName */
        .datepicker-dark .react-datepicker {
          background-color: #260f00;
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: #ffffff;
        }
        .datepicker-dark .react-datepicker__header {
          background-color: transparent !important;
          border-bottom: none !important;
        }
        .datepicker-dark .custom-select {
          color: #e5e7eb !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23e5e7eb' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
        }
        .datepicker-dark .react-datepicker__day-name {
          color: #d1d5db;
        }
        .datepicker-dark .react-datepicker__month {
          background-color: #260f00;
        }
        .datepicker-dark .react-datepicker__day {
          color: #f3f4f6;
        }
        .datepicker-dark .react-datepicker__day:hover {
          background-color: rgba(255, 255, 255, 0.08) !important;
        }
        .datepicker-dark .react-datepicker__day--selected,
        .datepicker-dark .react-datepicker__day--keyboard-selected {
          background-color: rgb(var(--gray-20)) !important;
          color: #ffffff !important;
        }
        .datepicker-dark .react-datepicker__day--disabled {
          color: #9ca3af !important;
        }
        .datepicker-dark .react-datepicker__today-button {
          background-color: #260f00;
          color: #e5e7eb;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        /* Inputs disabled en modo oscuro con fondo transparente */
        input[disabled].bg-transparent {
          background-color: transparent !important;
          -webkit-text-fill-color: inherit !important;
          opacity: 1 !important;
        }
        
        /* Asegurar que los inputs disabled en modo oscuro no tengan fondo gris del navegador */
        input[disabled][class*="bg-transparent"] {
          background-color: transparent !important;
          -webkit-text-fill-color: inherit !important;
          opacity: 1 !important;
        }
        
        /* DatePicker input disabled en modo oscuro */
        .react-datepicker__input-container input[disabled][class*="bg-transparent"] {
          background-color: transparent !important;
          -webkit-text-fill-color: inherit !important;
          opacity: 1 !important;
        }
        
        /* Forzar fondo transparente en TODOS los inputs en modo oscuro con bg-transparent */
        input[class*="bg-transparent"][class*="text-white"] {
          background-color: transparent !important;
          background-image: none !important;
          -webkit-text-fill-color: inherit !important;
          -webkit-box-shadow: none !important;
          box-shadow: none !important;
        }
        
        /* Estilos específicos por tipo de input en modo oscuro */
        input[type="text"][class*="bg-transparent"][class*="text-white"],
        input[type="email"][class*="bg-transparent"][class*="text-white"],
        input[type="number"][class*="bg-transparent"][class*="text-white"],
        input[type="date"][class*="bg-transparent"][class*="text-white"],
        input[type="password"][class*="bg-transparent"][class*="text-white"] {
          background-color: transparent !important;
          background-image: none !important;
          -webkit-text-fill-color: inherit !important;
          -webkit-box-shadow: none !important;
          box-shadow: none !important;
        }

        /* Forzar fondo transparente en inputs disabled en modo claro */
        input[disabled][class*="bg-transparent"] {
          background-color: transparent !important;
          background-image: none !important;
          -webkit-text-fill-color: inherit !important;
          -webkit-box-shadow: none !important;
          box-shadow: none !important;
          opacity: 1 !important;
        }

        /* Estilos específicos por tipo de input disabled en modo claro */
        input[type="text"][disabled][class*="bg-transparent"],
        input[type="email"][disabled][class*="bg-transparent"],
        input[type="number"][disabled][class*="bg-transparent"],
        input[type="date"][disabled][class*="bg-transparent"],
        input[type="password"][disabled][class*="bg-transparent"] {
          background-color: transparent !important;
          background-image: none !important;
          -webkit-text-fill-color: inherit !important;
          -webkit-box-shadow: none !important;
          box-shadow: none !important;
          opacity: 1 !important;
        }
      `}</style>

      <label className={labelClassNames}>
        {label}{required && ' *'}
      </label>

      {type === 'date' ? (
        <DatePicker
          selected={parseDate(value)}
          onChange={handleDateChange}
          dateFormat="dd/MM/yyyy"
          className={inputClassNames}
          name={name}
          id={id}
          disabled={disabled}
          required={required}
          maxDate={maxDate ? new Date(maxDate + 'T23:59:59') : undefined}
          minDate={minDate ? new Date(minDate + 'T00:00:00') : undefined}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(!!value)}
          autoComplete={autoComplete}
          todayButton="Hoy"
          showMonthDropdown
          showYearDropdown
          yearDropdownItemNumber={200}
          scrollableYearDropdown
          dropdownMode="select"
          placeholderText=""
          popperPlacement="bottom-start"
          calendarClassName={datepickerThemeClass}
          popperClassName={`datepicker-popper ${datepickerThemeClass}`}
          locale="es"
          renderCustomHeader={({ date, changeYear, changeMonth }) => {
            const minYear = 1900;
            const maxYear = 2050;
            const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
            return (
              <div className="flex items-center justify-center px-4 py-2">
                <div className="flex gap-2">
                  <select
                    value={date.getMonth()}
                    onChange={({ target: { value } }) => changeMonth(Number(value) as Month)}
                    className="custom-select"
                  >
                    {Array.from({ length: 12 }, (_, i) => i).map((month) => (
                      <option key={month} value={month}>
                        {es.localize?.month(month as Month, { width: 'wide' })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={date.getFullYear()}
                    onChange={({ target: { value } }) => changeYear(Number(value))}
                    className="custom-select"
                  >
                    {years.reverse().map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          }}
        />
      ) : type === 'file' ? (
        <div className="relative">
          <div
            className={`
              w-full p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer 
              ${dragOver ? (darkMode ? 'border-[rgb(var(--green))] bg-[#260f00]' : 'border-[rgb(var(--green))] bg-green-50') : (darkMode ? 'border-white/30 bg-[#260f00]' : 'border-gray-300')}
              ${selectedFile ? (darkMode ? 'border-[rgb(var(--green))] bg-[#260f00]' : 'border-[rgb(var(--green))] bg-green-50') : ''}
              ${error ? 'border-red-500 bg-red-50' : ''}
              ${disabled ? ' cursor-not-allowed' : (darkMode ? 'hover:border-[rgb(var(--green))] hover:bg-[#260f00]' : 'hover:border-[rgb(var(--green))] hover:bg-green-50')}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !disabled && document.getElementById(`file-input-${name}`)?.click()}
          >
            <input
              type="file"
              id={`file-input-${name}`}
              name={name}
              onChange={handleFileChange}
              disabled={disabled}
              required={required}
              accept={accept}
              multiple={multiple}
              className="hidden"
            />
            
            {selectedFile ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-[rgb(var(--green))] rounded-lg">
                    <File size={24} className="text-white" />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-[rgb(var(--brown))]'} truncate max-w-xs`}>
                      {selectedFile.name}
                    </p>
                    <p className={`text-xs ${darkMode ? 'text-gray-200' : 'text-gray-500'}`}>
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                  className="p-1 hover:bg-red-100 rounded-full transition-colors"
                  disabled={disabled}
                >
                  <X size={18} className="text-red-500" />
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className={`p-3 ${darkMode ? 'bg-white/10' : 'bg-gray-100'} rounded-full inline-block mb-2`}>
                  <Upload size={24} className="text-gray-500" />
                </div>
                <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-600'}`}>
                  Arrastra y suelta un archivo aquí, o haz clic para seleccionar
                </p>
                <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-400'} mt-1`}>
                  {accept ? `Archivos permitidos: ${accept}` : 'Todos los tipos de archivo'}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <input
          type={type === 'password' ? (showPassword ? 'text' : 'password') : type}
          name={name}
          value={value}
          id={id}
          onChange={onChange}
          readOnly={readOnly}
          disabled={disabled}
          required={required}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(!!value)}
          autoComplete={autoComplete}
          spellCheck={type === 'password' ? 'false' : 'true'}
          {...(type === 'number' && { step })}
          className={inputClassNames}
        />
      )}

      {type === 'password' && !disabled && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className={`
            absolute right-3 top-1/2 transform -translate-y-1/2 
            ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}
          `}
        >
          {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>
      )}
    </div>
  );
};

export default AnimatedInput;
