export interface TipoCacao {
    id_tipo_cacao: number;
    nombre: string;
    activo: boolean;
    item_ya_usado: boolean;
    fecha_creacion: string;
    id_persona_crea: number;
    valor_maximo: number;
    valor_minimo: number;
}

export interface TiposCacaoResponse {
    success: boolean;
    detail: string;
    data: TipoCacao[];
}
