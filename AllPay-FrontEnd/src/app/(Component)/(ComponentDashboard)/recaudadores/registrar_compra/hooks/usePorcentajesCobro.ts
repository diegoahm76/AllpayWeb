import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { getPorcentajesCobroPublico } from '../adapter/collector.porcentage';
import { PorcentajeCobro } from '../models/collector.porcentage.model';
import Swal from 'sweetalert2';

export const usePorcentajesCobro = () => {

    const {
        data: session,
    } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const valueSesion: any = session;
    const token = valueSesion?.user?.tokens?.access || '';

    const [porcentajes, setPorcentajes] = useState<PorcentajeCobro[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPorcentajes = async () => {

            if (!token) {
                setError('No se encontró el token de acceso');
                setIsLoading(false);
                return;
            }

            try {
                const response = await getPorcentajesCobroPublico(token);
                setPorcentajes(response.data);
                setError(null);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Error al obtener los porcentajes de cobro';
                setError(errorMessage);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage,
                    confirmButtonColor: '#4D750F'
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchPorcentajes();
    }, [session?.user?.token]);

    return {
        porcentajes,
        isLoading,
        error
    };
}; 