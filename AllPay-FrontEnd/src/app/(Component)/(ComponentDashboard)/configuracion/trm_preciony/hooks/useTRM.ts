import { useState } from 'react';
import { obtenerTRM } from '@/app/(Component)/(ComponentDashboard)/configuracion/trm_preciony/adapters/trm.adapter';
import { crearTRM } from '@/app/(Component)/(ComponentDashboard)/configuracion/trm_preciony/adapters/trmCreate.adapter';
import { actualizarTRM } from '@/app/(Component)/(ComponentDashboard)/configuracion/trm_preciony/adapters/trmUpdate.adapter';
import { 
    TRMData, 
    TRMParams,
    TRMResponse,
    TRMCreatePayload,
    TRMCreateResponse,
    TRMUpdatePayload,
    TRMUpdateResponse
} from '@/app/(Component)/(ComponentDashboard)/configuracion/trm_preciony/models/trm.model';

const useTRM = () => {
    const [data, setData] = useState<TRMData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Estados para creación
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createSuccess, setCreateSuccess] = useState<boolean>(false);
    const [createdRecord, setCreatedRecord] = useState<any>(null);

    // Estados para actualización
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);

    const fetchTRM = async (
        token: string, 
        params: TRMParams
    ): Promise<TRMResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            
            const response = await obtenerTRM(token, params);
            
        
            // Guardar en la estructura correcta que espera el componente
            setData({ registros: response.data });
            
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener datos de TRM';
            console.error('[useTRM] - Error:', errorMessage);
            
            setError(errorMessage);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    // Función para crear un nuevo registro
    const createTRMRecord = async (
        token: string,
        payload: TRMCreatePayload
    ): Promise<TRMCreateResponse | null> => {
        setIsCreating(true);
        setCreateError(null);
        setCreateSuccess(false);
        setCreatedRecord(null);

        try {
            
            const response = await crearTRM(token, payload);
                        
            setCreateSuccess(true);
            setCreatedRecord(response.data);
            
            // Recargar los datos después de la creación
            if (data) {
                await refetchData(token, { page: 1, page_size: 10 });
            }
            
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al crear el registro de TRM';
            console.error('[useTRM] - Error en la creación:', errorMessage);
            
            setCreateError(errorMessage);
            setCreateSuccess(false);
            setCreatedRecord(null);
            
            return null;
        } finally {
            setIsCreating(false);
        }
    };

    // Función para actualizar un registro
    const updateTRMRecord = async (
        token: string,
        id: number,
        payload: TRMUpdatePayload
    ): Promise<TRMUpdateResponse | null> => {
        setIsUpdating(true);
        setUpdateError(null);
        setUpdateSuccess(false);

        try {
            
            const response = await actualizarTRM(token, id, payload);
            
            setUpdateSuccess(true);
            
            // Recargar los datos después de la actualización
            if (data) {
                await refetchData(token, { page: 1, page_size: 10 });
            }
            
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el registro de TRM';
            console.error('[useTRM] - Error en la actualización:', errorMessage);
            
            setUpdateError(errorMessage);
            setUpdateSuccess(false);
            
            return null;
        } finally {
            setIsUpdating(false);
        }
    };

    const clearCreateState = () => {
        setCreateError(null);
        setCreateSuccess(false);
        setCreatedRecord(null);
    };

    const clearUpdateState = () => {
        setUpdateError(null);
        setUpdateSuccess(false);
    };

    const clearData = () => {
        setData(null);
        setError(null);
    };

    const refetchData = async (token: string, params: TRMParams) => {
        try {
            await fetchTRM(token, params);
        } catch (error) {
            console.error('Error al recargar datos de TRM:', error);
        }
    };

    return {
        data,
        isLoading,
        error,
        fetchTRM,
        clearData,
        refetchData,
        
        // Funciones de creación
        isCreating,
        createError,
        createSuccess,
        createdRecord,
        createTRMRecord,
        clearCreateState,

        // Funciones de actualización
        isUpdating,
        updateError,
        updateSuccess,
        updateTRMRecord,
        clearUpdateState
    };
};

export default useTRM;
