/**
 * Modelos para Acciones de Cobro Persuasivo
 */

// Modelo para una acción de cobro individual
export interface AccionCobroPersuasivo {
  id: number;
  fecha_registro: string;
  nombre_recaudador: string;
  celular: string;
  correo_electronico: string;
  fecha_compra: string;
  nro_factura_unica: string;
  accion_registrada: string;
  plantilla: string;
  descripcion: string;
  documento?: string;
  url_documento?: string;
}

// Respuesta de la API para las acciones de cobro (estructura real del backend)
export interface AccionesCobroResponse {
  success: boolean;
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  data: AccionCobroPersuasivo[];
}

// Parámetros para búsqueda de acciones de cobro
export interface AccionesCobroBusquedaParams {
  page?: number;
  page_size?: number;
  factura_id?: string | number;
  fecha_desde?: string;
  fecha_hasta?: string;
}

// Modelo transformado para la tabla (frontend)
export interface AccionCobroTabla {
  idRegistro: number;
  fechaRegistro: string;
  nombreRecaudador: string;
  celular: string;
  correoElectronico: string;
  fechaCompra: string;
  nroFacturaUnica: string;
  accionRegistrada: string;
  plantilla: string;
  descripcion: string;
  documento: string;
  urlDocumento?: string;
} 