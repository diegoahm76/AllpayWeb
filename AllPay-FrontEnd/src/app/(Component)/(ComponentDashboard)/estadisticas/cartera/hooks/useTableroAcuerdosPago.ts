import { useState } from 'react';
import { obtenerTableroAcuerdosPago } from '@/app/(Component)/(ComponentDashboard)/estadisticas/cartera/adapters/tableroAcuerdosPago.adapter';
import { 
    TableroAcuerdosPagoData, 
    TableroAcuerdosPagoParams,
    TableroAcuerdosPagoResponse 
} from '@/app/(Component)/(ComponentDashboard)/estadisticas/cartera/models/tableroAcuerdosPago.model';

interface TableroDataWithPagination extends TableroAcuerdosPagoData {
    count: number;
    total_pages: number;
    current_page: number;
    next?: string;
    previous?: string;
}

const useTableroAcuerdosPago = () => {
    const [data, setData] = useState<TableroDataWithPagination | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTableroAcuerdos = async (
        token: string, 
        params: TableroAcuerdosPagoParams
    ): Promise<TableroAcuerdosPagoResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await obtenerTableroAcuerdosPago(token, params);
            
            // Extraer los datos de la estructura anidada y agregar información de paginación
            const tableroData: TableroDataWithPagination = {
                ...response.data.data,
                count: response.count,
                total_pages: response.total_pages,
                current_page: response.current_page,
                next: response.next,
                previous: response.previous
            };
            
            setData(tableroData);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener los datos del tablero de acuerdos de pago';
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

    const refetchData = async (token: string, params: TableroAcuerdosPagoParams) => {
        try {
            await fetchTableroAcuerdos(token, params);
        } catch (error) {
            console.error('Error al recargar datos del tablero de acuerdos de pago:', error);
        }
    };

    return {
        data,
        isLoading,
        error,
        fetchTableroAcuerdos,
        clearData,
        refetchData
    };
};

export default useTableroAcuerdosPago;
