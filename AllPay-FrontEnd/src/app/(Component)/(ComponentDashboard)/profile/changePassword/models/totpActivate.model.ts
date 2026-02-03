export interface TotpActivatePayload {
    codigo: string;
}

export interface TotpActivateResponse {
    success: boolean;
    detail: string;
}

