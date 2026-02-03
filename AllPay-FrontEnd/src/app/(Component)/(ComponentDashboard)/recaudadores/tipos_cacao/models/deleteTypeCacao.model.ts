export interface DeleteTypeCacaoResponse {
    success: boolean;
    detail: string;
    data: {
        id_tipo_cacao: number | null;
        nombre: string;
        activo: boolean;
        item_ya_usado: boolean;
        fecha_creacion: string;
        id_persona_crea: number;
    };
} 