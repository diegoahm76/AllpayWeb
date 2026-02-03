export interface TipoPazSalvoData {
    codigo: string;
    descripcion: string;
}

export interface TipoPazSalvoResponse {
    success: boolean;
    detail: string;
    data: [string, string][];
}

export interface TipoPazSalvoMapped {
    success: boolean;
    detail: string;
    data: TipoPazSalvoData[];
} 