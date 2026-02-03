export interface CarteraPorEdad {
    rango: string;
    cuotaFomento: number;
    intereses: number;
}

export interface TableroCarteraPorEdadData {
    carteraPorEdad: CarteraPorEdad[];
}

export interface TableroCarteraPorEdadResponse {
    success: boolean;
    detail: string;
    data: TableroCarteraPorEdadData;
}

export interface TableroCarteraPorEdadParams {
    fecha_inicio?: string;
    fecha_fin?: string;
    numero_documento?: string;
}
