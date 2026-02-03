import axios from 'axios';
import { signOut } from 'next-auth/react';
import {
    ProduccionCacaoUpdatePayload,
    ProduccionCacaoUpdateResponse
} from '../models/produccion-cacao-update.models';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Actualiza un registro de producción de cacao existente
 * @param token Token de autenticación JWT
 * @param id ID del registro a actualizar
 * @param payload Datos del registro a actualizar
 * @returns Promise con la respuesta de actualización
 */
export const actualizarProduccionCacao = async (
    token: string,
    id: number,
    payload: ProduccionCacaoUpdatePayload
): Promise<ProduccionCacaoUpdateResponse> => {
    try {
        const url = `${baseApiUrl}reportes/api/produccion-cacao/${id}/`;

        const response = await axios.patch<ProduccionCacaoUpdateResponse>(
            url,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
            }
        );

        return response.data;

    } catch (error: any) {
        console.error('[actualizarProduccionCacao] - Error:', error);

        // Manejo específico de errores de autenticación
        if (error.response?.status === 401) {
            console.warn('[actualizarProduccionCacao] - Token expirado, cerrando sesión...');
            await signOut({ redirect: false });
            throw new Error('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
        }

        // Manejo de errores de validación del servidor
        if (error.response?.status === 400) {
            const serverErrors = error.response.data;
            if (typeof serverErrors === 'object' && serverErrors !== null) {
                const errorMessages = Object.values(serverErrors).flat();
                throw new Error(errorMessages.join(', '));
            }
            throw new Error('Datos de entrada inválidos');
        }

        // Manejo de errores de permisos
        if (error.response?.status === 403) {
            throw new Error('No tiene permisos para actualizar este registro');
        }

        // Manejo de errores de registro no encontrado
        if (error.response?.status === 404) {
            throw new Error('El registro de producción no fue encontrado');
        }

        // Manejo de errores del servidor
        if (error.response?.status >= 500) {
            throw new Error('Error interno del servidor. Por favor, intente más tarde.');
        }

        // Error genérico
        const errorMessage = error.response?.data?.detail || 
                           error.response?.data?.message || 
                           error.message || 
                           'Error al actualizar el registro de producción de cacao';
        
        throw new Error(errorMessage);
    }
};
