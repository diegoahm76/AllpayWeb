export interface FacturaLibroCompra {
    id_persona_recaudador: number;
    nro_factura_unica: number;
    fecha_compra: string;
    tipo_documento_proveedor: string;
    nro_documento_proveedor: string;
    nombre_proveedor: string;
    municipio_cacao_nombre: string;
    departamento_cacao_nombre: string;
    total_kilos: number;
    valor_bruto: string;
    cuota_fomento: string;
    valor_neto: string;
    valores_kilo: number[];
}

export interface ReporteLibroComprasData {
    facturas: FacturaLibroCompra[];
    Valor_cuota_fomento_total: number;
    total_kilos: number;
}

export interface ReporteLibroComprasResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: ReporteLibroComprasData;
}

export interface ReporteLibroComprasParams {
    page: number;
    page_size?: number;
    id_recaudador?: number;
    fecha_inicio?: string;
    fecha_final?: string;
    sin_paginacion?: boolean;
} 