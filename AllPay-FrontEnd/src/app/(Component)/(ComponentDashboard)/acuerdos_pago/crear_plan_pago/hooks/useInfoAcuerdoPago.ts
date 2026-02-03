import { useState, useCallback } from 'react';
import { getInfoAcuerdoPago } from '../adapters/infoAcuerdoPago.adapter';
import { InfoAcuerdoPagoResponse } from '../models/infoAcuerdoPago.model';
import { getInfoAcuerdoPagoAgregarCuota } from '../adapters/infoAcuerdoPagoAgregarCuota.adapter';

export const useInfoAcuerdoPago = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<InfoAcuerdoPagoResponse | null>(null);
    const [idPlanPago, setIdPlanPago] = useState<number | null>(null);

    const fetchInfoAcuerdoPago = useCallback(async (planPago: boolean, token: string, id: number | string) => {
        try {
            setLoading(true);
            setError(null); 

            let responseAcuerdoPago: InfoAcuerdoPagoResponse | null = null;

            if(!planPago){
                responseAcuerdoPago = await getInfoAcuerdoPago(token, id);
                setIdPlanPago(null);
            } else {
                responseAcuerdoPago = await getInfoAcuerdoPagoAgregarCuota(token, id);
                if (responseAcuerdoPago?.data?.id_plan_pago) {
                    setIdPlanPago(responseAcuerdoPago.data?.id_plan_pago);
                }
            }

            setData(responseAcuerdoPago);
            return responseAcuerdoPago || null;

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener información del acuerdo de pago';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        data,
        idPlanPago,
        fetchInfoAcuerdoPago
    };
}; 