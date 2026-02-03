export interface HistoricoProduccionCacao {
    id: number;
    ano: number;
    enero: string;
    febrero: string;
    marzo: string;
    abril: string;
    mayo: string;
    junio: string;
    julio: string;
    agosto: string;
    septiembre: string;
    octubre: string;
    noviembre: string;
    diciembre: string;
    pano: string;
}

export interface HistoricoProduccionCacaoApiResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: HistoricoProduccionCacao[];
}

export interface HistoricoProduccionCacaoFilters {
    page?: number;
    page_size?: number;
}
