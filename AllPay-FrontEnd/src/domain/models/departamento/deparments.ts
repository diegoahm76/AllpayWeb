export interface Departamento {
    cod_departamento: string;
    nombre: string;
}

export interface DepartamentoResponse {
    success: boolean;
    detail: string;
    data: Departamento[];
} 