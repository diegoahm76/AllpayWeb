import { useState, useEffect } from 'react';
import { getDepartamentosColombia } from '@/adapters/address/address.getDeparments.Logged';
import { DepartamentoColombia } from '@/domain/models/address/department.model';

export const useDepartamentosColombia = () => {
    const [departamentos, setDepartamentos] = useState<DepartamentoColombia[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDepartamentos = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getDepartamentosColombia();
            // Ordenar departamentos alfabéticamente por nombre
            const departamentosOrdenados = response.data.sort((a, b) => 
                a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
            );
            setDepartamentos(departamentosOrdenados);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar los departamentos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartamentos();
    }, []);

    return {
        departamentos,
        loading,
        error,
        refetch: fetchDepartamentos
    };
}; 