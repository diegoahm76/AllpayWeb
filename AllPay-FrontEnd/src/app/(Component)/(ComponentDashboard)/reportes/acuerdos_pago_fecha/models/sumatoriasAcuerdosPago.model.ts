// Modelo para las sumatorias del reporte consolidado
export interface SumatoriasAcuerdosPago {
    total_cuotas_fomento: number;
    total_intereses: number;
}

// Modelo para la respuesta completa de la API
export interface SumatoriasAcuerdosPagoResponse {
    success: boolean;
    detail: string;
    sumatorias: SumatoriasAcuerdosPago;
}

// Modelo para los parámetros de consulta (opcionales para filtros)
export interface SumatoriasAcuerdosPagoParams {
    // Parámetros opcionales de filtro
    fecha_inicio?: string;
    fecha_final?: string;
    estado?: string;
    nombre_recaudador?: string;
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface SumatoriasAcuerdosPagoMapped {
    success: boolean;
    sumatorias: SumatoriasAcuerdosPago;
    detail: string;
    error?: string;
} 