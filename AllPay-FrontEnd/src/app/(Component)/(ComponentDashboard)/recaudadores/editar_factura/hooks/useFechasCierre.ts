import { useState, useEffect } from 'react';
import { FechaCierre } from '../models/fechas.cierre.model';
import { getFechasCierre } from '../adapters/fechas.cierre.adapter';

export const useFechasCierre = (token: string) => {
    const [fechasCierre, setFechasCierre] = useState<FechaCierre[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchFechasCierre = async () => {
            if (!token) {
                setError('No hay token de autenticación');
                setLoading(false);
                return;
            }

            try {
                const response = await getFechasCierre(token);
                setFechasCierre(response.data);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error al obtener las fechas de cierre');
                console.error('Error en useFechasCierre:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchFechasCierre();
    }, [token]);

    return {
        fechasCierre,
        loading,
        error
    };
}; 