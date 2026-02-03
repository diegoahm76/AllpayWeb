export interface DeudorPorUbicacion {
    nombre: string;
    kilos: number;
    intereses: number;
    cuotaFomento: number;
    totalMoroso: number;
    deudores: number;
}

export interface TableroDeudoresPorUbicacionData {
    deudoresPorUbicacion: DeudorPorUbicacion[];
}

export interface TableroDeudoresPorUbicacionResponse {
    success: boolean;
    detail: string;
    data: DeudorPorUbicacion[];
}

export interface TableroDeudoresPorUbicacionParams {
    fecha_inicio?: string;
    fecha_fin?: string;
    numero_documento?: string;
}
