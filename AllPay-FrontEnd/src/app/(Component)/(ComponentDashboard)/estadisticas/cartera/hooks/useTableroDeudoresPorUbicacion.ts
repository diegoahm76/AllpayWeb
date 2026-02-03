import { useState } from 'react';
import { obtenerTableroDeudoresPorUbicacion } from '@/app/(Component)/(ComponentDashboard)/estadisticas/cartera/adapters/tableroDeudoresPorUbicacion.adapter';
import { 
    TableroDeudoresPorUbicacionData, 
    TableroDeudoresPorUbicacionParams,
    TableroDeudoresPorUbicacionResponse 
} from '@/app/(Component)/(ComponentDashboard)/estadisticas/cartera/models/tableroDeudoresPorUbicacion.model';

const useTableroDeudoresPorUbicacion = () => {
    const [data, setData] = useState<TableroDeudoresPorUbicacionData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTableroDeudoresPorUbicacion = async (
        token: string, 
        params: TableroDeudoresPorUbicacionParams
    ): Promise<TableroDeudoresPorUbicacionResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await obtenerTableroDeudoresPorUbicacion(token, params);
            
            // Guardar en la estructura correcta que espera el componente
            setData({ deudoresPorUbicacion: response.data });
            
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener el tablero de deudores por ubicación';
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

    const refetchData = async (token: string, params: TableroDeudoresPorUbicacionParams) => {
        try {
            await fetchTableroDeudoresPorUbicacion(token, params);
        } catch (error) {
            console.error('Error al recargar datos del tablero de deudores por ubicación:', error);
        }
    };

    return {
        data,
        isLoading,
        error,
        fetchTableroDeudoresPorUbicacion,
        clearData,
        refetchData
    };
};

export default useTableroDeudoresPorUbicacion;
