export interface CollectorInvoiceExternal {
    id_factura_unica: number;
    nombre_persona_recaudador: string;
    direccion_contacto_recaudador: string;
    telefono_contacto_recaudador: string;
    email_contacto_recaudador: string;
    nombre_persona_proveedor: string;
    nro_documento_proveedor: string;
    tipo_documento_proveedor: string;
    nombre_municipio_cacao: string;
    nombre_departamento_cacao: string;
    cod_estado_liquidacion: string;
    cod_estado_liquidacion_display: string;
    id_porcentaje_cobro: number;
    cod_tipo_cobro: string;
    cod_tipo_cobro_nombre: string;
    valor_porcentaje_cobro: number;
    nombres_tipo_comprador: string;
    doc_soporte_url: string | null;
    doc_pago_liquidacion: string | null;
    estado_factura_display: string;
    fecha_compra: string;
    nro_factura_unica: number;
    total_kilos: number;
    valor_bruto: string;
    cuota_fomento: string;
    valor_neto: string;
    nro_documento_soporte: string;
    doc_soporte: string | null;
    fecha_doc_soporte: string;
    fecha_creacion: string;
    estado_factura: string;
    id_persona_recaudador: number;
    id_liq_factura_unica: number;
    id_persona_proveedor: number;
    id_municipio_cacao: string;
    id_departamento_cacao: string;
    id_persona_crea: number;
}

export interface CollectorInvoicesExternalResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: CollectorInvoiceExternal[];
} 