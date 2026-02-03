// Modelo para un registro individual del reporte de acuerdos de pago
export interface RegistroAcuerdoPago {
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
    fecha_pago: string;
    // Nuevos campos del API actualizado
    nombre_recaudador: string;
    agno_pago: number;
}

// Modelo para las sumatorias del reporte de acuerdos de pago
export interface SumatoriasAcuerdoPago {
    sumatoria_kilos: number;
    sumatoria_valor_cuota_fomento: number;
    sumatoria_precio_promedio: number;
    sumatoria_valor_intereses: number;
}

// Modelo para los datos internos de la respuesta
export interface DatosAcuerdoPago {
    success: boolean;
    detail: string;
    data: RegistroAcuerdoPago[];
    sumatorias: SumatoriasAcuerdoPago;
}

// Modelo para la respuesta completa de la API
export interface ReporteAcuerdosPagoResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: DatosAcuerdoPago;
}

// Modelo para los parámetros de consulta
export interface ReporteAcuerdosPagoParams {
    // Parámetros obligatorios de paginación
    page: number;
    page_size: number;
    
    // Parámetros opcionales de filtro
    fecha_inicio?: string;
    fecha_final?: string;
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface ReporteAcuerdosPagoMapped {
    success: boolean;
    registros: RegistroAcuerdoPago[];
    sumatorias: SumatoriasAcuerdoPago;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    error?: string;
} 