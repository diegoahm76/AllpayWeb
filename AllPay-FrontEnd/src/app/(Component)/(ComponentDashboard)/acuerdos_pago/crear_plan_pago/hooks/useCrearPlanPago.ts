import { useState, useCallback } from 'react';
import { crearPlanPago } from '../adapters/crearPlanPago.adapter';
import { CrearPlanPagoResponse, CrearPlanPagoPayload } from '../models/crearPlanPago.model';
import { agregarFacturaCuota } from '../adapters/agregarFacturaCuota.adapter';
import { AgregarFacturaCuotaPayload, AgregarFacturaCuotaResponse } from '../models/agregarFacturaCuota.model';

export const useCrearPlanPago = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<CrearPlanPagoResponse | AgregarFacturaCuotaResponse | null>(null);

    const fetchCrearPlanPago = useCallback(async (
        planPago: boolean,
        token: string,
        //id: number | string,
        payload: CrearPlanPagoPayload | AgregarFacturaCuotaPayload
    ) => {
        try {
            setLoading(true);
            setError(null);
            
            if (!payload.id_facturas) {
                throw new Error('ID de factura no proporcionado');
            }

            if (!planPago) {
                const response = await crearPlanPago(token, payload as CrearPlanPagoPayload);
                setData(response);
                return response;
            }else{
                const response = await agregarFacturaCuota(token, payload as AgregarFacturaCuotaPayload);
                setData(response);
                return response;
            }

        } catch (err) {
            console.error('Error en fetchCrearPlanPago:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error al crear el plan de pago';
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
        fetchCrearPlanPago
    };
}; 