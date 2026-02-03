/**
 * Tipos y interfaces para el componente CompactTable
 */

// Configuración de una columna de la tabla
export interface CompactTableColumn {
  /** Clave única de la columna */
  key: string;
  /** Etiqueta que se mostrará en el header */
  label: string;
  /** Ancho de la columna en porcentaje (ej: '40%') */
  align?: 'left' | 'center' | 'right';
  /** Si el contenido se puede truncar con tooltip */
  truncate?: boolean;
  /** Función personalizada para renderizar el contenido */
  render?: (value: any, item: any) => React.ReactNode;
}

// Fila de total personalizada
export interface CompactTableTotal {
  /** Valores para cada columna en la fila de total */
  values: (string | number)[];
  /** Clases CSS adicionales para el total */
  className?: string;
}

// Props principales del componente
export interface CompactTableProps {
  /** Configuración de las columnas */
  columns: CompactTableColumn[];
  /** Datos a mostrar en la tabla */
  data: any[];
  /** Título de la tabla */
  title?: string;
  /** Fila de totales (opcional) */
  total?: CompactTableTotal;
  /** Altura máxima de la tabla */
  maxHeight?: string;
  /** Estado de carga */
  isLoading?: boolean;
  /** Mensaje cuando no hay datos */
  emptyMessage?: string;
  /** Clase CSS adicional */
  className?: string;
  /** Tema (para compatibilidad) */
  theme?: 'light' | 'dark';
  /** Modo oscuro activado */
  darkMode?: boolean;
  /** Mostrar índices numéricos automáticamente */
  showIndex?: boolean;
}

// Hook para manejar datos de la tabla
export interface UseCompactTableProps {
  data: any[];
  searchTerm?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UseCompactTableReturn {
  filteredData: any[];
  sortedData: any[];
  handleSort: (key: string) => void;
  handleSearch: (term: string) => void;
}