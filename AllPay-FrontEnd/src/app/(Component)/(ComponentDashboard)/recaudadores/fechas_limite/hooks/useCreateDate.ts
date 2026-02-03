import { useState } from 'react';
import { createDate } from '../adapters/date.getAll';
import { CreateDatePayload } from '../models/date.model';
import Swal from 'sweetalert2';

export const useCreateDate = (token: string) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const create = async (payload: CreateDatePayload) => {
        setLoading(true);
        setError(null);
        try {
            const response = await createDate(payload, token);
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: response.detail,
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar'
            });
            return response;
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Error al crear la fecha de cierre');
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Error al crear la fecha de cierre',
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar'
            });
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return { create, loading, error };
}; 