import { useState } from 'react';
import { actualizarBolsaNY } from '@/app/(Component)/(ComponentDashboard)/configuracion/trm_preciony/adapters/bolsaNYUpdate.adapter';
import { 
    BolsaNYUpdatePayload, 
    BolsaNYUpdateResponse 
} from '@/app/(Component)/(ComponentDashboard)/configuracion/trm_preciony/models/bolsaNY.model';

const useBolsaNYUpdate = () => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);
    const [lastUpdatedRecord, setLastUpdatedRecord] = useState<any>(null);

    const updateBolsaNYRecord = async (
        token: string,
        id: number,
        payload: BolsaNYUpdatePayload
    ): Promise<BolsaNYUpdateResponse | null> => {
        setIsUpdating(true);
        setUpdateError(null);
        setUpdateSuccess(false);
        setLastUpdatedRecord(null);

        try {
            
            const response = await actualizarBolsaNY(token, id, payload);
                        
            setUpdateSuccess(true);
            setLastUpdatedRecord(response.data || { id, ...payload });
            
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el registro de la bolsa de Nueva York';
            console.error('[useBolsaNYUpdate] - Error en la actualización:', errorMessage);
            
            setUpdateError(errorMessage);
            setUpdateSuccess(false);
            
            return null;
        } finally {
            setIsUpdating(false);
        }
    };

    const clearUpdateState = () => {
        setUpdateError(null);
        setUpdateSuccess(false);
        setLastUpdatedRecord(null);
    };

    const resetUpdateSuccess = () => {
        setUpdateSuccess(false);
    };

    return {
        // Estados
        isUpdating,
        updateError,
        updateSuccess,
        lastUpdatedRecord,
        
        // Funciones
        updateBolsaNYRecord,
        clearUpdateState,
        resetUpdateSuccess
    };
};

export default useBolsaNYUpdate;
