import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { createHistoricoProduccionCacao } from '@/app/(Component)/(ComponentDashboard)/configuracion/historico_produccion_cacao/adapters/createHistoricoProduccionCacao';
import { CreateHistoricoProduccionCacaoPayload } from '@/app/(Component)/(ComponentDashboard)/configuracion/historico_produccion_cacao/models/createHistoricoProduccionCacao.model';
import Swal from 'sweetalert2';

export const useCreateHistoricoProduccionCacao = () => {
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createNewHistoricoProduccionCacao = async (payload: CreateHistoricoProduccionCacaoPayload) => {
        try {
            setLoading(true);
            setError(null);
            const token = (session as any)?.user?.tokens?.access;

            if (!token) {
                throw new Error('No hay token de autenticación');
            }

            const response = await createHistoricoProduccionCacao(token, payload);

            if (response.message) {
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: response.message,
                    confirmButtonColor: 'rgb(var(--green))',
                    confirmButtonText: 'Aceptar'
                });
                return response.data;
            } else {
                throw new Error('Error al crear el registro histórico');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al crear el registro histórico de producción de cacao';
            setError(errorMessage);
            // No mostrar SweetAlert aquí, dejar que el componente maneje el error
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return {
        createNewHistoricoProduccionCacao,
        loading,
        error
    };
};
