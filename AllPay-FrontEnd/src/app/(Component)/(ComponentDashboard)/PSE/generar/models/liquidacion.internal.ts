export interface DetalleLiquidacion {
    nro_kilos: number;
    valor_kilo: number;
}

export interface LiquidacionData {
    id_factura_unica: number;
    nro_factura_unica: number;
    numero_documento_proveedor: string;
    fecha_creacion_factura: string;
    fecha_compra: string;
    cuota_fomento: number;
    intereses_x_factura: number;
    dias_mora: number;
    fecha_limite_pago: string;
    recaudador_nombre: string;
    tipo_documento_recaudador: string;
    numero_documento_recaudador: string;
    telefono_recaudador: string;
    direccion_recaudador: string;
    representante_legal: string;
    total_kilos: number;
    detalles: DetalleLiquidacion[];
}

export interface LiquidacionResponse {
    success: boolean;
    detail: string;
    data: LiquidacionData[];
}

export interface LiquidacionRequest {
    id_facturas: number[];
    doc_pago_id: number;
    codigo_barras: string;
} 