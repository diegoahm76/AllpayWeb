// Modelo individual para cada acción de cobro persuasivo simple
export interface AccionCobroSimple {
  id_accion_cobro_persuasivo: number;
  nombre: string;
}

// Respuesta completa de la API para obtener acciones simples
export interface AccionesCobroSimpleResponse {
  success: boolean;
  detail: string;
  data: AccionCobroSimple[];
} 