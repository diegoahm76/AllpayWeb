import { useState } from 'react';
import { updateTemplate } from '../adapter/updateTemplate';
import { UpdateTemplatePayload, UpdateTemplateResponse } from '../models/updateTemplate.model';
import Swal from 'sweetalert2';

export const useUpdateTemplate = (token: string) => {
    const [isUpdating, setIsUpdating] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpdateTemplate = async (
        id: number,
        data: UpdateTemplatePayload
    ): Promise<UpdateTemplateResponse | null> => {
        if (!token) {
            setError('Token no disponible');
            return null;
        }

        setIsUpdating(true);
        setError(null);

        try {
            const response = await updateTemplate(token, id, data);

            await Swal.fire({
                title: '¡Éxito!',
                text: response.detail || 'Plantilla actualizada correctamente',
                icon: 'success',
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar',
            });

            return response;
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || err.message || 'Error al actualizar la plantilla';
            setError(errorMessage);

            await Swal.fire({
                title: 'Error',
                text: errorMessage,
                icon: 'error',
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar',
            });

            return null;
        } finally {
            setIsUpdating(false);
        }
    };

    return {
        handleUpdateTemplate,
        isUpdating,
        error,
    };
};

