import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { createTypeCacao } from '@/app/(Component)/(ComponentDashboard)/recaudadores/tipos_cacao/adapters/createTypeCacao';
import { CreateTypeCacaoPayload } from '@/app/(Component)/(ComponentDashboard)/recaudadores/tipos_cacao/models/createTypeCacao.model';
import Swal from 'sweetalert2';

export const useCreateTypeCacao = () => {
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createNewTypeCacao = async (payload: CreateTypeCacaoPayload) => {
        try {
            setLoading(true);
            setError(null);
            const token = (session as any)?.user?.tokens?.access;

            if (!token) {
                throw new Error('No hay token de autenticación');
            }

            const response = await createTypeCacao(token, payload);

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
            const errorMessage = error instanceof Error ? error.message : 'Error al crear el tipo de cacao';
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
        createNewTypeCacao,
        loading,
        error
    };
}; 