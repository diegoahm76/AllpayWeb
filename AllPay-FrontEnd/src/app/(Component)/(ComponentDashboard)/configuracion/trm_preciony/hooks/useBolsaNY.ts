import { useState } from 'react';
import { obtenerBolsaNY } from '@/app/(Component)/(ComponentDashboard)/configuracion/trm_preciony/adapters/bolsaNY.adapter';
import { actualizarBolsaNY } from '@/app/(Component)/(ComponentDashboard)/configuracion/trm_preciony/adapters/bolsaNYUpdate.adapter';
import { crearBolsaNY } from '@/app/(Component)/(ComponentDashboard)/configuracion/trm_preciony/adapters/bolsaNYCreate.adapter';
import { 
    BolsaNYData, 
    BolsaNYParams,
    BolsaNYResponse,
    BolsaNYUpdatePayload,
    BolsaNYUpdateResponse,
    BolsaNYCreatePayload,
    BolsaNYCreateResponse
} from '@/app/(Component)/(ComponentDashboard)/configuracion/trm_preciony/models/bolsaNY.model';

const useBolsaNY = () => {
    const [data, setData] = useState<BolsaNYData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Estados para actualización
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);

    // Estados para creación
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createSuccess, setCreateSuccess] = useState<boolean>(false);
    const [createdRecord, setCreatedRecord] = useState<any>(null);

    const fetchBolsaNY = async (
        token: string, 
        params: BolsaNYParams
    ): Promise<BolsaNYResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await obtenerBolsaNY(token, params);
            
            // Guardar en la estructura correcta que espera el componente
            setData({ registros: response.data });
            
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener datos de la bolsa de Nueva York';
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

    // Función para actualizar un registro
    const updateBolsaNYRecord = async (
        token: string,
        id: number,
        payload: BolsaNYUpdatePayload
    ): Promise<BolsaNYUpdateResponse | null> => {
        setIsUpdating(true);
        setUpdateError(null);
        setUpdateSuccess(false);

        try {
            
            const response = await actualizarBolsaNY(token, id, payload);
            
            setUpdateSuccess(true);
            
            // Recargar los datos después de la actualización
            if (data) {
                await refetchData(token, { page: 1, page_size: 10 });
            }
            
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el registro de la bolsa de Nueva York';
            console.error('[useBolsaNY] - Error en la actualización:', errorMessage);
            
            setUpdateError(errorMessage);
            setUpdateSuccess(false);
            
            return null;
        } finally {
            setIsUpdating(false);
        }
    };

    // Función para crear un nuevo registro
    const createBolsaNYRecord = async (
        token: string,
        payload: BolsaNYCreatePayload
    ): Promise<BolsaNYCreateResponse | null> => {
        setIsCreating(true);
        setCreateError(null);
        setCreateSuccess(false);
        setCreatedRecord(null);

        try {
            
            const response = await crearBolsaNY(token, payload);
                        
            setCreateSuccess(true);
            setCreatedRecord(response.data);
            
            // Recargar los datos después de la creación
            if (data) {
                await refetchData(token, { page: 1, page_size: 10 });
            }
            
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al crear el registro de la bolsa de Nueva York';
            console.error('[useBolsaNY] - Error en la creación:', errorMessage);
            
            setCreateError(errorMessage);
            setCreateSuccess(false);
            setCreatedRecord(null);
            
            return null;
        } finally {
            setIsCreating(false);
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

    const refetchData = async (token: string, params: BolsaNYParams) => {
        try {
            await fetchBolsaNY(token, params);
        } catch (error) {
            console.error('Error al recargar datos de la bolsa de Nueva York:', error);
        }
    };

    return {
        data,
        isLoading,
        error,
        fetchBolsaNY,
        clearData,
        refetchData,
        
        // Funciones de actualización
        isUpdating,
        updateError,
        updateSuccess,
        updateBolsaNYRecord,
        clearUpdateState,

        // Funciones de creación
        isCreating,
        createError,
        createSuccess,
        createdRecord,
        createBolsaNYRecord,
        clearCreateState
    };
};

export default useBolsaNY;
