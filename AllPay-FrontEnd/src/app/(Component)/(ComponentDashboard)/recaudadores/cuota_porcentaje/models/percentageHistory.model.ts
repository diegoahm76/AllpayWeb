export interface PercentageHistoryData {
    id_historial_porcentaje_cobro: number;
    nombre_persona_crea: string | null;
    id_persona_actualiza: number;
    nombre_persona_actualiza: string;
    cod_tipo_cobro: string;
    valor: string;
    fecha_creacion: string | null;
    fecha_actualizacion: string;
    id_persona_crea: number | null;
}

export interface PercentageHistoryResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: {
        success: boolean;
        detail: string;
        data: PercentageHistoryData[];
    };
}

export interface PercentageHistoryFilters {
    page?: number;
    page_size?: number;
    cod_tipo_cobro?: string;
} 