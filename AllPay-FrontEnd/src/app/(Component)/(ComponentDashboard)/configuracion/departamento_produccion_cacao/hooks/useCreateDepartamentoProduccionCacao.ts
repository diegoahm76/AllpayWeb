import { useState } from 'react';
import { createDepartamentoProduccionCacao } from '../adapters/createDepartamentoProduccionCacao';
import {
    CreateDepartamentoProduccionCacaoPayload,
    CreateDepartamentoProduccionCacaoResponse
} from '../models/createDepartamentoProduccionCacao.model';

export const useCreateDepartamentoProduccionCacao = () => {
    const [isCreating, setIsCreating] = useState(false);

    const createRecord = async (
        token: string,
        payload: CreateDepartamentoProduccionCacaoPayload
    ): Promise<CreateDepartamentoProduccionCacaoResponse> => {
        setIsCreating(true);

        try {
            
            const response = await createDepartamentoProduccionCacao(token, payload);
            
            
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al crear el registro de producción de cacao';
            console.error('[useCreateDepartamentoProduccionCacao] - Error en la creación:', errorMessage);
            
            // Re-lanzar el error para que lo maneje el componente
            throw err;
        } finally {
            setIsCreating(false);
        }
    };

    return {
        // Estados
        isCreating,
        
        // Funciones
        createRecord
    };
};
