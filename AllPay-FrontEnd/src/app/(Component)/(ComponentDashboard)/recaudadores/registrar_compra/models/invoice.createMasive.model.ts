export interface DetailFacturaMasiva {
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
    valor_kilo: string;
    valor_bruto: number;
    cuota_fomento: number;
    valor_neto: number;
    nro_documento_soporte: string;
    doc_soporte: string | null;
    doc_soporte_url: string | null;
    proveedor_info: {
        id_proveedor: number;
        nombre_completo_o_comercial: string;
        tipo_documento: string;
        numero_documento: string;
        municipio: string | null;
        departamento: string | null;
    };
    recaudador_info: {
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
        tipo_comprador: string;
        nro_factura_unica: number;
    };
}

export interface FacturaMasiva {
    id_factura_unica: number;
    nombre_persona_recaudador: string;
    nombre_persona_proveedor: string;
    nro_documento_proveedor: string;
    tipo_documento_proveedor: string;
    nombre_municipio_cacao: string;
    nombre_departamento_cacao: string;
    id_porcentaje_cobro: number;
    cod_tipo_cobro: string;
    cod_tipo_cobro_nombre: string;
    valor_porcentaje_cobro: number;
    cod_tipo_comprador: string;
    doc_soporte_url: string | null;
    nombre_cod_tipo_comprador: string | null;
    fecha_compra: string;
    nro_factura_unica: number;
    total_kilos: number;
    valor_bruto: string;
    cuota_fomento: string;
    valor_neto: string;
    nro_documento_soporte: string;
    doc_soporte: string | null;
    fecha_doc_soporte: string | null;
    fecha_creacion: string;
    id_persona_recaudador: number;
    id_liq_factura_unica: number | null;
    id_persona_proveedor: number;
    id_municipio_cacao: string;
    id_departamento_cacao: string;
    id_persona_crea: number;
    detalles: DetailFacturaMasiva[];
    nro_factura_plantilla: number;
    nro_factura_nuevo: number;
}

export interface CreateMassiveInvoiceResponse {
    success: boolean;
    detail: string;
    uuid_cargue?: string;
    facturas_creadas: FacturaMasiva[];
    errores?: Array<{
        nro_factura_plantilla: number;
        error: string;
    }>;
} 