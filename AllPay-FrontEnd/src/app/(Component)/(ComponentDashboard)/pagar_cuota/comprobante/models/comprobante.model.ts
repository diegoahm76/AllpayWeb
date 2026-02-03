// Modelo para los datos del pago
export interface PagoComprobante {
    id_pago: number;
    numero_documento_pago: string;
    cod_estado_pago: string;
    cod_medio_pago: string;
    valor_cuota_fomento: number;
    valor_intereses: number;
    valor_pagado: number;
    cod_pago_realizado: string;
    fecha_estado_pago: string;
    fecha_pago: string | null;
    nombres_persona_paga: string;
    apellidos_persona_paga: string;
    email_persona_paga: string;
    nro_celular_persona_paga: string | null;
    bank_code: string | null;
    id_liquidacion_pago: number;
    doc_pago: number;
}

// Modelo para los datos del documento
export interface DocumentoComprobante {
    id_documento_generado: number;
    documento_generado: string;
    archivo: string;
}

// Modelo para la respuesta completa del API
export interface ComprobanteResponse {
    pago: PagoComprobante;
    documento: DocumentoComprobante;
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface ComprobanteMapped {
    success: boolean;
    detail: string;
    data: ComprobanteResponse | null;
}

// Modelo para los parámetros de consulta
export interface ComprobanteParams {
    cod_pago_realizado: string;
} 