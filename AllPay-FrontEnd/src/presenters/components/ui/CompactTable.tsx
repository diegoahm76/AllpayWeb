'use client';

import React, { useState, useEffect } from 'react';
import type { CompactTableProps, CompactTableColumn } from './CompactTable.types';

/**
 * CompactTable - Tabla compacta y optimizada para espacios reducidos
 * 
 * Características:
 * - Layout fijo con porcentajes personalizables
 * - Headers sticky
 * - Truncate automático con tooltips
 * - Hover effects
 * - Totales opcionales
 * - Completamente responsive
 */
const CompactTable: React.FC<CompactTableProps> = ({
  columns,
  data,
  title,
  total,
  maxHeight = '280px',
  isLoading = false,
  emptyMessage = 'No hay datos disponibles',
  className = '',
  theme = 'light',
  darkMode = false,
  showIndex = false
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Si no está montado, retornar null o un estado de loading simple
  if (!mounted) {
    return null;
  }

  const isDarkMode = darkMode || theme === 'dark';
  // Función para renderizar el contenido de una celda
  const renderCellContent = (column: CompactTableColumn, value: any, item: any, index: number) => {
    // Si es la columna de índice automático
    if (showIndex && column.key === '__index') {
      return index + 1;
    }

    // Si hay una función render personalizada
    if (column.render) {
      return column.render(value, item);
    }

    // Si necesita truncate
    if (column.truncate) {
      return (
        <div className="truncate" title={String(value)}>
          {value}
        </div>
      );
    }

    return value;
  };

  // Función para obtener clases de alineación
  const getAlignmentClass = (align: CompactTableColumn['align'] = 'left') => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  if (isLoading) {
    return (
      <div className={`rounded-3xl p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} ${className}`}>
        {title && (
          <h3 className={`text-base font-bold text-center mb-3 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
            {title}
          </h3>
        )}
        <div className="flex items-center justify-center h-40">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-white' : 'border-[rgb(var(--brown))]'}`}></div>
          <span className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl p-4 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'} ${className}`}>
      {title && (
        <h3 className={`text-base font-bold text-center mb-3 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
          {title}
        </h3>
      )}

      <div className={`overflow-x-auto flex-1 text-sm`} style={{ maxHeight }}>
        <div className="min-w-full">
          <table className={`w-full table-fixed ${isDarkMode ? 'divide-white/20' : 'divide-gray-200'} divide-y`}>
            {/* Header */}
            <thead className={`sticky top-0 ${isDarkMode ? 'bg-[#3d1a00]' : 'bg-gray-50'}`}>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-1 py-2 text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    } ${getAlignmentClass(column.align)}`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody className={`${isDarkMode ? 'bg-[#260f00] divide-white/20' : 'bg-white divide-gray-200'} divide-y`}>
              {data.length === 0 ? (
                <tr>
                  <td 
                    colSpan={columns.length} 
                    className={`px-1 py-8 text-center text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((item, itemIndex) => (
                  <tr key={itemIndex} className={isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-50'}>
                    {columns.map((column) => {
                      const value = column.key === '__index' ? itemIndex + 1 : item[column.key];
                      return (
                        <td
                          key={column.key}
                          className={`px-1 py-1.5 whitespace-nowrap text-xs ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          } ${getAlignmentClass(column.align)}`}
                        >
                          {renderCellContent(column, value, item, itemIndex)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Total row */}
      {total && (
        <div className={`border-t rounded ${
          isDarkMode 
            ? 'border-white/20 bg-[#3d1a00]' 
            : `border-gray-200 ${total.className || 'bg-gray-50'}`
        }`}>
          <table className="w-full table-fixed">
            <tbody>
              <tr>
                {columns.map((column, index) => (
                  <td
                    key={column.key}
                    className={`px-1 py-1.5 whitespace-nowrap text-xs font-bold ${
                      isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'
                    } ${getAlignmentClass(column.align)}`}
                  >
                    {total.values[index] || ''}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CompactTable;