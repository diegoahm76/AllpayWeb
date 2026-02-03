import { useState, useCallback, useEffect } from 'react';
import { PlantillasResponse } from '@/domain/models/plantilla/plantillaDocumento';
import { getPlantillaByName } from '@/adapters/documento/getPlantillaByName';

interface UsePlantillasDocumentoProps {
    token: string;
    nombre?: string;
}

interface UsePlantillasDocumentoReturn {
    plantillas: PlantillasResponse | null;
    loading: boolean;
    error: string | null;
    fetchPlantillas: (nombre?: string) => Promise<void>;
}

export const usePlantillasDocumento = ({ token, nombre }: UsePlantillasDocumentoProps): UsePlantillasDocumentoReturn => {
    const [plantillas, setPlantillas] = useState<PlantillasResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPlantillas = useCallback(async (nombreToFetch?: string) => {
        setLoading(true);
        setError(null);

        try {
            const response = await getPlantillaByName({
                token,
                nombre: nombreToFetch || nombre
            });

            if (response.success) {
                setPlantillas(response);
            } else {
                setError('Error al obtener las plantillas');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido al obtener las plantillas');
        } finally {
            setLoading(false);
        }
    }, [token, nombre]);

    useEffect(() => {
        if (token && nombre) {
            fetchPlantillas();
        }
    }, [token, nombre, fetchPlantillas]);

    return {
        plantillas,
        loading,
        error,
        fetchPlantillas
    };
}; 