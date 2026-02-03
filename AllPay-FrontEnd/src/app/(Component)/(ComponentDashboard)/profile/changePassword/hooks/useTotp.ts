import { useState } from 'react';
import { generarTotp } from '../adapters/totp.adapter';
import { 
    TotpGeneratePayload,
    TotpGenerateResponse,
    TotpData
} from '../models/totp.model';

const useTotp = () => {
    const [data, setData] = useState<TotpData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateTotp = async (
        token: string,
        payload: TotpGeneratePayload
    ): Promise<TotpGenerateResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await generarTotp(token, payload);
            setData(response.data);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al generar el código QR TOTP';
            console.error('[useTotp] - Error:', errorMessage);
            setError(errorMessage);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const clearData = () => {
        setData(null);
        setError(null);
    };

    return {
        data,
        isLoading,
        error,
        generateTotp,
        clearData
    };
};

export default useTotp;

