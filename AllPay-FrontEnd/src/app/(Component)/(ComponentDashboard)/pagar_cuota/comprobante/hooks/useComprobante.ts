import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { getComprobanteByCode } from '../adapters/comprobante.adapter';
import { ComprobanteResponse } from '../models/comprobante.model';

interface UseComprobanteProps {
    codPagoRealizado: string;
    autoFetch?: boolean; // Si debe cargar automáticamente al montar el componente
}

export const useComprobante = ({ codPagoRealizado, autoFetch = true }: UseComprobanteProps) => {
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const token = (session as any)?.user?.tokens?.access;

    const [comprobante, setComprobante] = useState<ComprobanteResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchComprobante = async (codigo?: string) => {
        const codigoToUse = codigo || codPagoRealizado;
        
        if (!token) {
            setError('No se encontró el token de acceso. Por favor, inicie sesión nuevamente.');
            return;
        }

        if (!codigoToUse) {
            setError('Código de pago requerido para obtener el comprobante.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log(`[useComprobante] - Obteniendo comprobante para código: ${codigoToUse}`);
            
            const response = await getComprobanteByCode(token, codigoToUse);
            
            if (response.success && response.data) {
                setComprobante(response.data);
                console.log(`[useComprobante] - Comprobante obtenido exitosamente:`, {
                    numeroDocumento: response.data.pago?.numero_documento_pago,
                    estadoPago: response.data.pago?.cod_estado_pago,
                    valorPagado: response.data.pago?.valor_pagado
                });
            } else {
                setError(response.detail || 'No se pudo obtener el comprobante');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido al obtener el comprobante';
            console.error('[useComprobante] - Error:', errorMessage);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Cargar automáticamente cuando se monta el componente si autoFetch es true
    useEffect(() => {
        if (autoFetch && token && codPagoRealizado && codPagoRealizado.trim() !== '') {
            console.log(`[useComprobante] - Auto-fetch activado para código: ${codPagoRealizado}`);
            fetchComprobante();
        }
    }, [token, codPagoRealizado, autoFetch]);

    // Función para recargar los datos
    const refetch = () => {
        fetchComprobante();
    };

    // Función para limpiar los datos
    const clearComprobante = () => {
        setComprobante(null);
        setError(null);
    };

    // Función para obtener datos con un código específico
    const fetchByCode = (codigo: string) => {
        fetchComprobante(codigo);
    };

    // Funciones de utilidad para formatear datos
    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(value);
    };

    const formatDate = (dateString: string): string => {
        if (!dateString) return 'No disponible';
        
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('es-CO', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(date);
        } catch {
            return dateString; // Retornar el string original si no se puede parsear
        }
    };

    const formatEstadoPago = (estado: string): string => {
        const estados: Record<string, string> = {
            'Pendiente': 'Pendiente',
            'Completado': 'Completado',
            'Aprobado': 'Aprobado',
            'Rechazado': 'Rechazado',
            'Cancelado': 'Cancelado'
        };
        
        return estados[estado] || estado;
    };

    return {
        // Datos
        comprobante,
        isLoading,
        error,
        
        // Funciones
        fetchComprobante: refetch,
        clearComprobante,
        fetchByCode,
        
        // Utilidades
        formatCurrency,
        formatDate,
        formatEstadoPago,
        
        // Estado de sesión
        hasToken: !!token
    };
}; 