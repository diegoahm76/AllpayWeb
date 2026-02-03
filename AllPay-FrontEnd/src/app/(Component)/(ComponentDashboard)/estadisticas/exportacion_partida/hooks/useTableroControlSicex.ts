import { useState, useCallback } from 'react';
import { obtenerTableroControlSicex } from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/adapters/tableroControlSicex.adapter';
import { 
    TableroControlSicexData, 
    TableroControlSicexParams,
    TableroControlSicexResponse 
} from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/models/tableroControlSicex.model';

const useTableroControlSicex = () => {
    const [data, setData] = useState<TableroControlSicexData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Función para validar parámetros antes de hacer la consulta
    const validateParams = (params: TableroControlSicexParams): { isValid: boolean; errorMessage?: string } => {
        if (!params.fecha_inicio || !params.fecha_fin) {
            return { isValid: false, errorMessage: 'Las fechas de inicio y fin son obligatorias' };
        }

        if (!params.tipo_cargue) {
            return { isValid: false, errorMessage: 'El tipo de cargue es obligatorio' };
        }

        // Validar que fecha_inicio no sea mayor que fecha_fin
        const fechaInicio = new Date(params.fecha_inicio);
        const fechaFin = new Date(params.fecha_fin);
        if (fechaInicio > fechaFin) {
            return { isValid: false, errorMessage: 'La fecha de inicio no puede ser mayor que la fecha final' };
        }

        return { isValid: true };
    };

    // Función para limpiar parámetros opcionales vacíos
    const cleanParams = (params: TableroControlSicexParams): TableroControlSicexParams => {
        const cleanedParams: TableroControlSicexParams = {
            fecha_inicio: params.fecha_inicio,
            fecha_fin: params.fecha_fin,
            tipo_cargue: params.tipo_cargue
        };

        // Solo agregar parámetros que tengan valor
        if (params.posicion && params.posicion.trim()) {
            cleanedParams.posicion = params.posicion.trim();
        }
        if (params.aduana_embarque && params.aduana_embarque.trim()) {
            cleanedParams.aduana_embarque = params.aduana_embarque.trim();
        }
        if (params.continente && params.continente.trim()) {
            cleanedParams.continente = params.continente.trim();
        }
        if (params.via && params.via.trim()) {
            cleanedParams.via = params.via.trim();
        }
        if (params.pais && params.pais.trim()) {
            cleanedParams.pais = params.pais.trim();
        }
        if (params.empresa && params.empresa.trim()) {
            cleanedParams.empresa = params.empresa.trim();
        }
        if (params.comparativo_agno && params.comparativo_agno.trim()) {
            cleanedParams.comparativo_agno = params.comparativo_agno.trim();
        }

        return cleanedParams;
    };

    const fetchTableroControl = useCallback(async (
        token: string, 
        params: TableroControlSicexParams
    ): Promise<TableroControlSicexResponse | null> => {
        // Validar parámetros antes de hacer la consulta
        const validation = validateParams(params);
        if (!validation.isValid) {
            setError(validation.errorMessage || 'Parámetros inválidos');
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Limpiar parámetros antes de enviar
            const cleanedParams = cleanParams(params);
            
            
            const response = await obtenerTableroControlSicex(token, cleanedParams);
            setData(response.data);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener los datos del tablero de control';
            setError(errorMessage);
            console.error('[useTableroControlSicex] - Error:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clearData = useCallback(() => {
        setData(null);
        setError(null);
    }, []);

    const refetchData = useCallback(async (token: string, params: TableroControlSicexParams) => {
        try {
            await fetchTableroControl(token, params);
        } catch (error) {
            console.error('[useTableroControlSicex] - Error al recargar datos:', error);
        }
    }, [fetchTableroControl]);

    // Función para obtener un resumen de los filtros activos
    const getActiveFilters = useCallback((params: TableroControlSicexParams) => {
        const activeFilters: Record<string, string> = {};
        
        if (params.posicion) activeFilters.posicion = params.posicion;
        if (params.aduana_embarque) activeFilters.aduana_embarque = params.aduana_embarque;
        if (params.continente) activeFilters.continente = params.continente;
        if (params.via) activeFilters.via = params.via;
        if (params.pais) activeFilters.pais = params.pais;
        if (params.empresa) activeFilters.empresa = params.empresa;
        if (params.comparativo_agno) activeFilters.comparativo_agno = params.comparativo_agno;
        
        return activeFilters;
    }, []);

    return {
        data,
        isLoading,
        error,
        fetchTableroControl,
        clearData,
        refetchData,
        getActiveFilters,
        validateParams,
        cleanParams
    };
};

export default useTableroControlSicex;
