export interface CreateDepartamentoProduccionCacaoPayload {
    cod_departamento: string;
    ano: number;
    produccion: number;
}

export interface CreateDepartamentoProduccionCacaoData {
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

export interface CreateDepartamentoProduccionCacaoResponse {
    success: boolean;
    message: string;
    data: CreateDepartamentoProduccionCacaoData;
}
