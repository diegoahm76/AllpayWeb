export interface TotpValidatePayload {
    codigo: string;
}

export interface TotpValidateResponse {
    success: boolean;
    detail: string;
}

