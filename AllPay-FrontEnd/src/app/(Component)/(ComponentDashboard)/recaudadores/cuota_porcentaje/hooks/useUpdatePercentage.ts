import { useState } from 'react';
import { updatePercentage } from '../adapter/percentage.edit';
import { UpdatePercentagePayload } from '../models/percentage.model';
import Swal from 'sweetalert2';

export const useUpdatePercentage = (token: string) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const update = async (id: number, payload: UpdatePercentagePayload) => {
        setLoading(true);
        setError(null);

        try {
            const formattedPayload = {
                ...payload,
                valor: (parseFloat(payload.valor) / 100).toString()
            }
                
            const response = await updatePercentage(id, formattedPayload, token);
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: response.detail,
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar'
            });
            return response;
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Error al actualizar el porcentaje');
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Error al actualizar el porcentaje',
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar'
            });
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return { update, loading, error };
}; 