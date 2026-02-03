export interface FacturaInfo {
    id_factura_unica: number;
    nro_factura_unica: number;
    doc_pago_url: string | null;
}

export interface CuotaLiquidada {
    id_solicitud_acuerdo_pago: number;
    id_plan_pago: number;
    nro_solicitud: number;
    doc_liquidacion_url: string | null;
    nro_plan_pago: number;
    id_cuota_acuerdo_pago: number;
    nro_cuota: number;
    fecha_vencimiento: string;
    fecha_pago: string | null;
    valor_cuota: number;
    pagada: boolean;
    liquidada: boolean;
    id_liquidacion: number | null;
    id_factura_unica: number[];
    nro_factura_unica: number[];
    fecha_compra: string[];
    fecha_liquidacion: string[];
}

export interface PlanPagoCuotaPagada {
    id_solicitud_acuerdo_pago: number;
    id_plan_pago: number;
    nro_solicitud: number;
    nro_plan_pago: number;
    nro_cuotas: number;
    fecha_solicitud: string;
    valor_total_pagar: number;
    cuota_fomento_total: number;
    intereses_total: number;
    dias_mora: number;
    estado_display: string;
    estado: string;
    observaciones: string;
    estado_plan_pago: string;
    estado_plan_pago_display: string;
    id_recaudador: number;
    tipo_documento: string;
    numero_documento: string;
    nombre_recaudador: string;
    facturas_asociadas: string;
    facturas_info: FacturaInfo[];
    cuotas_liquidadas: CuotaLiquidada[];
}

// Nueva interfaz para representar cada cuota liquidada en la tabla
export interface CuotaLiquidadaParaTabla {
    nro_solicitud: number;
    nro_plan_pago: number;
    nro_cuota: number;
    valor_cuota: number;
    pagada: boolean;
    estado_plan_pago_display: string;
    nombre_recaudador: string;
    facturas_asociadas: string;
    fecha_vencimiento: string;
    fecha_pago: string | null;
    // Datos originales para acciones
    id_plan_pago: number;
    id_cuota_acuerdo_pago: number;
    nro_cuotas_plan: number;
    doc_liquidacion_url: string | null;
}

export interface PlanesPagoData {
    success: boolean;
    detail: string;
    data: PlanPagoCuotaPagada[];
}

export interface ResponseCuotasPagadas {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: PlanesPagoData;
} 