// Modelo para un acuerdo de pago individual del reporte
export interface AcuerdoPago {
    numero_solicitud: number;
    fecha_solicitud: string;
    estado: string;
    estado_display: string;
    id_recaudador: number;
    tipo_documento_recaudador: string;
    nombre_recaudador: string;
    numero_plan_pago: number;
    numero_cuotas: number;
    facturas_asociadas: string;
    total_pagar_cuotas_fomento: number;
    total_pagar_intereses: number;
}

// Modelo para la respuesta completa de la API
export interface ReporteAcuerdosPagoResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: AcuerdoPago[];
    
    // Campos opcionales para manejo de errores
    detail?: string;
    message?: string;
    error?: string;
}

// Modelo para los parámetros de consulta
export interface ReporteAcuerdosPagoParams {
    // Parámetros obligatorios de paginación
    page: number;
    page_size: number;
    
    // Parámetros opcionales de filtro
    fecha_inicio?: string;
    fecha_final?: string;
    estado?: string;
    nombre_recaudador?: string;
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface ReporteAcuerdosPagoMapped {
    success: boolean;
    acuerdos: AcuerdoPago[];
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    error?: string;
} 