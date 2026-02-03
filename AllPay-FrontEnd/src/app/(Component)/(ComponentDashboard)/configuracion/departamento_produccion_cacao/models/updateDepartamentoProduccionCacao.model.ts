export interface UpdateDepartamentoProduccionCacaoPayload {
    produccion: number;
}

export interface UpdateDepartamentoProduccionCacaoData {
    id: number;
    codigo_departamento: string;
    nombre_departamento: string;
    ano: number;
    produccion: string;
}

export interface UpdateDepartamentoProduccionCacaoResponse {
    success: boolean;
    message: string;
    changes: string[];
    data: UpdateDepartamentoProduccionCacaoData;
    accion: string;
}
