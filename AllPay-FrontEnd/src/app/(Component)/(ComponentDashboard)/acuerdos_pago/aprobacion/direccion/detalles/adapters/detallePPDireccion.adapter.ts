import { DetallePlanPago, DetallePlanPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/direccion/detalles/models/DetallePPDireccion.model';
import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export const detallePlanPagoDireccionAdapter = async (id: string, token: string): Promise<DetallePlanPago[]> => {
    try {
        
        const response = await axios.get(
            `${baseApiUrl}recaudos/acuerdos-pago/aprobacion/direccion/detalles-planes-acuerdo-pago/${id}/`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const responseData: DetallePlanPagoResponse = response.data;
        
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