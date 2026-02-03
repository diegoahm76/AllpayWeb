import axios from 'axios';
import { ComprobanteMapped, ComprobanteResponse } from '../models/comprobante.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene los datos del comprobante de pago usando el código de pago realizado
 * @param token - Token de autenticación
 * @param codPagoRealizado - Código del pago realizado (ej: trfbalkwhxi8krsvzqr0)
 * @returns Datos del comprobante de pago
 */
export const getComprobanteByCode = async (token: string, codPagoRealizado: string): Promise<ComprobanteMapped> => {
    try {
        
        const url = `${baseApiUrl}recaudos/pagos/obtener-pagos/?cod_pago_realizado=${codPagoRealizado}`;
        
        console.log(`[getComprobanteByCode] - URL de consulta: ${url}`);
        
        const response = await axios.get<ComprobanteResponse>(
            url,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        console.log(`[getComprobanteByCode] - Respuesta exitosa:`, {
            status: response.status,
            pagoId: response.data.pago?.id_pago,
            numeroDocumento: response.data.pago?.numero_documento_pago,
            estadoPago: response.data.pago?.cod_estado_pago,
            valorPagado: response.data.pago?.valor_pagado
        });

        // Verificar que tenemos los datos necesarios
        if (!response.data || !response.data.pago) {
            throw new Error('No se encontraron datos del pago para el código proporcionado');
        }

        return {
            success: true,
            detail: 'Comprobante obtenido exitosamente',
            data: response.data
        };

    } catch (error) {
        console.error('[getComprobanteByCode] - Error al obtener comprobante:', error);
        
        if (axios.isAxiosError(error)) {
            console.error('[getComprobanteByCode] - Detalles del error:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });

            if (error.response?.status === 401) {
                throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
            }
            
            if (error.response?.status === 404) {
                throw new Error('No se encontró información del pago para el código proporcionado. Verifique que el código sea correcto.');
            }
            
            if (error.response?.status === 400) {
                const errorDetail = error.response?.data?.detail || error.response?.data?.message || 'Datos de consulta inválidos';
                throw new Error(`Error en la consulta: ${errorDetail}`);
            }
            
            if (error.response?.status && error.response.status >= 500) {
                throw new Error('Error en el servidor. Por favor, intente más tarde o contacte al soporte técnico.');
            }
            
            // Error genérico de la API
            const errorDetail = error.response?.data?.detail || error.response?.data?.message || error.message;
            throw new Error(`Error al obtener el comprobante: ${errorDetail}`);
        }
        
        // Error de red u otro tipo
        throw new Error(error instanceof Error ? error.message : 'Error desconocido al obtener el comprobante');
    }
}; 