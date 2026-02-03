import { useState } from 'react';
import { fetchProduccionHistorica } from '../adapters/produccion-historica.adapter';
import { 
    ProduccionHistoricaResponse, 
    ParamsProduccionHistorica 
} from '../models/produccion-historica.models';

export const useProduccionHistorica = () => {
    const [data, setData] = useState<ProduccionHistoricaResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async (token: string, params: ParamsProduccionHistorica) => {
        if (!token) {
            setError('Token de autenticación requerido');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetchProduccionHistorica(token, params);
            setData(response);
        } catch (err: any) {
            setError(err.message || 'Error al obtener la producción histórica');
        } finally {
            setLoading(false);
        }
    };

    const resetData = () => {
        setData(null);
        setError(null);
        setLoading(false);
    };

    return {
        data,
        loading,
        error,
        fetchData,
        resetData
    };
};
