export interface DocumentoGenerado {
    id_documento_generado: number;
    documento_generado: string;
    archivo: string;
}

export interface DocumentoReporteConsolidadoPagoCuotaFomentoData {
    id_documento_generado: number;
    documento_generado: string;
    archivo: string;
}

export interface DocumentoReporteConsolidadoPagoCuotaFomentoResponse {
    success: boolean;
    detail: string;
    data: DocumentoReporteConsolidadoPagoCuotaFomentoData;
}

export interface DocumentoReporteConsolidadoPagoCuotaFomentoParams {
    // Parámetros opcionales que pueden ser enviados para generar el documento
    id_departamento_cacao?: string;
    id_municipio_cacao?: string;
    recaudador?: string;
    numero_documento_recaudador?: string;
    fecha_inicio?: string;
    fecha_final?: string;
    numero_documento_proveedor?: string;
    nombres_proveedor?: string;
    page_size?: number;
} 