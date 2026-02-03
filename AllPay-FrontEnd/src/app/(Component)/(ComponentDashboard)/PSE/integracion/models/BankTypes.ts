// Interfaz para los bancos devueltos por la API
export interface PseBank {
  bankCode: string;
  bankName: string;
  bankImageUrl?: string;  // URL opcional de la imagen del banco
  isActive?: boolean;     // Indica si el banco está activo
}

// Interfaz para la respuesta de la API
export interface BanksResponse {
  success: boolean;
  data: PseBank[];
  error?: string;
  message?: string;
}

// Interfaz para el estado del hook
export interface BanksState {
  banks: PseBank[];
  isLoading: boolean;
  error: string | null;
  lastFetch: Date | null;  // Fecha del último fetch para implementar cache
}

// Interfaz para la configuración del hook
export interface BanksConfig {
  cacheTime?: number;    // Tiempo en milisegundos para mantener la cache (default: 1 hora)
  retryCount?: number;   // Número de reintentos en caso de error (default: 3)
  tokenRequired?: boolean; // Indica si se requiere token para la petición (default: true)
}

// Interfaz para la sesión
export interface UserSession {
  user?: {
    tokens?: {
      access?: string;
      refresh?: string;
    };
    tipo_usuario?: string;
    nombre?: string;
    email?: string;
  };
}

// Tipos de acciones
export type BanksAction = 
  | { type: 'FETCH_BANKS_START' }
  | { type: 'FETCH_BANKS_SUCCESS', payload: PseBank[] }
  | { type: 'FETCH_BANKS_ERROR', payload: string }
  | { type: 'RESET_ERROR' }; 