// Modelo para un registro individual del reporte de intereses de acuerdo de pago
export interface RegistroInteresesAcuerdoPago {
    fecha_creacion: string;
    tipo_documento_recaudador: string;
    numero_documento_recaudador: string;
    fecha_pago: string;
    nro_doc_pago: string;
    valor_intereses: number;
    // Nuevos campos del API actualizado
    nombre_recaudador: string;
    mes: string;
}

// Modelo para las sumatorias del reporte de intereses de acuerdo de pago
export interface SumatoriasInteresesAcuerdoPago {
    sumatoria_valor_intereses: number;
}

// Modelo para los datos internos de la respuesta
export interface DatosInteresesAcuerdoPago {
    success: boolean;
    detail: string;
    data: RegistroInteresesAcuerdoPago[];
    sumatorias: SumatoriasInteresesAcuerdoPago;
}

// Modelo para la respuesta completa de la API
export interface ReporteInteresesAcuerdoPagoResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: DatosInteresesAcuerdoPago;
}

// Modelo para los parámetros de consulta
export interface ReporteInteresesAcuerdoPagoParams {
    // Parámetros obligatorios de paginación
    page: number;
    page_size: number;
    
    // Parámetros opcionales de filtro
    fecha_inicio?: string;
    fecha_final?: string;
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface ReporteInteresesAcuerdoPagoMapped {
    success: boolean;
    registros: RegistroInteresesAcuerdoPago[];
    sumatorias: SumatoriasInteresesAcuerdoPago;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    error?: string;
} 