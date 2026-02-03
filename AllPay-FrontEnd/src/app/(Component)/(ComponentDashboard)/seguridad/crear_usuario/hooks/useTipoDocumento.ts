import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { TipoDocumentoAdapter } from '@/app/(Component)/(ComponentDashboard)/seguridad/crear_usuario/adapters/TipoDocumentoAdapter';
import { TipoDocumento } from '@/app/(Component)/(ComponentDashboard)/seguridad/crear_usuario/models/TipoDocumentoModel';

export const useTipoDocumento = () => {
    const { data: session } = useSession();
    const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTiposDocumento = async () => {
            try {
                const adapter = new TipoDocumentoAdapter();
                const response = await adapter.getTiposDocumento();
                setTiposDocumento(response.data);
                setError(null);
            } catch (err) {
                setError('Error al cargar los tipos de documento');
            } finally {
                setLoading(false);
            }
        };

        fetchTiposDocumento();
        
    }, [session]);

    return { tiposDocumento, loading, error };
}; 