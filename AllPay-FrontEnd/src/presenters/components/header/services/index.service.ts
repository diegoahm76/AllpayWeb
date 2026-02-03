import axios from "axios";

const baseApiUrl = process.env.BASE_API_URL;

    const fetchBandejaByPersona = async (token: string): Promise<any> => {
      try {
        if (!token) {
          console.warn('No se puede obtener la bandeja: token no disponible');
          return null;
        }

        const response = await axios.get(`${baseApiUrl}alertas/get-bandeja-by-persona/`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
  
        if (response.data.success === false) {
          throw new Error(response.data.detail || 'Error en la respuesta del servidor');
        }
  
        return response.data.data; // retornamos la data completa
      } catch (error) {
        console.error('Error al obtener la bandeja:', error);
        return null;
      }
    };


    export {
        fetchBandejaByPersona, 
      };