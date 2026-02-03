import { useState, useEffect } from 'react';
import { getTiposDocumento } from '../adapters/tipoDocumento.adapter';
import { TipoDocumentoData } from '../models/tipoDocumento.model';

export const useTiposDocumento = (token: string) => {
    const [tiposDocumento, setTiposDocumento] = useState<TipoDocumentoData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTiposDocumento = async () => {
            try {
                setIsLoading(true);
                setError(null);
                
                if (!token) {
                    throw new Error('No hay token disponible');
                }

                const response = await getTiposDocumento(token);
                setTiposDocumento(response.data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error al cargar los tipos de documento');
                console.error('Error en useTiposDocumento:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTiposDocumento();
    }, [token]);

    // Transformar los datos para el formato requerido por AnimatedSelect
    const tiposDocumentoParaSelect = tiposDocumento.map(tipo => ({
        key: tipo.cod_tipo_documento,
        value: tipo.cod_tipo_documento,
        title: tipo.nombre
    }));

    return {
        tiposDocumento,
        tiposDocumentoParaSelect,
        isLoading,
        error
    };
}; 