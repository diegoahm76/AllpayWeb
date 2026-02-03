// Modelo para los datos del documento generado
export interface DocumentoGeneradoPagosLinea {
    id_documento_generado: number;
    documento_generado: string; // Ruta del archivo en el servidor
    archivo: string; // URL completa del archivo para descarga
}

// Modelo para los datos internos de la respuesta
export interface DatosDescargaPagosLinea {
    id_documento_generado: number;
    documento_generado: string;
    archivo: string;
}

// Modelo para la respuesta completa de la API
export interface DescargarDocumentoPagosLineaResponse {
    success: boolean;
    detail: string;
    data: DatosDescargaPagosLinea;
}

// Modelo para los parámetros de descarga
export interface DescargarDocumentoPagosLineaParams {
    // Parámetros opcionales de filtro
    fecha_inicio?: string;
    fecha_fin?: string;
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface DescargarDocumentoPagosLineaMapped {
    success: boolean;
    detail: string;
    id_documento_generado: number;
    documento_generado: string;
    archivo: string;
    error?: string;
} 