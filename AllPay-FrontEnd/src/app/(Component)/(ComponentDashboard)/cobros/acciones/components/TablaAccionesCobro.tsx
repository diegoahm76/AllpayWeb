/**
 * TablaAccionesCobro.tsx
 * 
 * Componente para mostrar tabla de acciones de cobro persuasivo registradas.
 * 
 * Funcionalidades:
 * - Tabla con 12 columnas específicas
 * - Consumo de servicio real /api/cartera/cobros-persuasivos/{id}/
 * - Iconos de visualización
 * - Paginación
 * - Botón para registrar nueva acción
 * - Responsive design
 */
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import SecureInput from '../../formulario/components/SecureInput';
// Importamos los componentes de alerta personalizados
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertNotification from '@/presenters/components/recaudadores/AlertNotification';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
// Importamos el hook nuevo para cobros persuasivos
import { useCobroPersuasivoDetail } from '../hooks/useCobroPersuasivoDetail';
import { CobroPersuasivoTabla } from '../models/cobroPersuasivoDetail.model';
// Importamos el hook para obtener detalles de factura
import { useFacturaDetalles } from '../../formulario/hooks/useFacturaDetalles';
import ModalEditarCobro from './ModalEditarCobro';
// Importamos Material-UI components
import { IconButton } from '@mui/material';
import { Edit, FileDownload } from '@mui/icons-material';

// Props del componente
interface TablaAccionesCobroProps {
  facturaId?: string | null;
  nroFactura?: string | null;
}

const TablaAccionesCobro: React.FC<TablaAccionesCobroProps> = ({ 
  facturaId, 
  nroFactura 
}) => {
  const { theme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  // Usar el hook nuevo para cobros persuasivos
  const {
    cobrosPersuasivos,
    isLoading,
    alertState,
    currentPage,
    totalPages,
    handlePageChange,
    handleDownloadDocument,
    fetchAllDataForExcel,
    closeAlertNotification,
    closeErrorAlert,
    refreshData
  } = useCobroPersuasivoDetail(facturaId);

  // Estados para el modal de edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCobroForEdit, setSelectedCobroForEdit] = useState<CobroPersuasivoTabla | null>(null);

  // Usar el hook para obtener detalles de la factura
  const {
    facturaDetalles,
    isLoading: isLoadingDetalles,
    loadFacturaDetalles
  } = useFacturaDetalles();

  // Efecto para cargar los detalles de la factura cuando facturaId cambia
  useEffect(() => {
    if (facturaId) {
      loadFacturaDetalles(facturaId);
    }
  }, [facturaId, loadFacturaDetalles]);

  // Funciones de formateo
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-CO');
    } catch {
      return dateString;
    }
  };

  // Función para formatear fecha a DD/MM/YYYY
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Función para obtener datos de la factura del primer registro
  const getFacturaData = () => {
    if (facturaDetalles) {
      return {
        nroFactura: facturaDetalles.recaudador_info.nro_factura_unica?.toString() || nroFactura || '',
        fechaCompra: formatDateForDisplay(facturaDetalles.recaudador_info.fecha_compra) || '',
        nombreRecaudador: facturaDetalles.recaudador_info.nombre_completo_o_comercial || '',
        emailRecaudador: facturaDetalles.recaudador_info.email || '',
        celularRecaudador: facturaDetalles.recaudador_info.telefono || ''
      };
    }
    
    // Si no hay datos de la API, usar datos de cobros persuasivos como fallback
    if (cobrosPersuasivos.length > 0) {
      const primer = cobrosPersuasivos[0];
      return {
        nroFactura: primer.nroFactura?.toString() || nroFactura || '',
        fechaCompra: formatDateForDisplay(primer.fechaCompra) || '',
        nombreRecaudador: primer.nombreRecaudador || '',
        emailRecaudador: primer.emailRecaudador || '',
        celularRecaudador: primer.celularRecaudador || ''
      };
    }
    
    return {
      nroFactura: nroFactura || '',
      fechaCompra: '',
      nombreRecaudador: '',
      emailRecaudador: '',
      celularRecaudador: ''
    };
  };

  const formatEmail = (email: string) => {
    if (!email) return '';
    // Truncar email si es muy largo
    return email.length > 25 ? `${email.substring(0, 25)}...` : email;
  };

  const formatDescripcion = (descripcion: string) => {
    if (!descripcion) return '';
    // Truncar descripción para la tabla
    return descripcion.length > 50 ? `${descripcion.substring(0, 50)}...` : descripcion;
  };

  const formatAccionRegistrar = (accion: string) => {
    if (!accion || accion === 'Sin acción') {
      return 'Sin acción definida';
    }
    // Ya no necesitamos convertir snake_case porque viene directamente el nombre limpio del backend
    return accion;
  };

  // Función para renderizar el botón de documento
  const renderDocumento = (value: string, row: CobroPersuasivoTabla) => {
    const tieneDocumento = value && value !== 'Sin documento' && row.documentoAdjuntoUrl;
    
    if (!tieneDocumento) {
      return (
        <span className={`text-md ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          No hay documento
        </span>
      );
    }

    return (
      <button
        onClick={() => handleVerDocumento(row)}
        className="flex items-center space-x-2 p-2 rounded hover:bg-green-100  text-sm"
        title="Ver documento"
      >
        <FileDownload 
        
          sx={{
            color: isDarkMode ? '#fff' : '#4D750F',
            '&:hover': {
              backgroundColor: isDarkMode
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(77, 117, 15, 0.1)'
            }
          }}
        />
      </button>
    );
  };

  // Configuración de columnas para la tabla (usando nombres correctos del modelo)
  const columns = [
    {
      key: 'consecutivo',
      label: 'CONSECUTIVO'
    },
    {
      key: 'fechaRegistro',
      label: 'FECHA DE REGISTRO',
      render: (value: string) => formatDate(value)
    },
    {
      key: 'nombreRecaudador',
      label: 'NOMBRE RECAUDADOR'
    },
    {
      key: 'celularRecaudador',
      label: 'N° CELULAR',
      render: (value: string) => value
    },
    {
      key: 'emailRecaudador',
      label: 'CORREO ELECTRÓNICO',
      render: (value: string) => formatEmail(value)
    },
    {
      key: 'fechaCompra',
      label: 'FECHA DE COMPRA',
      render: (value: string) => formatDate(value)
    },
    {
      key: 'nroFactura',
      label: 'N° FACTURA ÚNICA'
    },
    {
      key: 'accionRegistrar',
      label: 'ACCIÓN REGISTRADA',
      render: (value: string) => formatAccionRegistrar(value)
    },
    {
      key: 'aplicarPlantilla',
      label: 'PLANTILLA'
    },
    {
      key: 'descripcion',
      label: 'DESCRIPCIÓN',
      render: (value: string) => formatDescripcion(value)
    },
    {
      key: 'documentoAdjunto',
      label: 'DOCUMENTO',
      render: (value: string, row: CobroPersuasivoTabla) => renderDocumento(value, row)
    },
    {
      key: 'acciones',
      label: 'ACCIONES',
      render: (_: any, row: CobroPersuasivoTabla) => renderAcciones(row)
    }
  ];

  // Función para renderizar iconos de acciones
  const renderAcciones = (registro: CobroPersuasivoTabla) => {
    return (
      <div className="flex space-x-2 justify-center">
        {/* Botón Editar - usando IconButton de Material-UI */}
        <IconButton
          onClick={() => handleEditarRegistro(registro)}
          sx={{
            color: isDarkMode ? '#fff' : '#4D750F',
            '&:hover': {
              backgroundColor: isDarkMode
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(77, 117, 15, 0.1)'
            }
          }}
          title="Editar"
        >
          <Edit />
        </IconButton>

        {/* Botón para descargar PDF generado - usando IconButton de Material-UI */}
        {registro.docPersuasivoUrl && (
          <IconButton
            onClick={() => {
              if (registro.docPersuasivoUrl) {
                window.open(registro.docPersuasivoUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            sx={{
              color: isDarkMode ? '#fff' : '#4D750F',
              '&:hover': {
                backgroundColor: isDarkMode
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(77, 117, 15, 0.1)'
              }
            }}
            title="Ver documento en línea"
          >
            <FileDownload />
          </IconButton>
        )}
      </div>
    );
  };

  // Funciones de manejo
  const handleEditarRegistro = (registro: CobroPersuasivoTabla) => {
    setSelectedCobroForEdit(registro);
    setIsEditModalOpen(true);
  };

  // Función para manejar el éxito de la edición
  const handleEditSuccess = useCallback(() => {
    refreshData();
  }, [refreshData]);

  // Función para cerrar el modal de edición
  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedCobroForEdit(null);
  }, []);

  const handleVerDocumento = (registro: CobroPersuasivoTabla) => {
    
    // Si existe la URL del documento adjunto, abrirlo directamente
    if (registro.documentoAdjuntoUrl) {
      window.open(registro.documentoAdjuntoUrl, '_blank', 'noopener,noreferrer');
    } else {
      // Si no existe URL directa, intentar descargar desde la API como respaldo
      handleDownloadDocument(registro.idCobroPersuasivo);
    }
  };

  // Función para navegar al formulario de registro
  const handleRegistrarAccion = () => {
    if (!facturaId || !nroFactura) {
      console.warn('[TablaAccionesCobro] - Datos de factura no disponibles para registro');
      return;
    }

    // Navegar al formulario con los parámetros de la factura
    const params = new URLSearchParams({
      facturaId: facturaId,
      nroFactura: nroFactura
    });

    router.push(`/cobros/formulario?${params.toString()}`);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="w-full max-w-full mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6">
      {/* Componentes de alertas */}
      <AlertError 
        isOpen={alertState.showErrorAlert} 
        onClose={closeErrorAlert} 
        message={alertState.errorAlertMessage} 
      />
      
      <AlertNotification
        isOpen={alertState.showAlertNotification}
        onClose={closeAlertNotification}
        notificationText={alertState.alertMessage}
      />
      
      <AlertLoader
        isOpen={isLoading || isLoadingDetalles}
        loadingText="Cargando acciones de cobro..."
      />

      {/* Modal de edición */}
      <ModalEditarCobro
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        cobroData={selectedCobroForEdit}
        onSuccess={handleEditSuccess}
      />

      <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
        <div className={`rounded-xl p-6 relative ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>
          <button
            onClick={() => router.push('/')}
            className={`absolute top-2 right-4 text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
          >
            &times;
          </button>
          {/* Título */}
          <div className="mb-6">
            <h3 className={`text-2xl font-bold text-center ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
              Registro Acciones Cobro Persuasivo
            </h3>
          </div>

          {/* Información de la Factura - Solo mostrar si hay datos */}
          {facturaId && (
            <div className="mb-6">
              <div className="space-y-4">
                <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                  Datos de la Factura
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SecureInput
                    label="N° Factura Única"
                    value={getFacturaData().nroFactura}
                    type="text"
                    darkMode={isDarkMode}
                  />
                  <SecureInput
                    label="Fecha de Compra"
                    value={getFacturaData().fechaCompra}
                    type="text"
                    darkMode={isDarkMode}
                  />
                </div>
              </div>

              <div className="space-y-4 mt-4">
                <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                  Datos del Recaudador
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  <SecureInput
                    label="Nombre del Recaudador (Razón Social)"
                    value={getFacturaData().nombreRecaudador}
                    type="text"
                    darkMode={isDarkMode}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SecureInput
                    label="Correo Electrónico Recaudador"
                    value={getFacturaData().emailRecaudador}
                    type="text"
                    darkMode={isDarkMode}
                  />
                  <SecureInput
                    label="N° Celular Recaudador"
                    value={getFacturaData().celularRecaudador}
                    type="text"
                    darkMode={isDarkMode}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tabla */}
          <div className="w-full">
            {!facturaId ? (
              <div className="text-center py-8">
                <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Selecciona una factura desde la página de consulta para ver sus acciones de cobro.
                </p>
              </div>
            ) : (
              <>
                <DynamicTable
                  columns={columns}
                  data={cobrosPersuasivos}
                  isLoading={isLoading}
                  totalPages={totalPages}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                  downloadButtonPosition="top"
                  fetchAllData={fetchAllDataForExcel}
                />
              </>
            )}
          </div>

          {/* Botón Registrar Acción */}
          {facturaId && (
            <div className="mt-6 flex justify-center">
              <Button
                title="Registrar Acción"
                onClick={handleRegistrarAccion}
                className="text-base font-semibold"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TablaAccionesCobro; 