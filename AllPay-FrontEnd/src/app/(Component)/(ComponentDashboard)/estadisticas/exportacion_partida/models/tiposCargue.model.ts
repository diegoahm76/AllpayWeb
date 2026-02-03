export interface TipoCargue {
    codigo: string;
    nombre: string;
}

export interface TiposCargueData {
    tipos: TipoCargue[];
}

export interface TiposCargueResponse {
    success: boolean;
    detail: string;
    data: [string, string][]; // Array de arrays con [codigo, nombre]
}

export interface TiposCargueParams {
    // Por ahora no hay parámetros específicos, pero se puede extender en el futuro
} 