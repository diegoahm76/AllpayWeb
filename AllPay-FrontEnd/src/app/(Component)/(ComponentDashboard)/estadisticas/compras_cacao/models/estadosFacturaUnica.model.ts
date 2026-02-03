export interface EstadoFacturaUnica {
    codigo: string;
    nombre: string;
}

export interface EstadosFacturaUnicaResponse {
    success: boolean;
    detail: string;
    data: EstadoFacturaUnica[];
}

// Tipo para el array de arrays que devuelve el API
export type EstadosFacturaUnicaRawData = [string, string][];
