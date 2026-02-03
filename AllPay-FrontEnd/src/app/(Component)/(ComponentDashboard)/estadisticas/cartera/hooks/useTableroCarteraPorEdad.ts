import { useState } from 'react';
import { obtenerTableroCarteraPorEdad } from '@/app/(Component)/(ComponentDashboard)/estadisticas/cartera/adapters/tableroCarteraPorEdad.adapter';
import { 
    TableroCarteraPorEdadData, 
    TableroCarteraPorEdadParams,
    TableroCarteraPorEdadResponse 
} from '@/app/(Component)/(ComponentDashboard)/estadisticas/cartera/models/tableroCarteraPorEdad.model';

const useTableroCarteraPorEdad = () => {
    const [data, setData] = useState<TableroCarteraPorEdadData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTableroCarteraPorEdad = async (
        token: string, 
        params: TableroCarteraPorEdadParams
    ): Promise<TableroCarteraPorEdadResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await obtenerTableroCarteraPorEdad(token, params);
            setData(response.data);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener el tablero de cartera por edad';
            setError(errorMessage);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const clearData = () => {
        setData(null);
        setError(null);
    };

    const refetchData = async (token: string, params: TableroCarteraPorEdadParams) => {
        try {
            await fetchTableroCarteraPorEdad(token, params);
        } catch (error) {
            console.error('Error al recargar datos del tablero de cartera por edad:', error);
        }
    };

    return {
        data,
        isLoading,
        error,
        fetchTableroCarteraPorEdad,
        clearData,
        refetchData
    };
};

export default useTableroCarteraPorEdad;
