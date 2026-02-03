import { useState, useEffect } from 'react';
import { DetallePlanPago } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/recaudador/models/DetallePPRecaudador.model';
import { detallePlanPagoAdapter } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/recaudador/adapters/detallePPRecaudador.adapter';
    
export const useDetallePlanPagoRecaudador = (id: string, token: string) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<DetallePlanPago[]>([]);

    const fetchDetallePlanPago = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await detallePlanPagoAdapter(id, token);
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllData = async () => {
        // Como este endpoint no está paginado, simplemente retornamos todos los datos formateados
        const formattedData = data.map(item => ({
            numero_solicitud: item.nro_solicitud,
            tipo_documento: item.tipo_documento_recaudador,
            numero_documento: item.numero_documento_recaudador,
            nombre_recaudador: item.nombre_recaudador,
            fecha_solicitud: item.fecha_solicitud,
            estado: item.estado,
            numero_plan_pago: item.numero_plan_pago,
            estado_plan_pago: item.estado_plan_pago_display,
            numero_cuota: item.numero_cuota,
            fecha_pago: item.fecha_pago || 'Pendiente',
            nro_factura: item.Nro_factura,
            cuota_fomento: item.cuota_fomento,
            valor_factura: item.valor_factura
        }));
        
        return {
            data: formattedData,
            total_pages: 1
        };
    };

    useEffect(() => {
        if (token && id) {
            fetchDetallePlanPago();
        }
    }, [token, id]);

    return {
        loading,
        error,
        data,
        refetch: fetchDetallePlanPago,
        fetchAllData
    };
}; 