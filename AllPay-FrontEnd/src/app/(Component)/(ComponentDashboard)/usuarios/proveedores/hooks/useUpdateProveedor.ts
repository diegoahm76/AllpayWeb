import { useCallback, useState } from 'react';
import { updateProveedor } from '../adapters/proveedor.update';
import {
    UpdateProveedorPayload,
    UpdateProveedorMappedResponse
} from '../models/proveedor.model';

export const useUpdateProveedor = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<UpdateProveedorMappedResponse | null>(null);

    const update = useCallback(async (
        token: string,
        idPersona: number | string,
        payload: UpdateProveedorPayload
    ): Promise<UpdateProveedorMappedResponse> => {
        setLoading(true);
        setError(null);
        try {
            const response = await updateProveedor(token, idPersona, payload);
            setResult(response);
            return response;
        } catch (err: any) {
            const message = err?.message || 'Error al actualizar proveedor';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        update,
        loading,
        error,
        result
    };
};


