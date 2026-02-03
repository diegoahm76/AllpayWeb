import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { updateTypeCacao } from '@/app/(Component)/(ComponentDashboard)/recaudadores/tipos_cacao/adapters/updateTypeCacao';
import { UpdateTypeCacaoPayload } from '@/app/(Component)/(ComponentDashboard)/recaudadores/tipos_cacao/models/updateTypeCacao.model';
import Swal from 'sweetalert2';

export const useUpdateTypeCacao = () => {
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateTypeCacaoById = async (id: number, payload: UpdateTypeCacaoPayload) => {
        try {
            setLoading(true);
            setError(null);
            const token = (session as any)?.user?.tokens?.access;

            if (!token) {
                throw new Error('No hay token de autenticación');
            }

            const response = await updateTypeCacao(token, id, payload);

            if (response.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: response.detail,
                    confirmButtonColor: 'rgb(var(--green))',
                    confirmButtonText: 'Aceptar'
                });
                return response.data;
            } else {
                throw new Error(response.detail);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al actualizar el tipo de cacao';
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
    };

    return {
        updateTypeCacaoById,
        loading,
        error
    };
}; 