export interface DeleteSicexCargueData {
    consecutivo_sicex: number;
    cantidad_eliminados: number;
}

export interface DeleteSicexCargueResponse {
    success: boolean;
    detail: string;
    data: DeleteSicexCargueData;
}

