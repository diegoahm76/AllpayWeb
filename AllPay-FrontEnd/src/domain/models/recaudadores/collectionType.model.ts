export interface CollectionType {
    cod_tipo_cobro: string;
    descripcion: string;
    fecha_actualizacion: string;
    id_persona_actualiza: number;
}

export interface CollectionTypeResponse {
    success: boolean;
    detail: string;
    data: CollectionType[];
} 