// Modelo para los datos del documento generado
export interface DatosDocumentoPrecioNacional {
    id_documento: number;
    url_documento: string;
    fecha_generacion: string | null;
    total_recaudadores: number;
    periodo: string;
}

// Modelo para la respuesta completa de la API
export interface DocumentoPrecioNacionalResponse {
    success: boolean;
    detail: string;
    data: DatosDocumentoPrecioNacional;
}

// Modelo para los parámetros de generación del documento
export interface DocumentoPrecioNacionalParams {
    // Parámetros obligatorios
    fecha_inicio: string;
    fecha_final: string;
    
    // Parámetros opcionales
    municipio?: string;
    departamento?: string;
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface DocumentoPrecioNacionalMapped {
    success: boolean;
    id_documento: number;
    url_documento: string;
    fecha_generacion: string | null;
    total_recaudadores: number;
    periodo: string;
    detail: string;
    error?: string;
} 