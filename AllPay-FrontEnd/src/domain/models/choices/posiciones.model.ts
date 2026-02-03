export interface PosicionesData {
    posiciones: string[];
}

export interface PosicionesResponse {
    success: boolean;
    detail: string;
    data: string[];
}

export interface PosicionesParams {
    // Por ahora no hay parámetros específicos, pero se puede extender en el futuro
} 