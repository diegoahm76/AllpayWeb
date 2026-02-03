// Modelo para los datos del documento generado
export interface DocumentoGeneradoSicex {
    id_documento_generado: number;
    documento_generado: string; // Ruta del archivo en el servidor
    archivo: string; // URL completa del archivo para descarga
}

// Modelo para los datos internos de la respuesta
export interface DatosDescargaSicex {
    id_documento_generado: number;
    documento_generado: string;
    archivo: string;
}

// Modelo para la respuesta completa de la API
export interface DescargarReporteSicexResponse {
    success: boolean;
    detail: string;
    data: DatosDescargaSicex;
}

// Modelo para los parámetros de descarga
export interface DescargarReporteSicexParams {
    // Parámetros opcionales de filtro
    fecha_inicio?: string;
    fecha_fin?: string;
    tipo_cargue?: string;
    pais?: string; // Nombre del país para filtrar
    posicion?: string; // Posición arancelaria para filtrar
    via?: string; // Vía de transporte para filtrar
    empresa_declarante?: string; // Empresa declarante para filtrar
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface DescargarReporteSicexMapped {
    success: boolean;
    detail: string;
    id_documento_generado: number;
    documento_generado: string;
    archivo: string;
    error?: string;
} 