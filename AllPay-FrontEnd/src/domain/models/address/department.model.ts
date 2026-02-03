export interface DepartamentoColombia {
    cod_departamento: string;
    nombre: string;
}

export interface DepartamentoColombiaResponse {
    success: boolean;
    detail: string;
    data: DepartamentoColombia[];
} 