// Modelo para los datos del documento generado
export interface DocumentoGeneradoReporteConsolidado {
    id_documento: number;
    url_documento: string; // URL completa del archivo para descarga
    fecha_generacion: string | null;
    total_ubicaciones: number;
    periodo: string;
}

// Modelo para los datos internos de la respuesta
export interface DatosDescargaReporteConsolidado {
    id_documento: number;
    url_documento: string;
    fecha_generacion: string | null;
    total_ubicaciones: number;
    periodo: string;
}

// Modelo para la respuesta completa de la API
export interface DescargarReporteConsolidadoResponse {
    success: boolean;
    detail: string;
    data: DatosDescargaReporteConsolidado;
}

// Modelo para los parámetros de descarga
export interface DescargarReporteConsolidadoParams {
    // Parámetros de paginación
    page?: number;
    page_size?: number;
    // Parámetros de filtro por fecha
    fecha_inicio?: string;
    fecha_final?: string;
    // Parámetros de filtro por ubicación
    id_departamento_cacao?: string;
    id_municipio_cacao?: string;
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface DescargarReporteConsolidadoMapped {
    success: boolean;
    detail: string;
    id_documento: number;
    url_documento: string;
    fecha_generacion: string | null;
    total_ubicaciones: number;
    periodo: string;
    error?: string;
} 