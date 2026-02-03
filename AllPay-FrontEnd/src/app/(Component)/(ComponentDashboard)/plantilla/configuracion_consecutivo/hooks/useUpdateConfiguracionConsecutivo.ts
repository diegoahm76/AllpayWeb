import { useState } from 'react';
import { updateConfiguracionConsecutivo } from '@/app/(Component)/(ComponentDashboard)/plantilla/configuracion_consecutivo/adapters/configuracion_consecutivo.update';
import { 
    ConfiguracionConsecutivoUpdatePayload,
    ConfiguracionConsecutivoResponse 
} from '@/app/(Component)/(ComponentDashboard)/plantilla/configuracion_consecutivo/models/configuracion_consecutivo.model';

interface UseUpdateConfiguracionConsecutivoReturn {
    isLoading: boolean;
    error: string | null;
    updateConfiguracion: (params: {
        id: number;
        payload: ConfiguracionConsecutivoUpdatePayload;
        token: string;
    }) => Promise<ConfiguracionConsecutivoResponse | null>;
    clearError: () => void;
}

export const useUpdateConfiguracionConsecutivo = (): UseUpdateConfiguracionConsecutivoReturn => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateConfiguracion = async (params: {
        id: number;
        payload: ConfiguracionConsecutivoUpdatePayload;
        token: string;
    }): Promise<ConfiguracionConsecutivoResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await updateConfiguracionConsecutivo(params);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido al actualizar la configuración';
            setError(errorMessage);
            console.error('Error en useUpdateConfiguracionConsecutivo:', err);
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
        updateConfiguracion,
        clearError
    };
};
