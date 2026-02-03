export interface AduanasData {
    aduanas: string[];
}

export interface AduanasResponse {
    success: boolean;
    detail: string;
    data: string[];
}

export interface AduanasParams {
    // Por ahora no hay parámetros específicos, pero se puede extender en el futuro
} 