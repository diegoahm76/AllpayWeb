export interface ZonaPagosRequest {
  id_liquidacion: number;
  numero_documento: string;
  tipo_documento: string;
  primer_nombre: string;
  primer_apellido: string;
  email: string;
  telefono: string;
}

export interface ZonaPagosResponse {
  success: boolean;
  redirect_url: string;
  identificador: string;
  id_pago: number;
}

export interface ZonaPagosError {
  success: false;
  detail: string;
}
