export interface PazSalvoUpdatePayload {
  fecha_actualizacion: string;
  id_puerto_exportacion?: number;
}
 
export interface PazSalvoUpdateResponse {
  success: boolean;
  detail: string;
} 