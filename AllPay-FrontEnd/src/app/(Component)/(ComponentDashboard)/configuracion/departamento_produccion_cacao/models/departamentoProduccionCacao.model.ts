export interface DepartamentoProduccionCacao {
    id?: number; // Campo opcional ya que algunos endpoints pueden no incluirlo
    codigo_departamento: string;
    nombre_departamento: string;
    ano: number;
    produccion: number;
    unidad: string;
}

export interface DepartamentoProduccionCacaoApiResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: DepartamentoProduccionCacao[];
}

export interface DepartamentoProduccionCacaoFilters {
    page?: number;
    page_size?: number;
}
