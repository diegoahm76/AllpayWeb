import { useState } from 'react';
import { getLiquidacionDocumentoInterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/detalles/adapters/interno/liquidacionDocumentoInterno.adapter';
import { LiquidacionDocumentoInternoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/detalles/models/interno/liquidacionDocumentoInterno.model';
import { getLiquidacionDocumentoExterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/detalles/adapters/externo/liquidacionDocumentoExterno.adapter';

export const useLiquidacionDocumentoInterno = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<LiquidacionDocumentoInternoResponse | null>(null);

    const generarLiquidacion = async (token: string, datosSeleccionados: any[], isInternalUser: boolean) => {
        try {
            setLoading(true);
            setError(null);

            // Extraer los id_cuota_acuerdo_pago de los datos seleccionados
            const idsCuotasSet = new Set<number>();
            
            datosSeleccionados.forEach(item => {
                if (item.original?.id_cuota_acuerdo_pago) {
                    idsCuotasSet.add(item.original.id_cuota_acuerdo_pago);
                }
            });

            // Convertir el Set a array para eliminar duplicados
            const idsCuotasAcuerdoPago = Array.from(idsCuotasSet);

            if (idsCuotasAcuerdoPago.length === 0) {
                throw new Error('No se encontraron IDs de cuotas en los datos seleccionados');
            }

            const response = isInternalUser 
            ? await getLiquidacionDocumentoInterno(token, idsCuotasAcuerdoPago) 
            : await getLiquidacionDocumentoExterno(token, idsCuotasAcuerdoPago);

            setData(response);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al generar liquidación';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const clearData = () => {
        setData(null);
        setError(null);
    };

    const clearError = () => {
        setError(null);
    };

    return {
        loading,
        error,
        data,
        generarLiquidacion,
        clearData,
        clearError
    };
}; 