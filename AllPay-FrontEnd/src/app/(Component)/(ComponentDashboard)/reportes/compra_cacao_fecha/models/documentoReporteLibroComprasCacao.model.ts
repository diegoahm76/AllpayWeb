export interface DocumentoGenerado {
    id_documento_generado: number;
    documento_generado: string;
    archivo: string;
}

export interface DocumentoReporteLibroComprasCacaoData {
    id_documento_generado: number;
    documento_generado: string;
    archivo: string;
}

export interface DocumentoReporteLibroComprasCacaoResponse {
    success: boolean;
    detail: string;
    data: DocumentoReporteLibroComprasCacaoData;
}

export interface DocumentoReporteLibroComprasCacaoParams {
    // Parámetros opcionales que pueden ser enviados para generar el documento
    fecha_inicio?: string;
    fecha_final?: string;
    page_size?: number;
} 