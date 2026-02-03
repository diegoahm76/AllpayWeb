'use client';

import { useState, useMemo } from 'react';
import type { UseCompactTableProps, UseCompactTableReturn } from '../CompactTable.types';

/**
 * Hook para manejar funcionalidades comunes de CompactTable
 * Incluye filtrado, ordenamiento y búsqueda
 */
export const useCompactTable = ({
  data,
  searchTerm = '',
  sortBy = '',
  sortOrder = 'asc'
}: UseCompactTableProps): UseCompactTableReturn => {
  const [currentSearchTerm, setCurrentSearchTerm] = useState(searchTerm);
  const [currentSortBy, setCurrentSortBy] = useState(sortBy);
  const [currentSortOrder, setCurrentSortOrder] = useState<'asc' | 'desc'>(sortOrder);

  // Datos filtrados por búsqueda
  const filteredData = useMemo(() => {
    if (!currentSearchTerm) return data;

    return data.filter(item =>
      Object.values(item).some(value =>
        String(value).toLowerCase().includes(currentSearchTerm.toLowerCase())
      )
    );
  }, [data, currentSearchTerm]);

  // Datos ordenados
  const sortedData = useMemo(() => {
    if (!currentSortBy) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[currentSortBy];
      const bValue = b[currentSortBy];

      // Manejar números
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return currentSortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Manejar strings
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (currentSortOrder === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [filteredData, currentSortBy, currentSortOrder]);

  // Función para manejar ordenamiento
  const handleSort = (key: string) => {
    if (currentSortBy === key) {
      // Si ya está ordenado por esta columna, cambiar dirección
      setCurrentSortOrder(currentSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Nueva columna, empezar con ascendente
      setCurrentSortBy(key);
      setCurrentSortOrder('asc');
    }
  };

  // Función para manejar búsqueda
  const handleSearch = (term: string) => {
    setCurrentSearchTerm(term);
  };

  return {
    filteredData,
    sortedData,
    handleSort,
    handleSearch
  };
};

export default useCompactTable;