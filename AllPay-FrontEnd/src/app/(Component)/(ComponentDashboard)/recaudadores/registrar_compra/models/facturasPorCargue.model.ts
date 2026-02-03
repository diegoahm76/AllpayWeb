export interface ProveedorInfo {
    id_proveedor: number;
    nombre_completo_o_comercial: string;
    tipo_documento: string;
    numero_documento: string;
    municipio: string;
    departamento: string;
}

export interface RecaudadorInfo {
    id_recaudador: number;
    fecha_compra: string;
    fecha_registro: string;
    tipo_documento: string;
    numero_documento: string;
    nombre_completo_o_comercial: string;
    telefono: string;
    email: string;
    direccion_notificaciones: string;
    municipio: string;
    departamento: string;
    nro_factura_unica: number;
    cod_tipo_comprador: string;
    nombres_tipo_comprador: string;
}

export interface DetalleFacturaUnica {
    id_detalle_factura_unica: number;
    id_factura_unica: number;
    id_porcentaje_cobro: number;
    nombre_tipo_cobro: string;
    cod_tipo_cobro: string;
    valor_porcentaje_cobro: number;
    id_tipo_cacao: number;
    nro_kilos: number;
    nombre_tipo_cacao: string;
    nombre_municipio_cacao: string;
    nombre_departamento_cacao: string;
    nombre_vereda: string | null;
    nombre_finca: string | null;
    valor_kilo: string;
    valor_bruto: number;
    cuota_fomento: number;
    valor_neto: number;
    estado_factura: string;
    cod_estado_liquidacion: string;
    cod_estado_liquidacion_display: string;
    doc_soporte: string | null;
    doc_soporte_url: string | null;
    doc_pago_liquidacion: string | null;
    proveedor_info: ProveedorInfo;
    recaudador_info: RecaudadorInfo;
    nro_documento_soporte: string;
}

export interface FacturaPorCargueItem {
    id_factura_unica: number;
    nombre_persona_recaudador: string;
    nro_documento_recaudador: string;
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
    fecha_pago_liquidacion: string | null;
    estado_factura_display: string;
    fecha_compra: string;
    nro_factura_unica: number;
    total_kilos: number;
    valor_bruto: string;
    cuota_fomento: string;
    valor_neto: string;
    nombre_vereda: string | null;
    nombre_finca: string | null;
    nro_documento_soporte: string;
    doc_soporte: string | null;
    fecha_doc_soporte: string | null;
    fecha_creacion: string;
    estado_factura: string;
    uuid_cargue: string;
    id_persona_recaudador: number;
    id_liq_factura_unica: number | null;
    id_persona_proveedor: number;
    id_municipio_cacao: string;
    id_departamento_cacao: string;
    id_persona_crea: number;
    detalles: DetalleFacturaUnica[];
}

export interface FacturasPorCargueResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: FacturaPorCargueItem[];
    detail?: string; // en caso de error
}


