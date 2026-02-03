import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export const deletePuertoExportacion = async (token: string, id: number): Promise<boolean> => {
    try {
        const response = await axios.delete(
            `${baseApiUrl}cartera/puertos-exportacion/delete/${id}/`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        // Si el servidor responde con 204, significa que se eliminó correctamente
        if (response.status === 204) {
            return true;
        }

        // Si hay una respuesta con datos, verificamos el success
        if (response.data && response.data.success === false) {
            throw new Error(response.data.detail || 'Error al eliminar el puerto de exportación');
        }

        return true;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error al eliminar puerto:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            
            // Si el error es 404, significa que el puerto no existe
            if (error.response?.status === 404) {
                throw new Error('El puerto no existe o ya fue eliminado');
            }

            throw new Error(error.response?.data?.detail || 'Error al eliminar el puerto de exportación');
        }
        throw error;
    }
};