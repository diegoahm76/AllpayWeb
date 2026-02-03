import { useState } from 'react';
import { createLiquidation } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_liquidacion/adapters/createLiquidationExternal';
import { LiquidacionRequest, LiquidacionResponse } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_liquidacion/models/liquidacion.external';

interface UseCreateLiquidationProps {
    token: string;
}

interface UseCreateLiquidationReturn {
    liquidacionData: LiquidacionResponse | null;
    isLoading: boolean;
    error: string | null;
    createLiquidationData: (request: LiquidacionRequest) => Promise<LiquidacionResponse>;
}

export const useCreateLiquidationExternal = ({ token }: UseCreateLiquidationProps): UseCreateLiquidationReturn => {
    const [liquidacionData, setLiquidacionData] = useState<LiquidacionResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const createLiquidationData = async (request: LiquidacionRequest): Promise<LiquidacionResponse> => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await createLiquidation(token, request);
            setLiquidacionData(response);
            return response;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al crear la liquidación');
            setLiquidacionData(null);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        liquidacionData,
        isLoading,
        error,
        createLiquidationData
    };
}; 