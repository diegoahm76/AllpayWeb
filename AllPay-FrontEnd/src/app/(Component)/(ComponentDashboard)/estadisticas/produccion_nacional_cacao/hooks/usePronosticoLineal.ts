import { useState } from 'react';
import { fetchPronosticoLineal } from '../adapters/pronostico-lineal.adapter';
import { 
    PronosticoLinealResponse, 
    ParamsPronosticoLineal 
} from '../models/pronostico-lineal.models';

export const usePronosticoLineal = () => {
    const [data, setData] = useState<PronosticoLinealResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async (token: string, params: ParamsPronosticoLineal) => {
        if (!token) {
            setError('Token de autenticación requerido');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetchPronosticoLineal(token, params);
            setData(response);
        } catch (err: any) {
            setError(err.message || 'Error al obtener el pronóstico lineal');
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
