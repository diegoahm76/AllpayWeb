import { DetallePlanPago, DetallePlanPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/recaudador/models/DetallePPRecaudador.model';

export const detallePlanPagoAdapter = async (id: string, token: string): Promise<DetallePlanPago[]> => {
    try {
        const baseApiUrl = process.env.BASE_API_URL;
        const response = await fetch(
            `${baseApiUrl}recaudos/acuerdos-pago/aprobacion-recaudador/detalles-planes-acuerdo-pago/${id}/`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error('Error al obtener los detalles del plan de pago');
        }

        const responseData: DetallePlanPagoResponse = await response.json();
        
        if (!responseData.success || !responseData.data) {
            return [];
        }

        return responseData.data.map(item => ({
            nro_solicitud: item.nro_solicitud,
            tipo_documento_recaudador: item.tipo_documento_recaudador,
            numero_documento_recaudador: item.numero_documento_recaudador,
            nombre_recaudador: item.nombre_recaudador,
            fecha_solicitud: item.fecha_solicitud,
            estado: item.estado,
            id_plan_pago: item.id_plan_pago,
            numero_plan_pago: item.numero_plan_pago,
            estado_plan_pago: item.estado_plan_pago,
            estado_plan_pago_display: item.estado_plan_pago_display,
            numero_cuota: item.numero_cuota,
            fecha_pago: item.fecha_pago,
            Nro_factura: item.Nro_factura,
            cuota_fomento: item.cuota_fomento,
            valor_factura: item.valor_factura
        }));
    } catch (error) {
        throw error;
    }
}; 