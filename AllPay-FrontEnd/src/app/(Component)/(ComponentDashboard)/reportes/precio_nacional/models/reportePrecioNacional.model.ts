// Modelo para un recaudador individual del reporte de precio nacional
export interface RecaudadorPrecioNacional {
    nit_cc_recaudador: string;
    nombre_recaudador: string;
    tipo_recaudador: string;
    total_kilos: number;
    precio_promedio: number;
    total_valor_cuota_fomento: number;
    total_valor_intereses: number;
}

// Modelo para los totales del reporte
export interface TotalesPrecioNacional {
    total_kilos: number;
    total_valor_cuota_fomento: number;
    precio_promedio_total: number;
}

// Modelo para los datos internos de la respuesta
export interface DatosPrecioNacional {
    success: boolean;
    count: number;
    data: {
        recaudadores: RecaudadorPrecioNacional[];
        totales: TotalesPrecioNacional;
    };
}

// Modelo para la respuesta completa de la API
export interface ReportePrecioNacionalResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: DatosPrecioNacional;
}

// Modelo para los parámetros de consulta
export interface ReportePrecioNacionalParams {
    // Parámetros obligatorios de paginación
    page: number;
    page_size: number;
    
    // Parámetros opcionales de filtro
    fecha_inicio?: string;
    fecha_final?: string;
    departamento?: string;
    municipio?: string;
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface ReportePrecioNacionalMapped {
    success: boolean;
    recaudadores: RecaudadorPrecioNacional[];
    totales: TotalesPrecioNacional;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    error?: string;
} 