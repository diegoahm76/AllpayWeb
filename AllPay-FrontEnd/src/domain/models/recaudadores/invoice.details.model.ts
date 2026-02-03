interface ProveedorInfo {
    id_proveedor: number;
    nombre_completo_o_comercial: string;
    tipo_documento: string;
    numero_documento: string;
    municipio: string;
    departamento: string;
}

interface RecaudadorInfo {
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
    cod_tipo_comprador: string;

}

interface InvoiceDetail {
    id_detalle_factura_unica: number;
    id_factura_unica: number;
    id_tipo_cacao: number;
    nro_kilos: number;
    valor_kilo: string;
    nombre_tipo_cacao: string;
    valor_bruto: number;
    cuota_fomento: number;
    valor_neto: number;
    doc_soporte: string;
    doc_soporte_url: string;
    nro_documento_soporte: string;
    nombre_municipio_cacao: string;
    nombre_departamento_cacao: string;
    nombre_finca: string;
    nombre_vereda: string;
    proveedor_info: ProveedorInfo;
    recaudador_info: RecaudadorInfo;
}

interface ApiResponse {
    success: boolean;
    detail: string;
    data: InvoiceDetail[];
}

export type { InvoiceDetail, ApiResponse };
