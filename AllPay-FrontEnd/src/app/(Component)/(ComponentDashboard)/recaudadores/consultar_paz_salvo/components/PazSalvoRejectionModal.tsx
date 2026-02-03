import React, { useState } from 'react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertNotification from '@/presenters/components/recaudadores/AlertNotification';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';

interface PazSalvoRejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pazSalvoId: number;
  onReject: (id: number, observacion: string) => Promise<{ success: boolean; detail: string }>;
  pazSalvoNumber?: string;
}

const PazSalvoRejectionModal: React.FC<PazSalvoRejectionModalProps> = ({
  isOpen,
  onClose,
  pazSalvoId,
  onReject,
  pazSalvoNumber
}) => {
  const { theme } = useTheme();
  
  // Estados para la observación
  const [observacion, setObservacion] = useState('');
  const [observacionError, setObservacionError] = useState(false);
  
  // Estados para alertas
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Manejar cambios en el campo de observación
  const handleObservacionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setObservacion(e.target.value);
    if (e.target.value.trim()) {
      setObservacionError(false);
    }
  };

  // Manejar el envío del formulario
  const handleSubmit = async () => {
    // Validar que se haya ingresado una observación
    if (!observacion.trim()) {
      setObservacionError(true);
      return;
    }

    try {
      // Mostrar estado de carga
      setIsLoading(true);
      
      // Llamar a la función de rechazo
      const response = await onReject(pazSalvoId, observacion);
      
      // Procesar respuesta
      setIsLoading(false);
      
      if (response.success) {
        // Mostrar mensaje de éxito
        setSuccessMessage(response.detail || 'Paz y salvo rechazado correctamente');
        setShowSuccessAlert(true);
        
        // Cerrar el modal después de 2 segundos
        setTimeout(() => {
          setShowSuccessAlert(false);
          onClose();
        }, 2000);
      } else {
        // Mostrar mensaje de error
        setErrorMessage(response.detail || 'Error al rechazar el paz y salvo');
        setShowErrorAlert(true);
      }
    } catch (error) {
      // Manejar errores
      setIsLoading(false);
      const message = error instanceof Error 
        ? error.message 
        : 'Error al procesar el rechazo';
      setErrorMessage(message);
      setShowErrorAlert(true);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} size="md">
      <>
        {/* Alertas */}
        <AlertError 
          isOpen={showErrorAlert} 
          onClose={() => setShowErrorAlert(false)} 
          message={errorMessage} 
        />
        
        <AlertNotification
          isOpen={showSuccessAlert}
          onClose={() => setShowSuccessAlert(false)}
          notificationText={successMessage}
        />
        
        <AlertLoader
          isOpen={isLoading}
          loadingText="Procesando rechazo..."
        />
        
        <h2 className={`text-2xl font-bold mb-6 text-center ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
          Rechazar Paz y Salvo {pazSalvoNumber ? `#${pazSalvoNumber}` : `ID: ${pazSalvoId}`}
        </h2>
        
        <div className="space-y-4">
          <p className={`mb-4 ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
            Por favor, ingrese el motivo por el cual está rechazando la actualización de este paz y salvo:  
          </p>
          
          <AnimatedInput
            label="Observaciones *"
            name="observacion"
            value={observacion}
            onChange={handleObservacionChange}
            error={observacionError}
          />
          
          {observacionError && (
            <p className="text-red-500 text-sm mt-1">Este campo es obligatorio</p>
          )}
          
          <div className="flex justify-center mt-6 space-x-4">
            <Button
              onClick={handleSubmit}
              title="Rechazar"
              disabled={isLoading}
            />
            <Button
              onClick={onClose}
              title="Cancelar"
              disabled={isLoading}
            />
          </div>
        </div>
      </>
    </ModalContainer>
  );
};

export default PazSalvoRejectionModal; 