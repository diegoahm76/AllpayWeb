// Removed unused ApiResponse interface

export interface FacturaPagada {
  id_factura_unica: number;
  nombre_persona_recaudador: string;
  direccion_contacto_recaudador: string;
  telefono_contacto_recaudador: string;
  email_contacto_recaudador: string;
  nombre_persona_proveedor: string;
  nro_documento_proveedor: string;
  tipo_documento_proveedor: string;
  nombre_municipio_cacao: string;
  nombre_departamento_cacao: string;
  cod_estado_liquidacion: string;
  cod_estado_liquidacion_display: string;
  id_porcentaje_cobro: number;
  cod_tipo_cobro: string;
  cod_tipo_cobro_nombre: string;
  valor_porcentaje_cobro: number;
  nombres_tipo_comprador: string;
  doc_soporte_url: string | null;
  doc_pago_liquidacion: string;
  estado_factura_display: string;
  fecha_compra: string;
  nro_factura_unica: number;
  total_kilos: number;
  valor_bruto: string;
  cuota_fomento: string;
  valor_neto: string;
  nro_documento_soporte: string;
  doc_soporte: any;
  fecha_doc_soporte: string | null;
  fecha_pago_liquidacion: string | null;
  fecha_creacion: string;
  estado_factura: string;
  id_persona_recaudador: number;
  id_liq_factura_unica: number;
  id_persona_proveedor: number;
  id_municipio_cacao: string;
  id_departamento_cacao: string;
  id_persona_crea: number;
}

export interface SearchParams {
  page?: number;
  page_size?: number;
  nro_factura_unica?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  recaudador_numero_documento?: string;
  pagadas?: boolean;
  numero_documento_proveedor?: string;
  id_departamento_cacao?: number;
  id_municipio_cacao?: number;
}

interface FacturasPagadasResponse {
  success: boolean;
  data: FacturaPagada[];
  total_pages: number;
  current_page: number;
  count: number;
  next: string | null;
  previous: string | null;
}

// Función para obtener la URL base de la API
const getBaseApiUrl = () => {
  const configuredUrl = process.env.BASE_API_URL;
  if (!configuredUrl) {
    console.warn('[getBaseApiUrl] - ⚠️ No se ha configurado BASE_API_URL en las variables de entorno');
  }
  return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

export const getFacturasPagadas = async (
  token: string,
  page: number = 1,
  searchParams?: SearchParams
): Promise<FacturasPagadasResponse> => {
  try {
    // Validar que el token existe
    if (!token || token.trim() === '') {
      throw new Error('Token de autorización requerido');
    }

    const baseUrl = getBaseApiUrl();
    
    // Validar que la URL base esté configurada
    if (!baseUrl) {
      throw new Error('BASE_API_URL no está configurado en las variables de entorno');
    }
    
    // Construir la URL base con los parámetros por defecto
    const urlParams = new URLSearchParams();
    urlParams.append('page', page.toString());
    urlParams.append('page_size', '10'); 
    
    // Agregar parámetros de búsqueda si existen
    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          urlParams.append(key, value.toString());
        }
      });
    }
    
    const url = `${baseUrl}recaudos/facturas-recaudadores/all/?pagadas=true&${urlParams.toString()}`;


    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });


    if (!response.ok) {
      // Intentar obtener el cuerpo como JSON para extraer "detail"; si falla, usar texto
      let detailMessage = '';
      try {
        const errorJson = await response.json();
        detailMessage = errorJson?.detail || errorJson?.message || '';
      } catch (_) {
        // Si no es JSON válido, intentar como texto plano
        try {
          const errorText = await response.text();
          // Intentar extraer detail si el texto parece JSON; si no, usar texto corto
          try {
            const parsed = JSON.parse(errorText);
            detailMessage = parsed?.detail || parsed?.message || '';
          } catch (_) {
            detailMessage = errorText;
          }
        } catch (_) {
          // Ignorar
        }
      }

      // Fallback final a statusText si no se obtuvo detail
      if (!detailMessage || typeof detailMessage !== 'string') {
        detailMessage = response.statusText || 'Error al obtener facturas pagadas';
      }

      throw new Error(detailMessage);
    }

    const data = await response.json();
    
    // Validar que la respuesta tenga el campo success
    if (data.success === false) {
      const errorMessage = data.detail || 'La API retornó success: false';
      throw new Error(errorMessage);
    }
    
    // La API devuelve los datos en data.data
    const facturas = data.data || [];
    
    return {
      success: data.success || true,
      data: facturas,
      total_pages: data.total_pages || Math.ceil((data.count || 0) / 10),
      current_page: data.current_page || page,
      count: data.count || 0,
      next: data.next,
      previous: data.previous
    };

  } catch (error) {
    throw error;
  }
}; 