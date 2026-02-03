import { useState } from 'react';
import { crearBolsaNY } from '@/app/(Component)/(ComponentDashboard)/configuracion/trm_preciony/adapters/bolsaNYCreate.adapter';
import { 
    BolsaNYCreatePayload,
    BolsaNYCreateResponse
} from '@/app/(Component)/(ComponentDashboard)/configuracion/trm_preciony/models/bolsaNY.model';

const useBolsaNYCreate = () => {
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createSuccess, setCreateSuccess] = useState<boolean>(false);
    const [createdRecord, setCreatedRecord] = useState<any>(null);

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
            
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al crear el registro de la bolsa de Nueva York';
            console.error('[useBolsaNYCreate] - Error en la creación:', errorMessage);
            
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
        createBolsaNYRecord,
        clearCreateState
    };
};

export default useBolsaNYCreate;
