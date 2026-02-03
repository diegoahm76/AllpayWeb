import { useState } from 'react';
import { getDataLiquidationExternal, LiquidacionResponse } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_liquidacion/adapters/getDataLiquidationExternal';
import { getDataLiquidationInternal } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_liquidacion/adapters/getDataLiquidationInternal';

interface UseLiquidacionDataProps {
    token: string;
    isInternalUser: boolean | null;
}

interface UseLiquidacionDataReturn {
    liquidacionData: LiquidacionResponse | null;
    isLoading: boolean;
    error: string | null;
    fetchLiquidacionData: (idFacturas: number[]) => Promise<LiquidacionResponse>;
}

export const useLiquidacionData = ({ token, isInternalUser }: UseLiquidacionDataProps): UseLiquidacionDataReturn => {
    const [liquidacionData, setLiquidacionData] = useState<LiquidacionResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLiquidacionData = async (idFacturas: number[]): Promise<LiquidacionResponse> => {
        try {
          setIsLoading(true);
          setError(null);
          let response: LiquidacionResponse;
          if(isInternalUser){
            response = await getDataLiquidationInternal(token, idFacturas);
          }else{
            response = await getDataLiquidationExternal(token, idFacturas);
          }
          setLiquidacionData(response);
          return response;                 
        } catch (err: any) {
          if (err instanceof Error) {
            console.log('error 1!!!');
            setError(err.message);
          } else if (
            err &&
            typeof err === 'object' &&
            'detail' in err &&
            Array.isArray(err.facturas_no_liquidables)
          ) {
            const ids = err.facturas_no_liquidables.map((f: any) => f.nro_factura_unica).join(', ');
            const mensaje = `${err.detail} [${ids}].`;
            setError(mensaje || 'Error al obtener datos');
          } else {
            setError('Error al obtener datos');
          }

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
        fetchLiquidacionData
    };
}; 