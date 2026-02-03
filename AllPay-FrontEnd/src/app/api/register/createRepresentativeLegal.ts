import axios from "axios";
import Swal from "sweetalert2";
const baseApiUrl = process.env.BASE_API_URL;

export interface LegalRepresentativePayload {
  tipo_documento: string;
  numero_documento: string;
  primer_nombre: string;
  segundo_nombre?: string;
  primer_apellido: string;
  segundo_apellido?: string;
  email: string;
  telefono_celular: string;
  direccion_residencia: string;
  coordenada_x? : string;
  coordenada_y? : string;
}

export const createLegalRepresentative = async (data: LegalRepresentativePayload): Promise<any> => {

  try {
    const response = await axios.post(`${baseApiUrl}personas/crear-representante-legal/`, data);
    Swal.fire({
      icon: "success",
      title: "Éxito",
      text: "Representante legal ha sido creado con éxito",
      confirmButtonColor: "#4D750F"
    });
    return response.data;
  } catch (error: any) {
    Swal.fire({
      icon: "error",
      title: "Error al crear representante legal",
      text: error.response?.data?.detail || error.message,
      confirmButtonColor: "#4D750F"
    });
    throw error;
  }
};
