// Interfaz para los datos de usuario obtenidos de la sesión
export interface UserProfile {
  id?: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  tipoPersona?: string;
}

// Interfaz para la respuesta de la API
export interface UserProfileResponse {
  success: boolean;
  data: UserProfile;
  error?: string;
  message?: string;
}

// Interfaz para el estado del hook
export interface UserProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  lastFetch: Date | null;  // Fecha del último fetch para implementar cache
}

// Interfaz para la configuración del hook
export interface UserProfileConfig {
  cacheTime?: number;    // Tiempo en milisegundos para mantener la cache (default: 1 hora)
  retryCount?: number;   // Número de reintentos en caso de error (default: 3)
}

// Tipos de acciones
export type UserProfileAction = 
  | { type: 'FETCH_PROFILE_START' }
  | { type: 'FETCH_PROFILE_SUCCESS', payload: UserProfile }
  | { type: 'FETCH_PROFILE_ERROR', payload: string }
  | { type: 'RESET_ERROR' };

// Mapeo de tipos de documento del sistema al formato requerido por PSE
export const documentTypeMapping: Record<string, string> = {
  'cc': '03',  // Cédula de Ciudadanía
  'ce': '05',  // Cédula de Extranjería
  'nit': '06', // NIT
  'pasaporte': '07', // Pasaporte
  'ti': '02',  // Tarjeta de Identidad
  'rc': '01',  // Registro Civil
  // Añadir más mapeos según sea necesario
};

// Mapeo de tipos de persona del sistema al formato requerido por PSE
export const personTypeMapping: Record<string, string> = {
  'natural': '0',   // Persona Natural
  'juridica': '1',  // Persona Legal/Jurídica
  // Añadir más mapeos según sea necesario
}; 