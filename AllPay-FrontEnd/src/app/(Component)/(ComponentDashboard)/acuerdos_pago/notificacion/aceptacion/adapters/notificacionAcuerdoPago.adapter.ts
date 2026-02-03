import axios from 'axios';
import { NotificacionAcuerdoPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/notificacion/aceptacion/models/notificacionAcuerdoPago.model';

const baseApiUrl = process.env.BASE_API_URL;

export const notificarPlanAcuerdo = async (
    token: string,
    idSolicitudAcuerdoPago: number | string,
    docAcuerdoPlanPago: number
): Promise<NotificacionAcuerdoPagoResponse> => {
    try {
        // ✅ Validación de campos requeridos
        if (!token || token.trim() === '') {
            throw new Error('Token de autenticación es requerido');
        }

        if (!idSolicitudAcuerdoPago) {
            throw new Error('ID de solicitud de acuerdo de pago es requerido');
        }

        if (!docAcuerdoPlanPago) {
            throw new Error('ID del documento de acuerdo de plan de pago es requerido');
        }

        // Validar que el ID de solicitud sea un número válido
        const solicitudId = Number(idSolicitudAcuerdoPago);
        if (isNaN(solicitudId) || solicitudId <= 0) {
            throw new Error('ID de solicitud de acuerdo de pago debe ser un número válido mayor que cero');
        }

        // Validar que el ID del documento sea un número válido
        if (isNaN(docAcuerdoPlanPago) || docAcuerdoPlanPago <= 0) {
            throw new Error('ID del documento debe ser un número válido mayor que cero');
        }

        const payload = {
            id_solicitud_acuerdo_pago: solicitudId,
            doc_acuerdo_plan_pago: docAcuerdoPlanPago
        };


        const response = await axios.patch<NotificacionAcuerdoPagoResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/notificacion/notificar-plan-acuerdo/`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('❌ Error en notificarPlanAcuerdo:', error);
        
        if (axios.isAxiosError(error)) {
            // Errores específicos del servidor
            const serverMessage = error.response?.data?.detail;
            const statusCode = error.response?.status;
            
            if (statusCode === 400) {
                throw new Error(serverMessage || 'Datos inválidos. Verifique que todos los campos sean correctos');
            } else if (statusCode === 401) {
                throw new Error('Token de autenticación inválido o expirado');
            } else if (statusCode === 403) {
                throw new Error('No tiene permisos para realizar esta acción');
            } else if (statusCode === 404) {
                throw new Error('No se encontró la solicitud de acuerdo de pago o el documento especificado');
            } else if (statusCode === 500) {
                throw new Error('Error interno del servidor. Intente nuevamente más tarde');
            } else {
                throw new Error(serverMessage || 'Error al notificar el plan de acuerdo de pago');
            }
        }
        
        // Si es un error de validación que lanzamos nosotros, lo re-lanzamos tal como está
        if (error instanceof Error) {
            throw error;
        }
        
        throw new Error('Error inesperado al notificar el plan de acuerdo de pago');
    }
}; 