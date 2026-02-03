export interface PazSalvoDetalle {
  id_paz_y_salvo_factura: number;
  numero_paz_y_salvo: string;
  fecha_generacion: string;
  nombre_tipo_paz_y_salvo: string;
  nombre_puerto: string;
  fecha_registro_factura: string;
  numero_factura: number;
  departamento: string;
  municipio: string;
  fecha_compra: string;
  kilos_reportados: number;
  cuota_fomento: number;
  kilos_con_paz_y_salvo: number;
  kilos_a_reportar: number;
  razon_social_tercero: string | null;
  numero_documento: string | null;
  nombre_factura: string;
  // Campos opcionales para mantener compatibilidad con versiones anteriores
  factura_proveedor?: string;
  kilos_a_generar_paz_y_salvo?: number;
  tipo_documento?: string;
  id_factura_unica?: number;
  id_paz_y_salvo?: number;
}

export interface PazSalvoDetalleResponse {
  success: boolean;
  detail: string;
  data: PazSalvoDetalle[];
} 