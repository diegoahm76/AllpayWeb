import { useState } from 'react';
import { actualizarProduccionCacao } from '../adapters/produccion-cacao-update.adapter';
import {
    ProduccionCacaoUpdatePayload,
    ProduccionCacaoUpdateResponse
} from '../models/produccion-cacao-update.models';

export const useProduccionCacaoUpdate = () => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);
    const [lastUpdatedRecord, setLastUpdatedRecord] = useState<any>(null);

    const updateProduccionCacao = async (
        token: string,
        id: number,
        payload: ProduccionCacaoUpdatePayload
    ): Promise<ProduccionCacaoUpdateResponse | null> => {
        setIsUpdating(true);
        setUpdateError(null);
        setUpdateSuccess(false);
        setLastUpdatedRecord(null);

        try {
            console.log('[useProduccionCacaoUpdate] - Actualizando registro con payload:', payload);
            
            const response = await actualizarProduccionCacao(token, id, payload);
            
            console.log('[useProduccionCacaoUpdate] - Registro actualizado exitosamente:', response);
            
            setUpdateSuccess(true);
            setLastUpdatedRecord(response.data || { id, ...payload });
            
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el registro de producción de cacao';
            console.error('[useProduccionCacaoUpdate] - Error en la actualización:', errorMessage);
            
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
        updateProduccionCacao,
        clearUpdateState,
        resetUpdateSuccess
    };
};
