// Interfaz para un elemento del historial de direcciones
export interface HistoricoDireccionItem {
  id_historico_direccion: number;
  nombre_completo: string;
  direccion: string;
  tipo_direccion: string;
  fecha_cambio: string;
  id_persona: number;
  cod_municipio: string;
  cod_pais_exterior: string | null;
}

// Interfaz para la respuesta de la API
export interface HistoricoDireccionResponse {
  success: boolean;
  detail: string;
  data: HistoricoDireccionItem[];
}

// Interfaz para props del componente modal
export interface HistoricoDireccionModalProps {
  isOpen: boolean;
  onClose: () => void;
  personaId: number;
  nombreCompleto: string;
} 