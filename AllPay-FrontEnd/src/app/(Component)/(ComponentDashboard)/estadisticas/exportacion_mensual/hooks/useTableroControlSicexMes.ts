import { useState, useCallback } from 'react';
import { obtenerTableroControlSicexMes } from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_mensual/adapters/tableroControlSicexMes.adapter';
import { 
    TableroControlSicexMesData, 
    TableroControlSicexMesParams,
    TableroControlSicexMesResponse 
} from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_mensual/models/tableroControlSicexMes.model';

const useTableroControlSicexMes = () => {
    const [data, setData] = useState<TableroControlSicexMesData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTableroControl = async (
        token: string, 
        params: TableroControlSicexMesParams
    ): Promise<TableroControlSicexMesResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await obtenerTableroControlSicexMes(token, params);
            setData(response.data);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener los datos del tablero de control mensual';
            setError(errorMessage);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const clearData = useCallback(() => {
        setData(null);
        setError(null);
    }, []);

    const refetchData = useCallback(async (token: string, params: TableroControlSicexMesParams) => {
        try {
            await fetchTableroControl(token, params);
        } catch (error) {
            console.error('Error al recargar datos del tablero de control mensual:', error);
        }
    }, [fetchTableroControl]);

    // Función para validar parámetros antes de hacer la consulta
    const validateParams = useCallback((params: TableroControlSicexMesParams) => {
        const errors: string[] = [];

        // Validar fechas obligatorias
        if (!params.fecha_inicio) {
            errors.push('La fecha de inicio es obligatoria');
        }
        if (!params.fecha_fin) {
            errors.push('La fecha final es obligatoria');
        }

        // Validar tipo de cargue
        if (!params.tipo_cargue) {
            errors.push('El tipo de cargue es obligatorio');
        }

        // Validar que fecha_inicio <= fecha_fin
        if (params.fecha_inicio && params.fecha_fin) {
            const fechaInicio = new Date(params.fecha_inicio);
            const fechaFin = new Date(params.fecha_fin);
            if (fechaInicio > fechaFin) {
                errors.push('La fecha de inicio no puede ser mayor a la fecha final');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }, []);

    // Función para limpiar parámetros opcionales vacíos
    const cleanParams = useCallback((params: TableroControlSicexMesParams) => {
        const cleaned: any = { ...params };
        
        // Remover parámetros opcionales vacíos
        if (!cleaned.posicion) delete cleaned.posicion;
        if (!cleaned.aduana_embarque) delete cleaned.aduana_embarque;
        if (!cleaned.continente) delete cleaned.continente;
        if (!cleaned.via) delete cleaned.via;
        if (!cleaned.pais) delete cleaned.pais;
        if (!cleaned.empresa) delete cleaned.empresa;
        if (!cleaned.comparativo_agno) delete cleaned.comparativo_agno;

        return cleaned;
    }, []);

    // Función para obtener información de los filtros activos
    const getActiveFilters = useCallback((params: TableroControlSicexMesParams) => {
        const activeFilters: Record<string, string> = {};
        
        if (params.posicion) activeFilters['Posición'] = params.posicion;
        if (params.aduana_embarque) activeFilters['Aduana'] = params.aduana_embarque;
        if (params.continente) activeFilters['Continente'] = params.continente;
        if (params.via) activeFilters['Vía'] = params.via;
        if (params.pais) activeFilters['País'] = params.pais;
        if (params.empresa) activeFilters['Empresa'] = params.empresa;
        if (params.comparativo_agno) activeFilters['Comparativa'] = 'Año anterior activado';

        return activeFilters;
    }, []);

    return {
        data,
        isLoading,
        error,
        fetchTableroControl,
        clearData,
        refetchData,
        validateParams,
        cleanParams,
        getActiveFilters
    };
};

export default useTableroControlSicexMes; 