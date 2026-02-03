export interface SolicitudAcuerdoPagoDetalle {
    id_solicitud_acuerdo_pago: number;
    id_persona_solicita: number;
    id_persona_solicita_nombre: string;
    nro_solicitud: number;
    fecha_solicitud: string;
    estado: string;
    nombre_recaudador: string;
    tipo_documento: string;
    numero_documento: string;
    id_plan_pago: number;
    numero_plan_pago: number;
    estado_plan_pago: string;
    estado_plan_pago_display: string;
}

export interface DetallePlanPagoItem {
    id_solicitud_acuerdo_pago: number;
    nro_solicitud: number;
    id_cuota_acuerdo_pago: number;
    id_plan_pago: number;
    nro_plan_pago: number;
    estado_plan_pago: string;
    numero_cuota: number;
    fecha_pago: string;
    facturas: FacturaItem[];

}

export interface DetalleAcuerdoPagoResponse {
    success: boolean;
    detail: string;
    solicitud_acuerdo_pago: SolicitudAcuerdoPagoDetalle;
    detalle_plan_pago: DetallePlanPagoItem[];
} 

export interface FacturaItem {
    id_factura_unica: number;
    nro_factura: number;
    cuota_fomento: number;
    valor_factura: number;
    doc_pago_liquidacion: string;
}


