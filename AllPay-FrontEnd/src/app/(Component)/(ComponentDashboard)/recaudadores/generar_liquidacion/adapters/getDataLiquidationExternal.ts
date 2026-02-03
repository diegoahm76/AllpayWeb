import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export interface DetalleLiquidacion {
    nro_kilos: number;
    valor_kilo: number;
}

export interface LiquidacionData {
    id_factura_unica: number;
    nro_factura_unica: number;
    numero_documento_proveedor: string;
    fecha_creacion_factura: string;
    fecha_compra: string;
    cuota_fomento: number;
    intereses_x_factura: number;
    dias_mora: number;
    fecha_limite_pago: string;
    recaudador_nombre: string;
    tipo_documento_recaudador: string;
    numero_documento_recaudador: string;
    telefono_recaudador: string;
    direccion_recaudador: string | null;
    representante_legal: string | null;
    total_kilos: number;
    promedio_valor_kilo: number;
    fecha_limite_pago_intereses: string | null;
    detalles: DetalleLiquidacion[];
    valor_intereses_total: number;
    cuota_fomento_total: number;
    valor_a_pagar: number;
    fecha_liquidacion: string;
    nro_doc_pago: string;
    codigo_barras: string | null;
}

export interface LiquidacionResponse {
    success: boolean;
    detail: string;
    data: LiquidacionData[];
}

export const getDataLiquidationExternal = async (
    token: string,
    idFacturas: number[],
    liquidadas?: boolean
): Promise<LiquidacionResponse> => {
    try {
        const params: Record<string, any> = {
            id_facturas: JSON.stringify(idFacturas)
        };

        if (typeof liquidadas === 'boolean') {
            params.liquidadas = liquidadas;
        }

        const response = await axios.get<LiquidacionResponse>(
            `${baseApiUrl}recaudos/liquidacion-documento/`,
            {
                params,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        return response.data;
    } catch (error) {
            if (axios.isAxiosError(error)) {
              const errData = error.response?.data;
          
              if (errData && typeof errData === 'object') {
                // Caso 1: formato con `facturas_no_liquidables`
                if ('detail' in errData && Array.isArray(errData.facturas_no_liquidables)) {
                  const facturas = errData.facturas_no_liquidables
                    .map((f: any) => f.nro_factura_unica)
                    .join(', ');
                  const mensaje = `${errData.detail} [${facturas}].`;
                  throw new Error(mensaje);
                }
          
                // Caso 2: formato con `success: false` y un `detail` plano
                if (errData.success === false && typeof errData.detail === 'string') {
                  throw new Error(errData.detail);
                }
              }
          
              // Otro error genérico con string en el cuerpo
              throw new Error(typeof errData === 'string' ? errData : 'Error al obtener datos de liquidación');
            }
          
            // Error no relacionado con Axios
            throw new Error('Error al obtener datos de liquidación');
          }
};
