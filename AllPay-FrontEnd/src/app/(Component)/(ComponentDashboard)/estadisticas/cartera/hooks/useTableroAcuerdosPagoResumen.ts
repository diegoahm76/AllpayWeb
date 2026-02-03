import { useState } from 'react';
import { obtenerTableroAcuerdosPagoResumen } from '@/app/(Component)/(ComponentDashboard)/estadisticas/cartera/adapters/tableroAcuerdosPagoResumen.adapter';
import { 
    TableroAcuerdosPagoResumenData, 
    TableroAcuerdosPagoResumenParams,
    TableroAcuerdosPagoResumenResponse 
} from '@/app/(Component)/(ComponentDashboard)/estadisticas/cartera/models/tableroAcuerdosPagoResumen.model';

const useTableroAcuerdosPagoResumen = () => {
    const [data, setData] = useState<TableroAcuerdosPagoResumenData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTableroAcuerdosResumen = async (
        token: string, 
        params: TableroAcuerdosPagoResumenParams
    ): Promise<TableroAcuerdosPagoResumenResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await obtenerTableroAcuerdosPagoResumen(token, params);
            setData(response.data);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener el resumen del tablero de acuerdos de pago';
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

    const refetchData = async (token: string, params: TableroAcuerdosPagoResumenParams) => {
        try {
            await fetchTableroAcuerdosResumen(token, params);
        } catch (error) {
            console.error('Error al recargar datos del resumen del tablero de acuerdos de pago:', error);
        }
    };

    return {
        data,
        isLoading,
        error,
        fetchTableroAcuerdosResumen,
        clearData,
        refetchData
    };
};

export default useTableroAcuerdosPagoResumen;
