import axios from 'axios';
import { CollectorInvoicesExternalResponse } from '@/app/(Component)/(ComponentDashboard)/recaudadores/consultar_liquidacion/models/facturasLiquidadas.model';

const baseApiUrl = process.env.BASE_API_URL;

export interface GetCollectorInvoicesExternalParams {
    page?: number;
    page_size?: number;
    liquidadas?: boolean;
    sin_paginacion?: boolean;
    nro_factura_unica?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    // Puedes agregar más filtros si el endpoint los soporta
}

export const consultarFacturasLiquidadasExterno = async (
    token: string,
    params: GetCollectorInvoicesExternalParams = { page: 1, page_size: 10, liquidadas: true }
): Promise<CollectorInvoicesExternalResponse> => {
    try {
        const response = await axios.get<CollectorInvoicesExternalResponse>(
            `${baseApiUrl}recaudos/facturas-recaudador-externo/`,
            {
                params: {
                    ...params,
                    liquidadas: true 
                },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return response.data;
    } catch (error: any) {
        // Puedes personalizar el manejo de errores según tu proyecto
        return {
            success: false,
            count: 0,
            total_pages: 1,
            current_page: 1,
            next: null,
            previous: null,
            data: []
        };
    }
}; 