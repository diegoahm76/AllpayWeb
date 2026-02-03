import axios from 'axios';
import { signOut } from 'next-auth/react';
import {
    CreateDepartamentoProduccionCacaoPayload,
    CreateDepartamentoProduccionCacaoResponse
} from '../models/createDepartamentoProduccionCacao.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Crea un nuevo registro de producción de cacao por departamento
 * @param token Token de autenticación JWT
 * @param payload Datos del registro a crear
 * @returns Promise con la respuesta de creación
 */
export const createDepartamentoProduccionCacao = async (
    token: string,
    payload: CreateDepartamentoProduccionCacaoPayload
): Promise<CreateDepartamentoProduccionCacaoResponse> => {
    try {
        // Validaciones
        if (!payload.cod_departamento || payload.cod_departamento.trim() === '') {
            throw new Error('El código del departamento es requerido');
        }

        if (!payload.ano || payload.ano <= 0) {
            throw new Error('El año es requerido y debe ser mayor a 0');
        }

        if (payload.produccion === null || payload.produccion === undefined || payload.produccion < 0) {
            throw new Error('La producción es requerida y debe ser mayor o igual a 0');
        }

        const url = `${baseApiUrl}reportes/api/registrar-produccion-departamento/`;

        const response = await axios.post<CreateDepartamentoProduccionCacaoResponse>(
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
        console.error('[createDepartamentoProduccionCacao] - Error:', error);

        // Manejo específico de errores de autenticación
        if (error.response?.status === 401) {
            console.warn('[createDepartamentoProduccionCacao] - Token expirado, cerrando sesión...');
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
            throw new Error('No tiene permisos para crear este registro');
        }

        // Manejo de errores de conflicto (registro duplicado)
        if (error.response?.status === 409) {
            throw new Error('Ya existe un registro para este departamento y año');
        }

        // Manejo de errores del servidor
        if (error.response?.status >= 500) {
            throw new Error('Error interno del servidor. Por favor, intente más tarde.');
        }

        // Error genérico
        const errorMessage = error.response?.data?.detail || 
                           error.response?.data?.message || 
                           error.message || 
                           'Error al crear el registro de producción de cacao';
        
        throw new Error(errorMessage);
    }
};
