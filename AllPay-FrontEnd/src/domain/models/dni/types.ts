export interface TypeDni {
    id?: number;
    cod_tipo_documento: string;
    nombre: string;
    activo?: boolean;
}

export interface TypeDniResponse {
    success: boolean;
    detail?: string;
    data: TypeDni[];
} 