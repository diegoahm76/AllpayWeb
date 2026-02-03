// Modelo para los datos del documento generado
export interface DocumentoGenerado {
    id_documento_generado: number;
    documento_generado: string;
    archivo: string;
}

// Modelo para la respuesta completa de la API
export interface DocumentoReporteAcuerdosPagoResponse {
    success: boolean;
    detail: string;
    data: DocumentoGenerado;
}

// Modelo para los parámetros de consulta (filtros de fecha)
export interface DocumentoReporteAcuerdosPagoParams {
    // Parámetros opcionales de filtro
    fecha_inicio?: string;
    fecha_fin?: string;
    estado?: string;
    nombre_recaudador?: string;
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface DocumentoReporteAcuerdosPagoMapped {
    success: boolean;
    detail: string;
    data: DocumentoGenerado;
    error?: string;
} 