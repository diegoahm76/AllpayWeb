export interface FacturaNoPagada {
    id_factura_unica: number;
    tipo_documento_recaudador: string;
    numero_documento_recaudador: string;
    departamento: string;
    municipio: string;
    fecha_creacion: string;
    fecha_compra: string;
    estado_factura: string;
    estado_factura_display: string;
    tiene_solicitud_acuerdo_pago: boolean;
    fecha_limite_pago: string;
    fecha_limite_pago_interes: string;
    nro_factura_unica: number;
    numero_documento_proveedor: string;
    total_kilos: string | number;
    cuota_fomento: number;
    promedio_valor_kilo: number;
    valor_bruto: number;
    dias_mora: number;
    intereses: number;
    valor_total_pagar: number;
    estado_liquidacion_display: string | null;
}

export interface FacturasNoPagadasResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    facturas: FacturaNoPagada[];
    valor_total_general: number;
} 