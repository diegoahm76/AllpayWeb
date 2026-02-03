import { useState } from 'react';
import { obtenerTableroDeudoresPorRecaudador } from '@/app/(Component)/(ComponentDashboard)/estadisticas/cartera/adapters/tableroDeudoresPorRecaudador.adapter';
import { 
    TableroDeudoresPorRecaudadorData, 
    TableroDeudoresPorRecaudadorParams,
    TableroDeudoresPorRecaudadorResponse 
} from '@/app/(Component)/(ComponentDashboard)/estadisticas/cartera/models/tableroDeudoresPorRecaudador.model';

const useTableroDeudoresPorRecaudador = () => {
    const [data, setData] = useState<TableroDeudoresPorRecaudadorData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTableroDeudoresPorRecaudador = async (
        token: string, 
        params: TableroDeudoresPorRecaudadorParams
    ): Promise<TableroDeudoresPorRecaudadorResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await obtenerTableroDeudoresPorRecaudador(token, params);
            setData(response.data);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener el tablero de deudores por recaudador';
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

    const refetchData = async (token: string, params: TableroDeudoresPorRecaudadorParams) => {
        try {
            await fetchTableroDeudoresPorRecaudador(token, params);
        } catch (error) {
            console.error('Error al recargar datos del tablero de deudores por recaudador:', error);
        }
    };

    return {
        data,
        isLoading,
        error,
        fetchTableroDeudoresPorRecaudador,
        clearData,
        refetchData
    };
};

export default useTableroDeudoresPorRecaudador;
