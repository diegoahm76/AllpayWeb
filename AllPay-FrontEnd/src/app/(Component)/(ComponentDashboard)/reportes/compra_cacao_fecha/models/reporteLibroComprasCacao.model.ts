// Modelo para una factura individual del reporte de libro de compras
export interface FacturaLibroCompra {
    tipo_documento_recaudador: string;
    numero_doc_recaudador: string;
    nombre_recaudador: string;
    fecha_compra: string;
    nro_factura_unica: number;
    tipo_documento_proveedor: string;
    numero_doc_proveedor: string;
    municipio_cacao_nombre: string;
    departamento_cacao_nombre: string;
    kilos_comprados: number;
    precio_kilo: number;
    nombreproveedor: string;
    valor_bruto: string;
    cuota_fomento: string;
    valor_neto: string;
}

// Modelo para los totales del reporte
export interface ReporteTotales {
    valor_cuota_fomento_total: number;
    total_kilos: number;
    total_valor_bruto: number;
    total_valor_neto: number;
}

// Modelo para los datos del reporte
export interface ReporteLibroComprasData {
    facturas: FacturaLibroCompra[];
    totales: ReporteTotales;
}

// Modelo para la respuesta completa de la API
export interface ReporteLibroComprasCacaoResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: ReporteLibroComprasData;
}

// Modelo para los parámetros de consulta
export interface ReporteLibroComprasCacaoParams {
    // Parámetros obligatorios de paginación
    page: number;
    page_size: number;
    
    // Parámetros opcionales de filtro
    fecha_inicio?: string;
    fecha_final?: string;
    sin_paginacion?: boolean;
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface ReporteLibroComprasCacaoMapped {
    success: boolean;
    facturas: FacturaLibroCompra[];
    totales: ReporteTotales;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    error?: string;
} 