export interface DetalleCompra {
    nro_kilos: number;
    valor_kilo: number;
}

export interface LiquidacionCompraData {
    id_factura_unica: number;
    nro_factura_unica: number;
    numero_documento_proveedor: string;
    fecha_creacion_factura: string;
    fecha_compra: string;
    cuota_fomento: number;
    intereses_x_factura: number;
    dias_mora: number;
    fecha_limite_pago: string;
    fecha_limite_pago_intereses: string;
    recaudador_nombre: string;
    tipo_documento_recaudador: string;
    numero_documento_recaudador: string;
    telefono_recaudador: string;
    direccion_recaudador: string;
    representante_legal: string | null;
    total_kilos: number;
    promedio_valor_kilo: number;
    detalles: DetalleCompra[];
    valor_intereses_total: number;
    cuota_fomento_total: number;
    valor_a_pagar: number;
    fecha_liquidacion: string;
    nro_doc_pago: string;
}

export interface LiquidacionComprasAcuerdoPagoResponse {
    success: boolean;
    detail: string;
    data: LiquidacionCompraData[];
}

export interface LiquidacionComprasAcuerdoPagoRequest {
    id_cuotas: number[];
    doc_pago_id: number;
    codigo_barras: string;
} 