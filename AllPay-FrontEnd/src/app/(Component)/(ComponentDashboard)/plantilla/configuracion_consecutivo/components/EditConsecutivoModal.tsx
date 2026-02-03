'use client';
import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Grid } from '@mui/material';
import Swal from 'sweetalert2';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import { useUpdateConfiguracionConsecutivo } from '../hooks/useUpdateConfiguracionConsecutivo';
import { ConfiguracionConsecutivoAPI, ConfiguracionConsecutivoUpdatePayload } from '../models/types';

interface EditConsecutivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  consecutivoData: ConfiguracionConsecutivoAPI | null;
  token: string;
  onSuccess: () => void;
}

const EditConsecutivoModal: React.FC<EditConsecutivoModalProps> = ({
  isOpen,
  onClose,
  consecutivoData,
  token,
  onSuccess
}) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { isLoading, error, updateConfiguracion, clearError } = useUpdateConfiguracionConsecutivo();

  const [formData, setFormData] = useState<ConfiguracionConsecutivoUpdatePayload>({
    consecutivo_inicial: 0,
    cantidad_digitos: 0,
    prefijo_consecutivo: ''
  });

  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen && consecutivoData) {
      setFormData({
        consecutivo_inicial: consecutivoData.consecutivo_inicial,
        cantidad_digitos: consecutivoData.cantidad_digitos,
        prefijo_consecutivo: consecutivoData.prefijo_consecutivo
      });
      clearError(); // Limpiar errores previos
      setShowErrorAlert(false); // Ocultar alerta de error
      setShowSuccessAlert(false); // Ocultar alerta de éxito
    }
  }, [isOpen, consecutivoData]);

  // Detectar errores y mostrar alerta
  useEffect(() => {
    if (error) {
      setErrorMessage(error);
      setShowErrorAlert(true);
    }
  }, [error]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'consecutivo_inicial' || name === 'cantidad_digitos' 
        ? Number(value) 
        : value
    }));
  };

  const handleSubmit = async () => {
    if (!consecutivoData) return;

    if (!formData.prefijo_consecutivo.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Validación',
        text: 'El prefijo es obligatorio',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'}
            py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed
            cursor-pointer flex items-center justify-center gap-2 outline-none focus:outline-none
          `
        },
        buttonsStyling: false
      });
      return;
    }

    const response = await updateConfiguracion({
      id: consecutivoData.id_config_consecutivo,
      payload: formData,
      token
    });

    if (response) {
      setSuccessMessage(response.detail || 'La configuración se actualizó correctamente');
      setShowSuccessAlert(true);
    } else if (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error,
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'}
            py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed
            cursor-pointer flex items-center justify-center gap-2 outline-none focus:outline-none
          `
        },
        buttonsStyling: false
      });
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const handleCloseErrorAlert = () => {
    setShowErrorAlert(false);
    clearError();
  };

  const handleCloseSuccessAlert = () => {
    setShowSuccessAlert(false);
    onSuccess();
    onClose();
  };

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} size="md">
      <div className="w-full">
        <h3
          className={`mb-6 text-center text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
        >
          EDITAR CONFIGURACIÓN DE CONSECUTIVO
        </h3>

        <Grid container spacing={2} className="mb-6">
          <Grid item xs={12} sm={6}>
            <AnimatedInput
              type="number"
              name="consecutivo_inicial"
              label="Consecutivo Inicial"
              value={formData.consecutivo_inicial.toString()}
              onChange={handleChange}
              disabled={isLoading}
              darkMode={isDarkMode}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <AnimatedInput
              type="number"
              name="cantidad_digitos"
              label="Cantidad de Dígitos"
              value={formData.cantidad_digitos.toString()}
              onChange={handleChange}
              disabled={isLoading}
              darkMode={isDarkMode}
            />
          </Grid>

          <Grid item xs={12}>
            <AnimatedInput
              type="text"
              name="prefijo_consecutivo"
              label="Prefijo del Consecutivo"
              value={formData.prefijo_consecutivo}
              onChange={handleChange}
              disabled={isLoading}
              darkMode={isDarkMode}
            />
          </Grid>
        </Grid>

        {/* Botones de acción */}
        <div className="flex justify-center gap-4">
          <Button
            title="Actualizar"
            onClick={handleSubmit}
            disabled={isLoading}
          />
          <Button
            title="Cancelar"
            onClick={handleCancel}
            disabled={isLoading}
          />
        </div>

      </div>

      {/* Alerta de error */}
      <AlertError
        isOpen={showErrorAlert}
        message={errorMessage}
        onClose={handleCloseErrorAlert}
      />

      {/* Alerta de éxito */}
      <AlertSuccess
        isOpen={showSuccessAlert}
        message={successMessage}
        onClose={handleCloseSuccessAlert}
      />
    </ModalContainer>
  );
};

export default EditConsecutivoModal;
