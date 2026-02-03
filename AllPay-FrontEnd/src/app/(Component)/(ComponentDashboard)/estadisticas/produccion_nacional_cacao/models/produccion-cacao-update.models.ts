export interface ProduccionCacaoUpdatePayload {
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

export interface ProduccionCacaoData {
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
    pano: string | null;
}

export interface ProduccionCacaoUpdateResponse {
    success: boolean;
    message: string;
    data: ProduccionCacaoData;
}
