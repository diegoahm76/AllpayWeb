export interface DocumentoGenerado {
    id_documento_generado: number;
    documento_generado: string;
    archivo: string;
}

export interface DocumentoReporteLibroComprasData {
    id_documento_generado: number;
    documento_generado: string;
    archivo: string;
}

export interface DocumentoReporteLibroComprasResponse {
    success: boolean;
    detail: string;
    data: DocumentoReporteLibroComprasData;
}

export interface DocumentoReporteLibroComprasParams {
    // Parámetros opcionales que pueden ser enviados para generar el documento
    id_recaudador?: number;
    fecha_inicio?: string;
    fecha_final?: string;
    page_size?: number;
} 