import { useState } from 'react';
import { crearTRM } from '@/app/(Component)/(ComponentDashboard)/configuracion/trm_preciony/adapters/trmCreate.adapter';
import { 
    TRMCreatePayload,
    TRMCreateResponse
} from '@/app/(Component)/(ComponentDashboard)/configuracion/trm_preciony/models/trm.model';

const useTRMCreate = () => {
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createSuccess, setCreateSuccess] = useState<boolean>(false);
    const [createdRecord, setCreatedRecord] = useState<any>(null);

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
            
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al crear el registro de TRM';
            console.error('[useTRMCreate] - Error en la creación:', errorMessage);
            
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

    return {
        // Estados
        isCreating,
        createError,
        createSuccess,
        createdRecord,
        
        // Funciones
        createTRMRecord,
        clearCreateState
    };
};

export default useTRMCreate;
