import { useState, useCallback } from 'react';
import { Municipio } from '../models/municipio.types';
import { getMunicipios, MunicipioParams } from '../adapters/municipio.get';

interface PaginationInfo {
    count: number;
    totalPages: number;
    currentPage: number;
    next: string | null;
    previous: string | null;
}

const useGetMunicipios = () => {
    const [municipios, setMunicipios] = useState<Municipio[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({
        count: 0,
        totalPages: 0,
        currentPage: 1,
        next: null,
        previous: null
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchMunicipios = useCallback(async (token: string, params?: MunicipioParams) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await getMunicipios(token, params);
            
            if (response.success) {
                setMunicipios(response.data);
                setPagination({
                    count: response.count,
                    totalPages: response.total_pages,
                    currentPage: response.current_page,
                    next: response.next,
                    previous: response.previous
                });
            } else {
                setError(response.detail || 'Error al obtener los municipios');
            }
        } catch (err: any) {
            console.error('Error en useGetMunicipios:', err);
            setError(err.message || 'Error al obtener los municipios');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        municipios,
        pagination,
        isLoading,
        error,
        fetchMunicipios
    };
};

export default useGetMunicipios;
