// Modelo individual para cada acción de cobro persuasivo
export interface AccionCobroPersuasivo {
  id_accion_cobro_persuasivo: number;
  persona_crea_nombre: string;
  nombre: string;
  descripcion: string;
  tipo_cobro: string;
  activo: boolean;
  item_ya_usado: boolean;
  fecha_creacion: string;
  id_persona_crea: number;
}

// Respuesta completa de la API para obtener acciones
export interface AccionesCobroPersuasivoResponse {
  success: boolean;
  detail: string;
  data: AccionCobroPersuasivo[];
}

// Payload para crear una nueva acción
export interface CreateAccionCobroPersuasivoPayload {
  nombre: string;
  descripcion: string;
  tipo_cobro: string;
  activo: boolean;
}

// Respuesta para crear una nueva acción
export interface CreateAccionCobroPersuasivoResponse {
  success: boolean;
  detail: string;
  data: AccionCobroPersuasivo;
}

// Payload para actualizar una acción existente
export interface UpdateAccionCobroPersuasivoPayload {
  nombre: string;
  descripcion: string;
  tipo_cobro: string;
  activo: boolean;
}

// Respuesta para actualizar una acción
export interface UpdateAccionCobroPersuasivoResponse {
  success: boolean;
  detail: string;
  data: AccionCobroPersuasivo;
} 