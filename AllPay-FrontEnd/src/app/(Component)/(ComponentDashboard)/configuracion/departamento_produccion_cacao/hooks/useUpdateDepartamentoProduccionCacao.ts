import { useState } from 'react';
import { updateDepartamentoProduccionCacao } from '../adapters/updateDepartamentoProduccionCacao';
import {
    UpdateDepartamentoProduccionCacaoPayload,
    UpdateDepartamentoProduccionCacaoResponse
} from '../models/updateDepartamentoProduccionCacao.model';

export const useUpdateDepartamentoProduccionCacao = () => {
    const [isUpdating, setIsUpdating] = useState(false);

    const updateRecord = async (
        token: string,
        id: number,
        payload: UpdateDepartamentoProduccionCacaoPayload
    ): Promise<UpdateDepartamentoProduccionCacaoResponse> => {
        setIsUpdating(true);

        try {
            const response = await updateDepartamentoProduccionCacao(token, id, payload);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el registro de producción de cacao';
            console.error('[useUpdateDepartamentoProduccionCacao] - Error en la actualización:', errorMessage);
            
            // Re-lanzar el error para que lo maneje el componente
            throw err;
        } finally {
            setIsUpdating(false);
        }
    };

    return {
        // Estados
        isUpdating,
        
        // Funciones
        updateRecord
    };
};
