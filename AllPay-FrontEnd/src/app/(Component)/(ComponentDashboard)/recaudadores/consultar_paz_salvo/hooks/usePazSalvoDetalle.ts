import { useState, useRef } from 'react';
import { getPazSalvoDetalle } from '../adapters/pazSalvoDetalle.adapter';
import { PazSalvoDetalle } from '../models/pazSalvoDetalle.model';

export const usePazSalvoDetalle = () => {
  const [detallesPazSalvo, setDetallesPazSalvo] = useState<PazSalvoDetalle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Referencia para controlar peticiones en curso y evitar duplicados
  const isRequestInProgress = useRef(false);
  const lastRequestId = useRef<number | null>(null);

  // Función para mostrar errores
  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorAlert(true);
  };

  const fetchPazSalvoDetalle = async (token: string, pazSalvoId: number) => {
    // Verificar si ya hay una petición en curso para este ID o si ya tenemos los datos
    if (isRequestInProgress.current || lastRequestId.current === pazSalvoId) {
      console.log(`Evitando petición duplicada para el paz y salvo con ID: ${pazSalvoId}`);
      return;
    }
    
    try {
      console.log(`Iniciando búsqueda del detalle del paz y salvo con ID: ${pazSalvoId}`);
      
      // Marcar que hay una petición en curso
      isRequestInProgress.current = true;
      lastRequestId.current = pazSalvoId;
      
      // Limpiar estados previos
      setError(null);
      setShowErrorAlert(false);
      
      // Iniciar la carga
      setIsLoading(true);
      
      // Obtener los datos desde el adaptador
      const response = await getPazSalvoDetalle(token, pazSalvoId);
      
      // Verificar si la respuesta fue exitosa
      if (!response.success) {
        const errorMessage = response.detail || 'Error al obtener el detalle del paz y salvo';
        setError(errorMessage);
        showError(errorMessage);
        setDetallesPazSalvo([]);
        return;
      }
      
      // Si la respuesta es exitosa pero no hay datos
      if (response.data.length === 0) {
        const mensaje = "No se encontraron detalles para este paz y salvo.";
        setError(mensaje);
        showError(mensaje);
        setDetallesPazSalvo([]);
        return;
      }
      
      // Si hay datos, actualizarlos
      console.log(`Detalles del paz y salvo encontrados: ${response.data.length}`);
      setDetallesPazSalvo(response.data);
    } catch (error) {
      // Manejo de errores genéricos
      const errorMessage = error instanceof Error ? error.message : 'Error al obtener el detalle del paz y salvo';
      console.error('Error en usePazSalvoDetalle:', errorMessage);
      
      setError(errorMessage);
      setDetallesPazSalvo([]);
      showError(errorMessage);
    } finally {
      // Finalizar la carga independientemente del resultado
      setIsLoading(false);
      // Marcar que ya no hay una petición en curso
      isRequestInProgress.current = false;
    }
  };

  // Función para limpiar los resultados
  const clearDetallesPazSalvo = () => {
    setDetallesPazSalvo([]);
    setError(null);
    setShowErrorAlert(false);
    lastRequestId.current = null;
    isRequestInProgress.current = false;
  };

  return {
    detallesPazSalvo,
    isLoading,
    error,
    showErrorAlert,
    setShowErrorAlert,
    errorMessage,
    fetchPazSalvoDetalle,
    clearDetallesPazSalvo
  };
}; 