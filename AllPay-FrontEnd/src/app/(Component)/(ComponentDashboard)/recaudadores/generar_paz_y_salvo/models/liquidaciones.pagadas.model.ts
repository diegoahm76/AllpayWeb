// Modelo para liquidación pagada individual
export interface LiquidacionPagada {
    id_liq_factura_unica: number;
    archivo: string;
    cod_estado: string;
    nro_doc_pago: string;
    fecha_pago: string | null;
    valor_pagar: string;
    valor_intereses: string;
    fecha_liquidacion: string;
    codigo_barras: string;
    id_persona_liquida: number;
    doc_pago: number;
}

// Estructura anidada de la respuesta de la API
export interface LiquidacionesPagadasDataResponse {
    success: boolean;
    detail: string;
    data: LiquidacionPagada[];
}

// Estructura completa de la respuesta de la API
export interface LiquidacionesPagadasApiResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: LiquidacionesPagadasDataResponse;
}

// La estructura mapeada para el uso en la aplicación
export interface LiquidacionesPagadasMapped {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: LiquidacionPagada[];
} 