// Modelo para una factura individual del reporte
export interface FacturaReporte {
    id_persona_recaudador: number;
    nombre_recaudador: string;
    tipo_documento_recaudador: string;
    nro_documento_recaudador: string;
    nro_factura_unica: number;
    fecha_compra: string;
    fecha_creacion: string;
    tipo_documento_proveedor: string;
    nro_documento_proveedor: string;
    nombre_proveedor: string;
    id_municipio_cacao: string;
    municipio_cacao_nombre: string;
    id_departamento_cacao: string;
    departamento_cacao_nombre: string;
    total_kilos: number;
    valor_bruto: string;
    cuota_fomento: string;
    valor_neto: string;
    valores_kilo: number[];
    fecha_pago: string;
    nro_documento_soporte: string;
    doc_pago_url: string;
    // Nuevos campos del tipo de cacao
    id_tipo_cacao: number;
    nombre_tipo_cacao: string;
    nro_kilos: number;
    valor_kilo: string;
}

// Modelo para los totales del reporte
export interface ReporteTotales {
    valor_cuota_fomento_total: number;
    total_kilos_facturas: number;
    total_kilos_ajustado: number;
    total_valor_bruto: number;
    total_valor_neto: number;
}

// Modelo para los datos del reporte
export interface ReporteData {
    facturas: FacturaReporte[];
    totales: ReporteTotales;
}

// Modelo para la respuesta completa de la API
export interface ReporteConsolidadoPagoCuotaFomentoResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: ReporteData;
}

// Modelo para los parámetros de consulta
export interface ReporteConsolidadoPagoCuotaFomentoParams {
    // Parámetros obligatorios de paginación
    page: number;
    page_size: number;
    
    // Parámetros opcionales de filtro
    id_departamento_cacao?: string;
    id_municipio_cacao?: string;
    recaudador?: string;
    numero_documento_recaudador?: string;
    id_recaudador?: number;
    fecha_inicio?: string;
    fecha_final?: string;
    numero_documento_proveedor?: string;
    nombres_proveedor?: string;
    sin_paginacion?: boolean;
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface ReporteConsolidadoPagoCuotaFomentoMapped {
    success: boolean;
    facturas: FacturaReporte[];
    totales: ReporteTotales;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    error?: string;
}