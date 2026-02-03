export interface TotpGeneratePayload {
    id_2fa: number;
}

export interface TotpData {
    secret: string;
    qr_base64: string;
    otpauth_url: string;
}

export interface TotpGenerateResponse {
    success: boolean;
    detail: string;
    data: TotpData;
}

