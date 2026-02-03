import axios from 'axios';

interface FacturaExterna {
    id_factura_unica: number;
    nombre_persona_recaudador: string;
    nro_documento_recaudador: string;
    nombre_persona_proveedor: string;
    nro_documento_proveedor: string;
    tipo_documento_proveedor: string;
    nombre_municipio_cacao: string;
    nombre_departamento_cacao: string;
    id_porcentaje_cobro: number;
    valor_porcentaje_cobro: number;
    cod_tipo_cobro: string;
    cod_tipo_comprador: string;
    nombre_cod_tipo_comprador: string;
    fecha_compra: string;
    nro_factura_unica: number;
    total_kilos: number;
    valor_bruto: string;
    cuota_fomento: string;
    valor_neto: string;
    nro_documento_soporte: string;
    doc_soporte: string;
    doc_soporte_url: string;
    fecha_doc_soporte: string;
    fecha_creacion: string;
    id_persona_recaudador: number;
    id_liq_factura_unica: number | null;
    id_persona_proveedor: number;
    id_municipio_cacao: string;
    id_departamento_cacao: string;
    id_persona_crea: number;
    estado_liquidacion_display?: string | null;
}

interface FacturaExternaResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: FacturaExterna[];
}

const baseApiUrl = process.env.BASE_API_URL;

export const getFacturasExternas = async (
    token: string,
    collectorIds: number[],
    page: number = 1,
    searchParams?: {
        nro_factura_unica?: string;
        fecha_desde?: string;
        fecha_hasta?: string;
        sin_paginacion?: boolean;
        [key: string]: any;
    }
): Promise<FacturaExternaResponse> => {
    try {
        const params: any = {
            ids_recaudador: collectorIds.join(','),
            page: page,
            ...searchParams
        };

        const response = await axios.get(`${baseApiUrl}recaudos/facturas-recaudador-externo/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            params
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener las facturas');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en getFacturasExternas:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(error.response?.data?.detail || 'Error al obtener las facturas');
        }
        throw new Error('Error inesperado al obtener las facturas');
    }
};