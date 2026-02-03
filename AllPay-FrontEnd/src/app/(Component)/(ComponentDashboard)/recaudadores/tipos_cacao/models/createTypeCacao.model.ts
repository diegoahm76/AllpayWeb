export interface CreateTypeCacaoResponse {
    success: boolean;
    detail: string;
    data: {
        id_tipo_cacao: number;
        nombre: string;
        activo: boolean;
        valor_minimo: number;
        valor_maximo: number;
        item_ya_usado: boolean;
        fecha_creacion: string;
        id_persona_crea: number;
    };
}

export interface CreateTypeCacaoPayload {
    nombre: string;
    activo: boolean;
    valor_minimo: number;
    valor_maximo: number;
} 