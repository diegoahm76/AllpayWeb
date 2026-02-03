// Modelo para los datos del documento generado
export interface DocumentoGeneradoCuotaFomento {
    id_documento_generado: number;
    documento_generado: string; // Ruta del archivo en el servidor
    archivo: string; // URL completa del archivo para descarga
}

// Modelo para los datos internos de la respuesta
export interface DatosDescargaCuotaFomento {
    id_documento_generado: number;
    documento_generado: string;
    archivo: string;
}

// Modelo para la respuesta completa de la API
export interface DescargarDocumentoCuotaFomentoResponse {
    success: boolean;
    detail: string;
    data: DatosDescargaCuotaFomento;
}

// Modelo para los parámetros de descarga
export interface DescargarDocumentoCuotaFomentoParams {
    // Parámetros opcionales de filtro
    fecha_inicio?: string;
    fecha_final?: string;
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface DescargarDocumentoCuotaFomentoMapped {
    success: boolean;
    detail: string;
    id_documento_generado: number;
    documento_generado: string;
    archivo: string;
    error?: string;
} 