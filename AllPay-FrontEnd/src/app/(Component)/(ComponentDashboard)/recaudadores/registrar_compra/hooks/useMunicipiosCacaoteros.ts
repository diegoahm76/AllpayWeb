import { useState, useEffect } from 'react';
import { getMunicipiosCacaoteros } from '../adapter/municipio.cacaotero.adapter';
import { MunicipioCacaotero } from '../models/municipio.cacaotero.model';

interface UseMunicipiosCacaoterosProps {
    departamentoId: string;
    token: string;
}

export const useMunicipiosCacaoteros = ({ departamentoId, token }: UseMunicipiosCacaoterosProps) => {
    const [municipios, setMunicipios] = useState<MunicipioCacaotero[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchMunicipios = async () => {
        if (!departamentoId || !token) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const response = await getMunicipiosCacaoteros(departamentoId, token);
            if (!response.success) {
                setMunicipios([]);
                setError(response.detail);
            } else {
                setMunicipios(response.data);
                setError(null);
            }
        } catch (err) {
            setMunicipios([]);
            setError(err instanceof Error ? err.message : 'Error al cargar los municipios cacaoteros');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMunicipios();
    }, [departamentoId, token]);

    return {
        municipios,
        loading,
        error,
        refetch: fetchMunicipios
    };
}; 