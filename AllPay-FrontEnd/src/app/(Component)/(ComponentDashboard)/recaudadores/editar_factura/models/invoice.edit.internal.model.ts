// Interfaces para los detalles de la factura
export interface InvoiceDetail {
    id_detalle_factura_unica: number;
    nro_kilos: number;
    valor_kilo: number;
    id_tipo_cacao: number;
    valor_bruto: number;
    cuota_fomento: number;
    valor_neto: number;
}

// Interface para los datos de actualización
export interface UpdateInvoiceData {
    cod_tipo_comprador?: string;
    nro_documento_soporte?: string;
    doc_soporte?: File;
    detalles_factura?: InvoiceDetail[];
}

// Interface para la respuesta
export interface UpdateInvoiceResponse {
    success?: boolean;
    detail?: string;
    data?: any;
} 