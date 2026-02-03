import { useState } from 'react';
import { createLiquidacionComprasAcuerdoPagoExterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/detalles/adapters/externo/liquidacionComprasAcuerdoPagoExterno.adapter';
import { LiquidacionComprasAcuerdoPagoRequest, LiquidacionComprasAcuerdoPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/detalles/models/externo/liquidacionComprasAcuerdoPagoExterno.model';
import { createLiquidacionComprasAcuerdoPagoInterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/detalles/adapters/interno/liquidacionComprasAcuerdoPagoInterno.adapter';

interface UseLiquidacionComprasAcuerdoPagoProps {
    token: string;
}

interface UseLiquidacionComprasAcuerdoPagoReturn {
    liquidacionData: LiquidacionComprasAcuerdoPagoResponse | null;
    isLoading: boolean;
    error: string | null;
    createLiquidacionCompras: (request: LiquidacionComprasAcuerdoPagoRequest, isInternalUser: boolean) => Promise<LiquidacionComprasAcuerdoPagoResponse>;
    clearData: () => void;
    clearError: () => void;
}

export const useLiquidacionComprasAcuerdoPago = ({ token }: UseLiquidacionComprasAcuerdoPagoProps): UseLiquidacionComprasAcuerdoPagoReturn => {
    const [liquidacionData, setLiquidacionData] = useState<LiquidacionComprasAcuerdoPagoResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const createLiquidacionCompras = async (request: LiquidacionComprasAcuerdoPagoRequest, isInternalUser: boolean): Promise<LiquidacionComprasAcuerdoPagoResponse> => {
        try {
            setIsLoading(true);
            setError(null);
                    
            const response = isInternalUser 
            ? await createLiquidacionComprasAcuerdoPagoInterno(token, request) 
            : await createLiquidacionComprasAcuerdoPagoExterno(token, request);

            setLiquidacionData(response);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al crear la liquidación de compras';
            setError(errorMessage);
            setLiquidacionData(null);
            console.error('❌ Error en hook de liquidación de compras:', errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const clearData = () => {
        setLiquidacionData(null);
        setError(null);
    };

    const clearError = () => {
        setError(null);
    };

    return {
        liquidacionData,
        isLoading,
        error,
        createLiquidacionCompras,
        clearData,
        clearError
    };
}; 