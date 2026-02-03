export interface FacturaPagada {
    id_factura_unica: number;
    fecha_creacion: string;
    nro_factura_unica: number;
    id_liq_factura_unica?: number;
    nro_documento_pago?: string;
    nombre_departamento: string;
    nombre_municipio: string;
    nit_proveedor: string;
    fecha_compra: string;
    total_kilos: number;
    total_kilos_certificados: number;
    precio_kilo: number;
    cuota_fomento: string;
    valor_neto?: string;
    fecha_pago?: string;
    kilos_paz_y_salvo?: number;
    id_persona_proveedor: number;
}

// La estructura de la respuesta externa
export interface ApiResponseWrapper {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: FacturasPagadasResponse;
}

// La estructura de la respuesta anidada
export interface FacturasPagadasResponse {
    success: boolean;
    detail: string;
    data: FacturaPagada[];
}

export interface FacturasPagadasMapped {
    success: boolean;
    detail: string;
    data: FacturaPagada[];
    // Información de paginación
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
} 