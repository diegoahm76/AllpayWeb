import { useState, useEffect } from 'react';
import { getMunicipiosColombia } from '@/adapters/address/address.getCities.Logged';
import { MunicipioColombia } from '@/domain/models/municipioColombia/types';

export const useMunicipiosColombia = (departamentoId: string) => {
    const [municipios, setMunicipios] = useState<MunicipioColombia[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMunicipios = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getMunicipiosColombia(departamentoId);
            setMunicipios(response.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar los municipios');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (departamentoId) {
            fetchMunicipios();
        }
    }, [departamentoId]);

    return {
        municipios,
        loading,
        error,
        refetch: fetchMunicipios
    };
}; 