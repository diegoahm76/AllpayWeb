export interface CreateHistoricoProduccionCacaoResponse {
    success: boolean;
    message: string;
    data: {
        id: number;
        ano: number;
        enero: string | null;
        febrero: string | null;
        marzo: string | null;
        abril: string | null;
        mayo: string | null;
        junio: string | null;
        julio: string | null;
        agosto: string | null;
        septiembre: string | null;
        octubre: string | null;
        noviembre: string | null;
        diciembre: string | null;
        pano: string;
    };
}

export interface CreateHistoricoProduccionCacaoPayload {
    ano: number;
    enero?: number;
    febrero?: number;
    marzo?: number;
    abril?: number;
    mayo?: number;
    junio?: number;
    julio?: number;
    agosto?: number;
    septiembre?: number;
    octubre?: number;
    noviembre?: number;
    diciembre?: number;
}
