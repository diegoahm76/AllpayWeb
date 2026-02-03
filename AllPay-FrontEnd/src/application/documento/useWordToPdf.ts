import { useState } from 'react';
import { convertWordToPdf } from '@/adapters/documento/wordToPdf';
import { WordToPdfResponse } from '@/domain/models/documento/wordToPdf.model';

export const useWordToPdf = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [response, setResponse] = useState<WordToPdfResponse | null>(null);

    const convertToPdf = async (token: string, documento_generado: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await convertWordToPdf(token, documento_generado);
            setResponse(result);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        convertToPdf,
        isLoading,
        error,
        response
    };
}; 