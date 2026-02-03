import { useState, useCallback } from 'react';
import { updateDate } from '../adapters/date.update';
import { UpdateDatePayload } from '../models/updateDate.model';
import Swal from 'sweetalert2';

export const useUpdateDate = (token: string) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const update = useCallback(async (id: string, payload: UpdateDatePayload) => {
        try {
            setLoading(true);
            setError(null);
            const response = await updateDate(id, payload, token);

            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: response.detail,
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar'
            });

            return response;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al actualizar la fecha de cierre';
            setError(errorMessage);

            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage,
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar'
            });

            throw error;
        } finally {
            setLoading(false);
        }
    }, [token]);

    return { update, loading, error };
}; 