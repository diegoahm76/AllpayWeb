import { useState, useCallback } from 'react';
import { SiezaItem } from '../models/sieza.types';
import { getSiezaData } from '../adapters/sieza.get';

const useSiezaData = () => {
    const [siezaData, setSiezaData] = useState<SiezaItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);

    const fetchSiezaData = useCallback(async (token: string) => {
        if (hasLoaded) return; // Evitar cargar múltiples veces
        
        // Validar que el token existe
        if (!token) {
            setError('Token de autenticación no disponible');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await getSiezaData(token);
            
            if (response.success && response.data.success) {
                setSiezaData(response.data.data);
                setHasLoaded(true);
            } else {
                setError(response.data.detail || 'Error al obtener los datos del sistema contable');
            }
        } catch (err: any) {
            console.error('Error en useSiezaData:', err);
            setError(err.message || 'Error al obtener los datos del sistema contable');
        } finally {
            setIsLoading(false);
        }
    }, [hasLoaded]);

    const clearData = useCallback(() => {
        setSiezaData([]);
        setError(null);
        setHasLoaded(false);
    }, []);

    return {
        siezaData,
        isLoading,
        error,
        hasLoaded,
        fetchSiezaData,
        clearData
    };
};

export default useSiezaData;
