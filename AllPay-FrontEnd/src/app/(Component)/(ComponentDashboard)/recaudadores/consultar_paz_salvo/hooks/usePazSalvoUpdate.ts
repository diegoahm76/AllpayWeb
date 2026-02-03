import { useState } from 'react';
import { updatePazSalvo } from '../adapters/pazSalvoUpdate.adapter';
import { PazSalvoUpdatePayload } from '../models/pazSalvoUpdate.model';

export const usePazSalvoUpdate = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Función para mostrar errores
  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorAlert(true);
  };

  const updatePazSalvoDate = async (
    token: string, 
    pazSalvoId: number, 
    fechaActualizacion: string, 
    puertoExportacionId?: number
  ) => {
    try {
      console.log(`Iniciando actualización del paz y salvo con ID: ${pazSalvoId}`);
      
      // Limpiar estados previos
      setError(null);
      setSuccess(false);
      setShowErrorAlert(false);
      
      // Iniciar la carga
      setIsLoading(true);
      
      // Preparar el payload
      const payload: PazSalvoUpdatePayload = {
        fecha_actualizacion: fechaActualizacion
      };

      // Agregar el puerto de exportación si está definido
      if (puertoExportacionId) {
        payload.id_puerto_exportacion = puertoExportacionId;
      }
      
      console.log('Payload para actualizar paz y salvo:', payload);
      
      // Obtener los datos desde el adaptador
      const response = await updatePazSalvo(token, pazSalvoId, payload);
      
      // Verificar si la respuesta fue exitosa
      if (!response.success) {
        const errorMessage = response.detail || 'Error al actualizar el paz y salvo';
        setError(errorMessage);
        showError(errorMessage);
        return false;
      }
      
      // Si la respuesta es exitosa
      console.log('Paz y salvo actualizado correctamente');
      setSuccess(true);
      
      // Establecer un mensaje de éxito simple que no active el título SEÑOR(A) RECAUDOR(A)
      setSuccessMessage("Actualización exitosa");
      
      return true;
    } catch (error) {
      // Manejo de errores genéricos
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar el paz y salvo';
      console.error('Error en usePazSalvoUpdate:', errorMessage);
      
      setError(errorMessage);
      showError(errorMessage);
      return false;
    } finally {
      // Finalizar la carga independientemente del resultado
      setIsLoading(false);
    }
  };

  // Función para limpiar los estados
  const clearState = () => {
    setError(null);
    setSuccess(false);
    setShowErrorAlert(false);
    setSuccessMessage('');
  };

  return {
    isLoading,
    error,
    success,
    showErrorAlert,
    setShowErrorAlert,
    errorMessage,
    successMessage,
    updatePazSalvoDate,
    clearState
  };
}; 