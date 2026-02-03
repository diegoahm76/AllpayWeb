export interface Factura {
    id_factura_unica: number;
    fecha_compra: string;
    nro_factura_unica: number;
    id_persona_proveedor: number;
    nit_proveedor: string;
    nombre_proveedor: string;
    id_municipio_cacao: string;
    nombre_municipio: string;
    id_departamento_cacao: string;
    nombre_departamento: string;
    total_kilos: number;
    valor_bruto: string;
    cuota_fomento: string;
    valor_neto: string;
    estado_factura: string;
}

export interface TableroControlComprasCacaoData {
    facturas: Factura[];
}

export interface TableroControlComprasCacaoResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next?: string;
    previous?: string;
    data: TableroControlComprasCacaoData;
}

export interface TableroControlComprasCacaoParams {
    fecha_inicio?: string;        // YYYY-MM-DD - Fecha de inicio (opcional)
    fecha_fin?: string;          // YYYY-MM-DD - Fecha de fin (opcional)
    estado?: string;             // Estado de la factura (opcional)
    id_departamento?: number;    // ID del departamento (opcional)
    id_municipio?: number;       // ID del municipio (opcional)
    page?: number;               // Número de página (opcional)
    page_size?: number;          // Tamaño de página (opcional)
    id_recaudador?: number;      // ID del recaudador (opcional)
    sin_paginacion?: boolean;    // Para obtener todos los datos sin paginación (opcional)
}
