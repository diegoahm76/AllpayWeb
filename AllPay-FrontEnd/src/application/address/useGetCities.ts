import { useState, useEffect } from 'react';
import { getMunicipios } from '@/adapters/address/address.getCities';
import { Municipio } from '@/domain/models/municipio/types' ;    

interface UseGetCitiesProps {
    departamentoId: number;
    token: string;
}

export const useGetCities = ({ departamentoId, token }: UseGetCitiesProps) => {
    const [cities, setCities] = useState<Municipio[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCities = async () => {
            if (!departamentoId || !token) return;
            
            setLoading(true);
            setError(null);
            
            try {
                const response = await getMunicipios(departamentoId, token);
                setCities(response.data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error al cargar las ciudades');
            } finally {
                setLoading(false);
            }
        };

        fetchCities();
    }, [departamentoId, token]);

    return { cities, loading, error };
};
