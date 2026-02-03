// Modelo para un registro individual del reporte de cuota fomento
export interface RegistroCuotaFomento {
    fecha_creacion: string;
    tipo_documento_recaudador: string;
    numero_documento_recaudador: string;
    cod_tipo_comprador_recaudador: string;
    nombres_tipo_comprador: string;
    total_kilos: number;
    valor_cuota_fomento: number;
    precio_promedio: number;
    valor_intereses: number;
    nro_doc_pago: string;
    fecha_pago: string | null;
    // Nuevos campos del API actualizado
    nombre_recaudador: string;
    agno_pago: number;
}

// Modelo para las sumatorias del reporte
export interface SumatoriasCuotaFomento {
    sumatoria_kilos: number;
    sumatoria_valor_cuota_fomento: number;
    sumatoria_precio_promedio: number;
    sumatoria_valor_intereses: number;
}

// Modelo para los datos internos de la respuesta
export interface DatosCuotaFomento {
    success: boolean;
    detail: string;
    data: RegistroCuotaFomento[];
    sumatorias: SumatoriasCuotaFomento;
}

// Modelo para la respuesta completa de la API
export interface ReporteCuotaFomentoFechaResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: DatosCuotaFomento;
}

// Modelo para los parámetros de consulta
export interface ReporteCuotaFomentoFechaParams {
    // Parámetros obligatorios de paginación
    page: number;
    page_size: number;
    
    // Parámetro opcional para obtener todos los datos sin paginación
    sin_paginacion?: boolean;
    
    // Parámetros opcionales de filtro
    fecha_inicio?: string;
    fecha_final?: string;
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface ReporteCuotaFomentoFechaMapped {
    success: boolean;
    registros: RegistroCuotaFomento[];
    sumatorias: SumatoriasCuotaFomento;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    error?: string;
} 