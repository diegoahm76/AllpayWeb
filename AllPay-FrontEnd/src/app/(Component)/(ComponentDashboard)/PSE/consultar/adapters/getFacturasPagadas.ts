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

interface FacturasPagadasResponse {
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
  searchParams?: any
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
    
    let url = `${baseUrl}recaudos/facturas-recaudador-externo/?pagadas=true&page=${page}`;
    
    if (searchParams) {
      Object.keys(searchParams).forEach(key => {
        if (searchParams[key] !== undefined && searchParams[key] !== null && searchParams[key] !== '') {
          url += `&${key}=${encodeURIComponent(searchParams[key])}`;
        }
      });
    }


    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });


    const data = await response.json();
    
    // Verificar si la respuesta HTTP está bien
    if (!response.ok) {
      console.log('[getFacturasPagadas] - Error HTTP:', response.status, response.statusText);
      
      // Intentar extraer el mensaje detail del JSON
      if (data.detail) {
        console.log('[getFacturasPagadas] - Extrayendo detail de error HTTP:', data.detail);
        throw new Error(data.detail);
      }
      
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    // Verificar si la respuesta indica un error en el campo success
    if (data.success === false) {
      console.log('[getFacturasPagadas] - Respuesta con success=false:', data);
      
      if (data.detail) {
        console.log('[getFacturasPagadas] - Extrayendo detail de success=false:', data.detail);
        throw new Error(data.detail);
      }
      
      throw new Error('Error en la respuesta del servidor');
    }
    
    // La API parece devolver los datos en data.data en lugar de results
    const facturas = data.data || data.results || [];
    
    return {
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