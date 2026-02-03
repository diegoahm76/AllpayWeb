// Modelo para un registro individual del reporte de pagos en línea
export interface RegistroPagoLinea {
    fecha_registro: string;
    nit_recaudador: string;
    nombre_recaudador: string;
    fecha_compra: string;
    nro_factura_unica: number;
    cuota_fomento: string;
    valor_interes: string; // Cambiado a string porque viene formateado como "$0"
    fecha_pago: string;
    nro_comprobante: string;
}

// Modelo para los datos internos de la respuesta
export interface DatosPagosLinea {
    pagos: RegistroPagoLinea[];
    total_cuota: string;
    total_interes: string;
}

// Modelo para la respuesta completa de la API
export interface PagosLineaCuotaFomentoResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: DatosPagosLinea;
    detail?: string; // Campo para mensajes cuando success es false
}

// Modelo para los parámetros de consulta
export interface PagosLineaCuotaFomentoParams {
    // Parámetros obligatorios de paginación
    page: number;
    page_size: number;
    
    // Parámetro opcional para obtener todos los datos sin paginación
    sin_paginacion?: boolean;
    
    // Parámetros opcionales de filtro
    fecha_inicio?: string;
    fecha_fin?: string;
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface PagosLineaCuotaFomentoMapped {
    success: boolean;
    registros: RegistroPagoLinea[];
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    total_cuota?: string;
    total_interes?: string;
    error?: string;
} 