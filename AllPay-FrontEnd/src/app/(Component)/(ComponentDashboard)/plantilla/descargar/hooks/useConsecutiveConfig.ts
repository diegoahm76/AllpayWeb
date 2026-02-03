import { useState, useCallback } from 'react';
import { getConsecutiveConfig } from '@/app/(Component)/(ComponentDashboard)/plantilla/descargar/adapter/consecutive.config';
import { ConsecutiveConfig } from '@/app/(Component)/(ComponentDashboard)/plantilla/descargar/models/consecutive.config.model';

export const useConsecutiveConfig = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [config, setConfig] = useState<ConsecutiveConfig[]>([]);

    const fetchConsecutiveConfig = useCallback(async (token: string) => {
        try {
            setLoading(true);
            setError(null);
            const response = await getConsecutiveConfig(token);
            setConfig(response.data);
            return response;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            setError(errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        config,
        fetchConsecutiveConfig
    };
}; 