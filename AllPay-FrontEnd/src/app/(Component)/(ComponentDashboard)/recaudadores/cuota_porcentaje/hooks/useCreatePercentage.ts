import { useState } from 'react';
import { createPercentage } from '../adapter/percentage.Create';
import { PercentageCreateResponse, PercentageCreatePayload } from '../models/percentage.create.model';

export const useCreatePercentage = (token: string) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<PercentageCreateResponse | null>(null);

    const create = async (payload: PercentageCreatePayload) => {
        if (!token) {
            setError('No hay token de autenticación');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const formattedPayload = {
                ...payload,
                valor: payload.valor / 100
            }
            
            const response = await createPercentage(token, formattedPayload);
            setData(response);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al crear el porcentaje';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        data,
        create
    };
}; 