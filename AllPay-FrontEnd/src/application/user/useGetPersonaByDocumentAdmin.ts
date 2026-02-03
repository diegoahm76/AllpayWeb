import { useCallback, useState } from 'react';
import { getPersonaByDocument, PersonaData } from '@/adapters/user/user.getDataAdmin';

export const useGetPersonaByDocument = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [personaData, setPersonaData] = useState<PersonaData | null>(null);

    const fetchPersonaByDocument = useCallback(
        async (token: string, codTipoDocumento: string, numeroDocumento: string) => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await getPersonaByDocument(token, codTipoDocumento, numeroDocumento);
                setPersonaData(response.data);
                return response;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Error desconocido al obtener datos de la persona';
                setError(errorMessage);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    return {
        fetchPersonaByDocument,
        isLoading,
        error,
        personaData
    };
}; 