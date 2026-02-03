/**
 * PazSalvoUpdateModal.tsx
 * 
 * Componente que muestra un modal para actualizar la fecha y puerto de exportación de un paz y salvo.
 * 
 * Mejoras implementadas:
 * - Se agregó soporte para recibir el número de paz y salvo directamente desde el componente padre (SearchPeace)
 * - Se implementó una consulta al API de usuarios internos para obtener el número de paz y salvo si no se recibe desde props
 * - Se mejoró la presentación del número de paz y salvo en el título y en el formulario
 * - Se agregaron fallbacks en caso de errores para asegurar que siempre se muestre un identificador del paz y salvo
 * - Se agregó selección de puerto de exportación en la actualización
 */
import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertNotification from '@/presenters/components/recaudadores/AlertNotification';
import { usePazSalvoDetalle } from '../hooks/usePazSalvoDetalle';
import { usePazSalvoUpdate } from '../hooks/usePazSalvoUpdate';
import { usePuertosExportacion } from '../hooks/usePuertosExportacion';
import { formatCurrency, formatNumberWithCommas } from '@/utils/formatters';

interface PazSalvoUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  pazSalvoId: number;
  token: string;
  onUpdateSuccess?: () => void;
  numeroPazSalvo?: string;
}

const PazSalvoUpdateModal: React.FC<PazSalvoUpdateModalProps> = ({
  isOpen,
  onClose,
  pazSalvoId,
  token,
  onUpdateSuccess,
  numeroPazSalvo: initialNumeroPazSalvo
}) => {
  const { theme } = useTheme();
  const {
    detallesPazSalvo,
    isLoading: isLoadingDetalle,
    error: errorDetalle,
    fetchPazSalvoDetalle,
    clearDetallesPazSalvo
  } = usePazSalvoDetalle();

  const {
    isLoading: isLoadingUpdate,
    error: errorUpdate,
    success,
    showErrorAlert,
    setShowErrorAlert,
    errorMessage,
    updatePazSalvoDate,
    clearState
  } = usePazSalvoUpdate();

  // Obtener los puertos de exportación
  const {
    puertosParaSelect,
    isLoading: isLoadingPuertos,
    error: errorPuertos
  } = usePuertosExportacion(token);

  // Estado para almacenar el número de paz y salvo
  const [numeroPazSalvo, setNumeroPazSalvo] = useState<string>(initialNumeroPazSalvo || '');

  // Estado para el puerto de exportación seleccionado
  const [selectedPuerto, setSelectedPuerto] = useState<string>('');

  // Estado para alertas de éxito
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  
  // Estado para controlar si ya se ha realizado la petición inicial
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  useEffect(() => {
    // Solo ejecutar este efecto cuando el modal se abre y no se ha realizado la petición inicial
    if (isOpen && pazSalvoId && token && !initialFetchDone) {
      console.log("[PazSalvoUpdateModal] - Realizando petición inicial");
      
      // Marcar que la petición inicial ya se ha realizado
      setInitialFetchDone(true);
      
      // Realizar una única llamada a fetchPazSalvoDetalle
      fetchPazSalvoDetalle(token, pazSalvoId);
      
      // Si ya tenemos el número de paz y salvo desde las props, usarlo
      if (initialNumeroPazSalvo) {
        console.log("[PazSalvoUpdateModal] - Usando número de paz y salvo desde props:", initialNumeroPazSalvo);
        setNumeroPazSalvo(initialNumeroPazSalvo);
      } else {
        // Si no tenemos el número de paz y salvo, obtenerlo desde la API
        const getNroPazSalvo = async () => {
          try {
            // Consulta a la API para obtener los datos del paz y salvo
            // Nota: Utilizamos el endpoint para usuarios internos que devuelve nro_paz_y_salvo
            const url = `${process.env.BASE_API_URL || ''}cartera/paz-salvo-lista-interno/`;
            console.log("[PazSalvoUpdateModal] - Consultando API en:", url);
            
            const response = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log("[PazSalvoUpdateModal] - Respuesta API recibida:", data);
              
              // Buscar en la lista el paz y salvo con el ID correcto
              if (data.success && data.data && data.data.data) {
                const pazSalvoEncontrado = data.data.data.find(
                  (item: any) => item.id_paz_y_salvo === pazSalvoId
                );
                
                if (pazSalvoEncontrado) {
                  console.log("[PazSalvoUpdateModal] - Paz y salvo encontrado:", pazSalvoEncontrado);
                  setNumeroPazSalvo(pazSalvoEncontrado.nro_paz_y_salvo || pazSalvoId.toString());
                  
                  // Si tiene puerto de exportación, seleccionarlo
                  if (pazSalvoEncontrado.id_puerto_exportacion) {
                    setSelectedPuerto(pazSalvoEncontrado.id_puerto_exportacion.toString());
                  }
                } else {
                  console.log("[PazSalvoUpdateModal] - No se encontró el paz y salvo con ID:", pazSalvoId);
                  setNumeroPazSalvo(pazSalvoId.toString());
                }
              }
            } else {
              console.error("[PazSalvoUpdateModal] - Error al consultar API:", response.statusText);
              // Si hay error, usar el ID como número de paz y salvo
              setNumeroPazSalvo(pazSalvoId.toString());
            }
          } catch (error) {
            console.error("[PazSalvoUpdateModal] - Error al obtener número de paz y salvo:", error);
            // Si hay error, usar el ID como número de paz y salvo
            setNumeroPazSalvo(pazSalvoId.toString());
          }
        };
        
        getNroPazSalvo();
      }
    }
    
    // Al cerrar el modal, resetear los estados
    return () => {
      if (!isOpen) {
        clearDetallesPazSalvo();
        clearState();
        setInitialFetchDone(false);
        setSelectedPuerto('');
      }
    };
  }, [isOpen, pazSalvoId, token, initialNumeroPazSalvo, initialFetchDone]);

  // Efecto para mostrar alerta de éxito
  useEffect(() => {
    if (success) {
      console.log('[PazSalvoUpdateModal] - Actualización exitosa, mostrando alerta de éxito');
      
      // Solo mostrar la alerta de éxito, no cerrar automáticamente el modal
      setShowSuccessAlert(true);
      
      // No cerrar automáticamente el modal, dejar que el usuario cierre la alerta
      // La función onUpdateSuccess se ejecutará cuando el usuario cierre la alerta
    }
    // Agregar un return vacío para todos los caminos
    return undefined;
  }, [success]);

  // Formatear fecha para mostrar
  const formatDate = () => {
    // Siempre obtener la fecha actual, independientemente del parámetro
    const fecha = new Date();
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Manejar actualización
  const handleUpdate = async () => {
    try {
      // Usar la fecha actual en formato ISO para la actualización
      const fechaActual = new Date().toISOString().split('T')[0];
      
      // Convertir el ID del puerto seleccionado a número si está definido
      const puertoId = selectedPuerto ? parseInt(selectedPuerto, 10) : undefined;
      
      // Mostrar mensaje de actualización en curso
      console.log('[PazSalvoUpdateModal] - Iniciando actualización con fecha:', fechaActual);
      console.log('[PazSalvoUpdateModal] - Puerto de exportación seleccionado:', puertoId);
      
      // Actualizar el paz y salvo
      const updated = await updatePazSalvoDate(token, pazSalvoId, fechaActual, puertoId);
      
      if (updated) {
        // La actualización fue exitosa, mostrar mensaje solo en esta interfaz
        // pero no abrir alerta externa
        setShowSuccessAlert(true);
        
        // Ocultar el mensaje después de 1.5 segundos
        setTimeout(() => {
          setShowSuccessAlert(false);
        }, 1500);
      }
    } catch (error) {
      console.error('[PazSalvoUpdateModal] - Error al actualizar:', error);
    }
  };

  // Manejar cambio en el selector de puerto
  const handlePuertoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPuerto(e.target.value);
  };

  if (!isOpen) return null;

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
    >
      <>
        {/* Alertas */}
        <AlertError 
          isOpen={showErrorAlert} 
          onClose={() => setShowErrorAlert(false)} 
          message={errorMessage || errorDetalle || errorUpdate || errorPuertos || ''} 
        />
        
        <AlertNotification
          isOpen={showSuccessAlert}
          onClose={() => {
            setShowSuccessAlert(false);
            // Ejecutar la función de actualización de la tabla cuando se cierre la alerta
            if (onUpdateSuccess) {
              console.log('[PazSalvoUpdateModal] - Ejecutando onUpdateSuccess al cerrar alerta de éxito');
              onUpdateSuccess();
            }
          }}
          notificationText="Peticion de actualizacion enviada correctamente"
        />
        
        <h2 className={`text-2xl font-bold mb-6 text-center ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
          Actualizar Paz y Salvo {numeroPazSalvo ? `#${numeroPazSalvo}` : `ID: ${pazSalvoId}`}
        </h2>
        
        {isLoadingDetalle || isLoadingPuertos ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#78390e]"></div>
            <span className={`ml-2 ${theme === 'dark' ? 'text-white' : 'text-[#78390e]'}`}>Cargando detalles...</span>
          </div>
        ) : errorDetalle ? (
          <div className={`p-4 rounded-md ${theme === 'dark' ? 'bg-red-900 text-white' : 'bg-red-100 text-red-800'}`}>
            <p>{errorDetalle}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {detallesPazSalvo.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatedInput
                    label="Número de Paz y Salvo"
                    name="nroPazYSalvo"
                    value={numeroPazSalvo || 'N/A'}
                    onChange={() => {}}
                    disabled
                  />
                  <AnimatedInput
                    label="Fecha de Actualizacion"
                    name="fechaGeneracion"
                    value={detallesPazSalvo[0]?.fecha_generacion ? formatDate() : 'N/A'}
                    onChange={() => {}}
                    disabled
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatedInput
                    label="Tipo de Paz y Salvo"
                    name="tipoPazYSalvo"
                    value={detallesPazSalvo[0]?.nombre_tipo_paz_y_salvo || ''}
                    onChange={() => {}}
                    disabled
                  />
                  <AnimatedSelect
                    label="Puerto de Exportación"
                    name="puertoExportacion"
                    value={selectedPuerto}
                    onChange={handlePuertoChange}
                    options={puertosParaSelect}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatedInput
                    label="Departamento"
                    name="departamento"
                    value={detallesPazSalvo[0]?.departamento || ''}
                    onChange={() => {}}
                    disabled
                  />
                  <AnimatedInput
                    label="Municipio"
                    name="municipio"
                    value={detallesPazSalvo[0]?.municipio || ''}
                    onChange={() => {}}
                    disabled
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatedInput
                    label="Kilos Reportados"
                    name="kilosReportados"
                    value={formatNumberWithCommas(detallesPazSalvo[0]?.kilos_reportados?.toString() || '0')}
                    onChange={() => {}}
                    disabled
                  />
                  <AnimatedInput
                    label="Cuota de Fomento"
                    name="cuotaFomento"
                    value={formatCurrency(detallesPazSalvo[0]?.cuota_fomento?.toString() || '0')}
                    onChange={() => {}}
                    disabled
                  />
                </div>
                
                <div className="flex justify-end mt-4 space-x-3">
                  <Button
                    title="Cancelar"
                    onClick={onClose}
                  />
                  <Button
                    title="Actualizar"
                    onClick={handleUpdate}
                    disabled={isLoadingUpdate}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </>
    </ModalContainer>
  );
};

export default PazSalvoUpdateModal; 