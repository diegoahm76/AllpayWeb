import { useState } from 'react';
import { activarTotp } from '../adapters/totpActivate.adapter';
import { 
    TotpActivatePayload,
    TotpActivateResponse
} from '../models/totpActivate.model';

const useTotpActivate = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activateTotp = async (
        token: string,
        payload: TotpActivatePayload
    ): Promise<TotpActivateResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await activarTotp(token, payload);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al activar el método TOTP';
            console.error('[useTotpActivate] - Error:', errorMessage);
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
        activateTotp,
        clearError
    };
};

export default useTotpActivate;

