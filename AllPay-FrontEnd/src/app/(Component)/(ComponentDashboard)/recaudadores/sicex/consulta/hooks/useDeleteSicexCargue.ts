import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { deleteSicexCargue } from '@/app/(Component)/(ComponentDashboard)/recaudadores/sicex/consulta/adapters/deleteSicexCargue.adapter';

export const useDeleteSicexCargue = () => {
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const deleteSicexCargueByConsecutivo = async (consecutivo: number) => {
        try {
            setLoading(true);
            setError(null);
            setSuccessMessage(null);
            const token = (session as any)?.user?.tokens?.access;

            if (!token) {
                throw new Error('No hay token de autenticación');
            }

            const response = await deleteSicexCargue(token, consecutivo);

            if (response.success) {
                setSuccessMessage(
                    `${response.detail} - Consecutivo: ${response.data.consecutivo_sicex}, Registros eliminados: ${response.data.cantidad_eliminados}`
                );
                return response.data;
            } else {
                throw new Error(response.detail);
            }
        } catch (error) {
            const errorMessage = error instanceof Error 
                ? error.message 
                : 'Error al eliminar el cargue de SICEX';
            setError(errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return {
        deleteSicexCargueByConsecutivo,
        loading,
        error,
        successMessage
    };
};

