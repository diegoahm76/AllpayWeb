// Interfaz para los datos de persona obtenidos de la API
export interface PersonaPago {
  id_persona: number;
  nombre_tipo_persona: string;
  tipo_persona: string;
  tipo_documento: string;
  nombre_tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  nombre_comercial: string;
  email: string;
  telefono_celular: string;
  telefono_empresa: string;
  direccion_residencia: string | null;
}

// Interfaz para la respuesta de la API
export interface PersonaPagoResponse {
  success: boolean;
  detail: string;
  data: PersonaPago;
  error?: string;
}

// Interfaz para el estado del hook
export interface PersonaPagoState {
  persona: PersonaPago | null;
  isLoading: boolean;
  error: string | null;
  lastFetch: Date | null;  // Fecha del último fetch para implementar cache
}

// Interfaz para la configuración del hook
export interface PersonaPagoConfig {
  cacheTime?: number;    // Tiempo en milisegundos para mantener la cache (default: 1 hora)
  retryCount?: number;   // Número de reintentos en caso de error (default: 3)
}

// Tipos de acciones
export type PersonaPagoAction = 
  | { type: 'FETCH_PERSONA_START' }
  | { type: 'FETCH_PERSONA_SUCCESS', payload: PersonaPago }
  | { type: 'FETCH_PERSONA_ERROR', payload: string }
  | { type: 'RESET_ERROR' };

// Mapeo de tipos de documento de la API al formato requerido por PSE
export const documentTypeMapping: Record<string, string> = {
  'CC': '03',  // Cédula de Ciudadanía
  'CE': '05',  // Cédula de Extranjería
  'NIT': '06', // NIT
  'PA': '07',  // Pasaporte
  'TI': '02',  // Tarjeta de Identidad
  'RC': '01',  // Registro Civil
  'TE': '04',  // Tarjeta de Extranjería
  'DIE': '08', // Documento de Identificación Extranjero
  // Añadir más mapeos según sea necesario
};

// Mapeo de tipos de persona de la API al formato requerido por PSE
export const personTypeMapping: Record<string, string> = {
  'N': '0',   // Persona Natural
  'J': '1',   // Persona Jurídica
  // Añadir más mapeos según sea necesario
}; 