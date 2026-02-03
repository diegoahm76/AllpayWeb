// Modelo para factura de cartera en mora (response de la API)
export interface FacturaCarteraMoraAPI {
  // Identificador único por fila (opcional, generado en adapter cuando hay múltiples registros por factura)
  id_row_numeric?: number;
  id_factura_unica: number;
  nro_documento_recaudador: string;
  razon_social_recaudador: string;
  fecha_compra: string;
  nro_factura_unica: number;
  factura_proveedor: string;
  nit_proveedor: string;
  nombre_proveedor: string;
  nombre_municipio_cacao: string;
  nombre_departamento_cacao: string;
  total_kilos: number;
  valor_bruto: string;
  cuota_fomento: string;
  valor_neto: string;
  dias_mora: number;
  nro_acuerdo_pago: string | null;
  valor_intereses: number;
  estado_acuerdo_pago: string | null;
  archivo: string;
  id_persona_recaudador: number;
  id_persona_proveedor: number;
  id_municipio_cacao: string;
  id_departamento_cacao: string;
  // Nuevo: id del cobro coactivo, requerido para navegar y consultar detalles
  id_cobro_coactivo?: number;
}

// Modelo para los totales de la respuesta
export interface TotalesCarteraMora {
  total_kilos: number;
  total_cuota_fomento: number;
  total_interes: number;
}

// Modelo para la respuesta interna de datos
export interface CarteraMoraData {
  success: boolean;
  detail: string;
  totales?: TotalesCarteraMora; // Ahora es opcional ya que el API ya no lo devuelve
  data: FacturaCarteraMoraAPI[];
}

// Modelo para la nueva estructura de respuesta del endpoint coactivo
export interface CarteraCoactivoResponse {
  success: boolean;
  detail: string;
  data: CarteraCoactivoItem[];
  pagination: {
    count: number;
    next: string | null;
    previous: string | null;
    page_size: number;
    current_page: number;
    total_pages: number;
  };
}

// Modelo para cada item en la respuesta del endpoint coactivo
export interface CarteraCoactivoItem {
  id_factura_unica: number;
  nro_factura_unica: number;
  fecha_compra: string;
  valor_bruto: number;
  cuota_fomento: number;
  valor_neto: number;
  recaudador_nombre: string;
  recaudador_documento: string;
  cobro_coactivo: {
    id_cobro_coactivo: number;
    consecutivo: string;
    estado: string;
    fecha_inicio_coactivo: string;
    dias_en_coactivo: number;
    valor_capital: number;
    valor_intereses: number;
    descripcion: string;
  };
}

// Modelo para la respuesta completa de la API (estructura original)
export interface CarteraMoraResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CarteraMoraData;
}

// Modelo transformado para uso en la aplicación
export interface FacturaCarteraMora {
  // id usado por la UI (único por fila)
  id: number;
  // id original de la factura (puede repetirse si hay varios coactivos por factura)
  id_factura_unica?: number;
  // Nuevo: id del cobro coactivo asociado (para navegación y detalles)
  id_cobro_coactivo?: number;
  documento_recaudador: string;
  razon_social_recaudador: string;
  fecha_compra: string;
  nro_factura_unica: string;
  factura_proveedor: string;
  nit_proveedor: string;
  nombre_proveedor: string;
  municipio_cacao: string;
  departamento_cacao: string;
  total_kilos: number;
  valor_bruto: number;
  cuota_fomento: number;
  valor_neto: number;
  dias_mora: number;
  nro_acuerdo_pago: string;
  valor_intereses: number;
  estado_acuerdo_pago: string;
  archivo_url: string;
}

// Modelo para los totales transformados
export interface TotalesCartera {
  total_kilos: number;
  total_cuota_fomento: number;
  total_interes: number;
}

// Modelo para parámetros de búsqueda
export interface CarteraMoraBusquedaParams {
  page?: number;
  page_size?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  nro_documento_recaudador?: string;
  nro_factura_unica?: string;
  nit_proveedor?: string;
  nombre_proveedor?: string;
  municipio_cacao?: string;
  departamento_cacao?: string;
  dias_mora_min?: number;
  dias_mora_max?: number;
}

// Modelo para formulario de búsqueda
export interface FormDataCarteraMora {
  fechaInicio: string;
  fechaFinalizacion: string;
  documentoRecaudador: string;
  nroFactura: string;
  nitProveedor: string;
  nombreProveedor: string;
  municipio: string;
  departamento: string;
  diasMoraMin: string;
  diasMoraMax: string;
} 