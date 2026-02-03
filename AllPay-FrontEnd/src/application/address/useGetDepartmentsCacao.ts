import { useState, useCallback } from 'react';
import { Departamento } from '@/domain/models/departamento/types';
import { getDepartamentosCacaotero } from '@/adapters/address/address.getDeparmentsCacao';

const useGetDepartmentsCacaotero = () => {
    const [departments, setDepartments] = useState<Departamento[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDepartments = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await getDepartamentosCacaotero();
            
            if (response.success) {
                setDepartments(response.data);
            } else {
                setError(response.detail || 'Error al obtener los departamentos');
            }
        } catch (err: any) {
            console.error('Error en useGetDepartments:', err);
            setError(err.message || 'Error al obtener los departamentos');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        departments,
        isLoading,
        error,
        fetchDepartments
    };
};

export default useGetDepartmentsCacaotero; 