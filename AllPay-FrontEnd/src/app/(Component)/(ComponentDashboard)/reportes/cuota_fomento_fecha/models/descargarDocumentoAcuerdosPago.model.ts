// Modelo para los datos del documento generado
export interface DocumentoGeneradoAcuerdosPago {
    id_documento_generado: number;
    documento_generado: string; // Ruta del archivo en el servidor
    archivo: string; // URL completa del archivo para descarga
}

// Modelo para los datos internos de la respuesta
export interface DatosDescargaAcuerdosPago {
    id_documento_generado: number;
    documento_generado: string;
    archivo: string;
}

// Modelo para la respuesta completa de la API
export interface DescargarDocumentoAcuerdosPagoResponse {
    success: boolean;
    detail: string;
    data: DatosDescargaAcuerdosPago;
}

// Modelo para los parámetros de descarga
export interface DescargarDocumentoAcuerdosPagoParams {
    // Parámetros opcionales de filtro
    fecha_inicio?: string;
    fecha_fin?: string;
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface DescargarDocumentoAcuerdosPagoMapped {
    success: boolean;
    detail: string;
    id_documento_generado: number;
    documento_generado: string;
    archivo: string;
    error?: string;
} 