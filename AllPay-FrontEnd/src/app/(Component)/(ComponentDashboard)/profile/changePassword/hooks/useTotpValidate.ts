import { useState } from 'react';
import { validarTotp } from '../adapters/totpValidate.adapter';
import { 
    TotpValidatePayload,
    TotpValidateResponse
} from '../models/totpValidate.model';

const useTotpValidate = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const validateTotp = async (
        token: string,
        payload: TotpValidatePayload
    ): Promise<TotpValidateResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await validarTotp(token, payload);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al validar el código TOTP';
            console.error('[useTotpValidate] - Error:', errorMessage);
            setError(errorMessage);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = () => {
        setError(null);
    };

    return {
        isLoading,
        error,
        validateTotp,
        clearError
    };
};

export default useTotpValidate;

