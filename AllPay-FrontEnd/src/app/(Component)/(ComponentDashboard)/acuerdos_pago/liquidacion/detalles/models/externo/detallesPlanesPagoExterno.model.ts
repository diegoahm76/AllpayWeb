export interface DetallePlanAcuerdoPago {
    id_solicitud_acuerdo_pago: number;
    id_detalle_acuerdo_pago: number;
    id_plan_pago: number;
    nro_solicitud: number;
    id_cuota_acuerdo_pago: number;
    tipo_documento_recaudador: string;
    numero_documento_recaudador: string;
    nombre_recaudador: string;
    fecha_solicitud: string;
    estado: string;
    numero_plan_pago: number;
    estado_plan_pago: string;
    estado_plan_pago_display: string;
    numero_cuota: number;
    fecha_pago: string | null;
    Nro_factura: number;
    pagada: boolean;
    cuota_liquidada: boolean;
    cuota_fomento: number;
    valor_factura: number;
}

export interface DetallesPlanesPagoResponseExterno {
    success: boolean;
    detail: string;
    data: DetallePlanAcuerdoPago[];
} 