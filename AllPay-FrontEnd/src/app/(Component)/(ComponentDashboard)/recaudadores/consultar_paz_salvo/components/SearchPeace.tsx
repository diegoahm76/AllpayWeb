/**
 * SearchPeace.tsx
 * 
 * Componente principal para la búsqueda y gestión de paz y salvos.
 * 
 * Mejoras implementadas:
 * - Se agregó estado para almacenar el número de paz y salvo (nro_paz_y_salvo)
 * - Se modificó el manejo del botón de edición para capturar y pasar el número de paz y salvo al modal
 * - Se implementó un sistema de filtrado de alertas para evitar mensajes repetitivos o innecesarios
 * - Se mejoró la interfaz de usuario para mostrar información más relevante al recaudador
 * - Se agregó columna para mostrar el tipo de documento de tercero (id_tipo_doc_tercero)
 * - Se implementó función para convertir códigos de tipo de documento a nombres descriptivos
 */
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useRecaudadorPazSalvo } from '../hooks/useRecaudadorPazSalvo';
import { signIn } from 'next-auth/react';
import { usePazSalvos } from '../hooks/usePazSalvos';
import { PazSalvo, PazSalvoSearchParams } from '../models/types';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { Visibility, Edit } from '@mui/icons-material';
import { IconButton } from '@mui/material';
// Importamos los componentes de alerta personalizados
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertNotification from '@/presenters/components/recaudadores/AlertNotification';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
// Importamos el componente modal para detalles
import PazSalvoDetalleModal from './PazSalvoDetalleModal';
// Importamos el componente modal para actualización
import PazSalvoUpdateModal from './PazSalvoUpdateModal';
// Importamos el componente modal para rechazo
import PazSalvoRejectionModal from './PazSalvoRejectionModal';
// Importamos el adaptador para llamadas directas
import { getPazSalvos } from '../adapters/getPazSalvos';
// Importamos los componentes de información de usuario
import { ExternalUserInfo } from '@/presenters/components/recaudadores/ExternalUserInfo';
import { InternalUserInfo } from '@/presenters/components/recaudadores/InternalUserInfo';
// Importamos los iconos necesarios
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelIcon from '@mui/icons-material/Cancel';
import FileDownload from '@mui/icons-material/FileDownload';
import { usePazSalvoApproval } from '../hooks/usePazSalvoApproval';
import { formatNumberWithCommas } from '@/utils/formatters';

// Utilidad para limpiar notificaciones antiguas
const limpiarNotificacionesAntiguas = () => {
  // Eliminar notificaciones antiguas de localStorage después de cierto tiempo
  const ahora = Date.now();
  const ultimaActualizacion = localStorage.getItem('ultima_actualizacion_paz_salvo');
  const ultimoUpdateModal = localStorage.getItem('ultimo_update_modal_paz_salvo');
  const updateSuccess = localStorage.getItem('paz_salvo_update_success');
  
  // Limpiar notificaciones de actualización si han pasado más de 60 segundos
  if (ultimaActualizacion) {
    const timestamp = parseInt(ultimaActualizacion);
    if (ahora - timestamp > 60000) { // 60 segundos
      localStorage.removeItem('ultima_actualizacion_paz_salvo');
    }
  }
  
  // Limpiar datos de modal de actualización si han pasado más de 60 segundos
  if (ultimoUpdateModal) {
    const timestamp = parseInt(ultimoUpdateModal);
    if (ahora - timestamp > 60000) { // 60 segundos
      localStorage.removeItem('ultimo_update_modal_paz_salvo');
    }
  }
  
  // Limpiar éxito de actualización si han pasado más de 60 segundos
  if (updateSuccess) {
    const timestamp = parseInt(updateSuccess);
    if (ahora - timestamp > 60000) { // 60 segundos
      localStorage.removeItem('paz_salvo_update_success');
    }
  }
};

const SearchPeace: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });
  
  const token = (session as any)?.user?.tokens?.access;
  const tipoUsuario = (session as any)?.user?.tipo_usuario;
  
  // Mejorar la detección de usuario interno para considerar cualquier valor que comience con 'I' o 'INTERNO'
  const isInternal = tipoUsuario === 'INTERNO' || 
                     tipoUsuario === 'I' || 
                     tipoUsuario?.startsWith('I') || 
                     tipoUsuario?.startsWith('INTERNO');
  
  // Depuración del tipo de usuario
  console.log('🔍 [SearchPeace] - TIPO USUARIO DETECTADO:', tipoUsuario);
  console.log('🔍 [SearchPeace] - ES USUARIO INTERNO:', isInternal);
  
  const { 
    formData, 
    isLoading: isLoadingForm, 
    error: formError, 
    updateFormDates, 
    updateFormField,
    clearFormData,
    setIsInternalDirectly
  } = useRecaudadorPazSalvo(token || '');
  
  const { 
    pazSalvos, 
    isLoading: isLoadingTable, 
    fetchPazSalvos,
    showAlertNotification,
    setShowAlertNotification,
    alertMessage,
    setAlertMessage,
    showErrorAlert,
    setShowErrorAlert,
    errorAlertMessage,
    currentPage,
    totalPages,
    changePage,
  } = usePazSalvos();

  // Estado para almacenar el número de documento cuando se encuentre un recaudador (solo para usuarios internos)
  const [foundCollectorDocument, setFoundCollectorDocument] = useState('');
  
  // Evitar ciclos de renderizado y llamadas
  const [initialized, setInitialized] = useState(false);
  
  // Estados para el modal de detalle de paz y salvo
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [selectedPazSalvoId, setSelectedPazSalvoId] = useState<number | null>(null);
  
  // Estados para el modal de actualización de paz y salvo
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedPazSalvoForUpdate, setSelectedPazSalvoForUpdate] = useState<number | null>(null);
  const [selectedPazSalvoNumber, setSelectedPazSalvoNumber] = useState<string>('');
  
  // Estados para el modal de rechazo de paz y salvo
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedPazSalvoForRejection, setSelectedPazSalvoForRejection] = useState<number | null>(null);
  const [selectedPazSalvoNumberForRejection, setSelectedPazSalvoNumberForRejection] = useState<string>('');
  const [isLoadingApproval, setIsLoadingApproval] = useState(false);
  
  // Estado para controlar peticiones en progreso
  const [isUpdating, setIsUpdating] = useState(false);
  const requestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Hook para manejar la aprobación/desaprobación de paz y salvos
  const { 
    isLoading: isApprovingPazSalvo,
    error: approvalError,
    isSuccess: approvalSuccess,
    message: approvalMessage,
    approvePazSalvo: approveAction,
    disapprovePazSalvo: disapproveAction,
    resetState: resetApprovalState
  } = usePazSalvoApproval(token || '');
  
  // Referencia para almacenar una función que recargará los datos
  const reloadDataRef = useRef<() => void>(() => {
    console.log('[SearchPeace] - Recargando datos (función por defecto)');
    if (token) {
      fetchPazSalvos(token, undefined, currentPage, isInternal);
    }
  });
  
  // Efecto para manejar los cambios en el estado de aprobación
  useEffect(() => {
    // Si hay un error de aprobación
    if (approvalError) {
      console.log('[SearchPeace] - Error de aprobación detectado:', approvalError);
      setAlertMessage(approvalError);
      setShowErrorAlert(true);
    }
    
    // Si hay un mensaje de éxito
    if (approvalSuccess && approvalMessage) {
      console.log('[SearchPeace] - Aprobación exitosa:', approvalMessage);
      setAlertMessage(approvalMessage);
      setShowAlertNotification(true);
      
      // Cerrar la notificación después de 2 segundos y actualizar la lista
      setTimeout(() => {
        setShowAlertNotification(false);
        // Recargar los datos usando la referencia
        reloadDataRef.current();
        // Reiniciar el estado de aprobación
        resetApprovalState();
      }, 2000);
    }
  }, [approvalError, approvalSuccess, approvalMessage, resetApprovalState]);
  
  // Efecto adicional para limpiar los campos cuando se detecta un usuario interno
  useEffect(() => {
    if (isInternal) {
      console.log('[SearchPeace] - Efecto adicional: Usuario interno detectado, limpiando campos');
      clearFormData();
    }
  }, [isInternal, clearFormData]);
  
  // Consolidar los efectos para evitar llamadas en cascada
  useEffect(() => {
    if (!token) return;
    
    // Evitar que este efecto se ejecute más de una vez
    if (initialized) return;
    
    const initializeComponent = async () => {
      // Paso 1: Obtener la sesión del usuario y guardarla en localStorage para uso futuro
      console.log('--- INICIALIZACIÓN DEL COMPONENTE ---');
      console.log('SESSION USER:', (session as any)?.user);
      console.log('TIPO USUARIO:', tipoUsuario);
      console.log('ES USUARIO INTERNO:', isInternal);
      
      if (session) {
        localStorage.setItem('session', JSON.stringify(session));
      }
      
      // Paso 2: Configurar explícitamente el estado interno en el hook
      if (isInternal) {
        console.log('Estableciendo isInternal a TRUE en el hook');
        setIsInternalDirectly(true);
        
        // Limpiar formulario explícitamente para usuarios internos
        // Esto debe asegurar que todos los campos estén vacíos
        console.log('Forzando limpieza de todos los campos para usuario interno');
        clearFormData();
        
        // Cargar todos los paz y salvos inmediatamente para usuarios internos
        console.log('Cargando todos los paz y salvos para usuario interno');
        setTimeout(() => {
          fetchPazSalvos(token, undefined, 1, true);
        }, 500); // Pequeño retraso para evitar problemas de timing
      } else {
        console.log('Estableciendo isInternal a FALSE en el hook');
        setIsInternalDirectly(false);
        
        // Para usuarios externos, esperar a que se complete la carga del formulario
        // antes de hacer la primera búsqueda (solo una vez)
        console.log('Realizando carga inicial de paz y salvos para usuario externo');
        fetchPazSalvos(token, undefined, 1, false);
      }
      
      // Marcar como inicializado para evitar que este efecto se ejecute más de una vez
      setInitialized(true);
    };
    
    initializeComponent();
    
  }, [token, session, tipoUsuario, isInternal, setIsInternalDirectly]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'fechaInicio' || name === 'fechaFinalizacion') {
      updateFormDates(
        name === 'fechaInicio' ? value : formData.fechaInicio,
        name === 'fechaFinalizacion' ? value : formData.fechaFinalizacion
      );
    } else if (isInternal) {
      // Si es usuario interno, permitir actualizar todos los campos
      updateFormField(name, value);
    }
  };

  // Manejador para cuando se encuentra un recaudador en el componente InternalUserInfo
  const handleFoundCollector = (documentoIdentificacion: string) => {
    setFoundCollectorDocument(documentoIdentificacion);
    
    // Realizar consulta automática de paz y salvos del recaudador encontrado
    if (documentoIdentificacion && isInternal && token) {
      console.log("[SearchPeace] - Realizando consulta automática para el recaudador:", documentoIdentificacion);
      
      // Crear parámetros de búsqueda solo con el documento del recaudador
      const searchParams: PazSalvoSearchParams = {
        nro_documento: documentoIdentificacion
      };
      
      // Consultar los paz y salvos asociados a este recaudador
      fetchPazSalvos(token, searchParams, 1, true);
    }
  };

  const handleSearch = () => {
    console.log("[SearchPeace] - Ejecutando búsqueda con isInternal:", isInternal);
    
    // Preparar parámetros de búsqueda
    const searchParams: PazSalvoSearchParams = {};
    
    // Añadir fechas si se han proporcionado
    if (formData.fechaInicio) searchParams.fecha_inicio = formData.fechaInicio;
    if (formData.fechaFinalizacion) searchParams.fecha_fin = formData.fechaFinalizacion;
    
    // Si es usuario interno y ha encontrado un recaudador, añadirlo a los parámetros
    if (isInternal && foundCollectorDocument) {
      searchParams.nro_documento = foundCollectorDocument;
    }
    
    // Si no hay parámetros de búsqueda, traer todos los registros
    if (Object.keys(searchParams).length === 0) {
      console.log("[SearchPeace] - No hay parámetros, buscando todos los registros");
      fetchPazSalvos(token || '', undefined, 1, isInternal); // Resetear a página 1
      return;
    }
    
    // Realizar la búsqueda con los parámetros
    console.log("[SearchPeace] - Búsqueda con parámetros:", searchParams);
    fetchPazSalvos(token || '', searchParams, 1, isInternal); // Resetear a página 1
  };

  // Actualizar la referencia para usar handleSearch
  useEffect(() => {
    reloadDataRef.current = handleSearch;
  }, [handleSearch]);

  const handleClearSearch = () => {
    if (isInternal) {
      // Si es usuario interno, limpiar todos los campos
      clearFormData();
      setFoundCollectorDocument('');
    } else {
      // Si es usuario externo, solo limpiar fechas
      updateFormDates('', '');
    }
    fetchPazSalvos(token || '', undefined, 1, isInternal); // Resetear a página 1
  };

  // Formatear fechas para mostrar
  const formatDate = (value: string) => {
    const fecha = new Date(value);
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Función para obtener todos los datos para Excel
  const fetchAllDataForExcel = async (_page: number) => {
    try {
      // Aquí no necesitamos hacer nada con el parámetro _page
      // ya que estamos obteniendo todos los datos independientemente de la paginación
      
      // Crear una promesa para obtener todos los datos
      let allData: PazSalvo[] = [];
      let currentFetchPage = 1;
      let hasMorePages = true;
      
      // Preparar los parámetros de búsqueda
      const searchParams: PazSalvoSearchParams = {};
      
      // Añadir fechas si se han proporcionado
      if (formData.fechaInicio) searchParams.fecha_inicio = formData.fechaInicio;
      if (formData.fechaFinalizacion) searchParams.fecha_fin = formData.fechaFinalizacion;
      
      // Si es usuario interno y ha proporcionado un documento, añadirlo a los parámetros
      if (isInternal && foundCollectorDocument) {
        searchParams.nro_documento = foundCollectorDocument;
      }
      
      while (hasMorePages) {
        // Usamos el adaptador directamente
        const response = await getPazSalvos(
          token || '', 
          {
            ...searchParams,
            page: currentFetchPage
          },
          currentFetchPage,
          isInternal
        ); 
        
        if (response.success && response.data.length > 0) {
          allData = [...allData, ...response.data];
          hasMorePages = response.total_pages ? currentFetchPage < response.total_pages : false;
          currentFetchPage++;
        } else {
          hasMorePages = false;
        }
      }
      
      // Devolver todos los datos obtenidos
      return {
        data: allData,
        total_pages: 1 // No importa aquí porque ya recuperamos todos los datos
      };
    } catch (error) {
      console.error('Error al obtener datos para Excel:', error);
      return {
        data: [],
        total_pages: 0
      };
    }
  };

  // Manejar actualización exitosa
  const handleUpdateSuccess = () => {
    if (isUpdating) {
      console.log("[SearchPeace] - Ya hay una actualización en progreso, ignorando petición");
      return;
    }
    
    console.log("[SearchPeace] - Actualización exitosa completada");
    console.log("[SearchPeace] - Usuario interno:", isInternal);
    
    // Cerrar cualquier alerta que pueda estar abierta
    setShowAlertNotification(false);
    
    // Marcar que estamos en proceso de actualización
    setIsUpdating(true);
    
    // Preparar los parámetros de búsqueda
    const searchParams: PazSalvoSearchParams = {};
    
    if (formData.fechaInicio) searchParams.fecha_inicio = formData.fechaInicio;
    if (formData.fechaFinalizacion) searchParams.fecha_fin = formData.fechaFinalizacion;
    
    // Añadir el documento del recaudador si existe
    if (foundCollectorDocument) {
      searchParams.nro_documento = foundCollectorDocument;
    }
    
    // Ejecutar la petición con un pequeño retraso para evitar múltiples peticiones
    requestTimeoutRef.current = setTimeout(() => {
      try {
        // Si no hay parámetros, usar búsqueda sin parámetros
        if (Object.keys(searchParams).length === 0) {
          console.log("[SearchPeace] - No hay parámetros, usando búsqueda simple");
          fetchPazSalvos(token || '', undefined, currentPage, true);
        } else {
          // Usar búsqueda con parámetros
          console.log("[SearchPeace] - Búsqueda con parámetros:", searchParams);
          fetchPazSalvos(token || '', searchParams, currentPage, true);
        }
      } finally {
        // Marcar que la actualización ha finalizado después de un tiempo
        setTimeout(() => {
          setIsUpdating(false);
        }, 1000);
      }
    }, 300);
  };

  // Función para manejar la apertura de documentos
  const handleOpenDocument = (row: PazSalvo) => {
    try {
      // Verificar si existe la URL del archivo
      if (row.archivo) {
        console.log('[SearchPeace] - Redireccionando a documento en línea:', row.archivo);
        
        // Mostrar notificación
        setAlertMessage("Abriendo documento en el navegador...");
        setShowAlertNotification(true);
        
        // Cerrar notificación después de 2 segundos
        setTimeout(() => {
          setShowAlertNotification(false);
        }, 2000);
        
        // Crear un elemento <a> para redireccionar al enlace
        const link = document.createElement('a');
        link.href = row.archivo;
        link.target = '_blank'; // Abrir en nueva pestaña
        link.rel = 'noopener noreferrer'; // Por seguridad
        link.click();
      } else {
        // Si no hay URL, mostrar mensaje de error
        console.error('[SearchPeace] - No hay URL de documento disponible');
        setAlertMessage("No se encontró el enlace al documento para este paz y salvo");
        setShowAlertNotification(true);
      }
    } catch (error) {
      console.error('[SearchPeace] - Error al abrir documento en línea:', error);
      setAlertMessage("Error al abrir el documento en el navegador");
      setShowAlertNotification(true);
    }
  };

  // Función para autorizar un paz y salvo
  const handleAuthorizePazSalvo = async (row: PazSalvo) => {
    try {
      console.log('[SearchPeace] - Iniciando proceso de autorización para paz y salvo:', row);
      
      const pazSalvoId = row.id || row.id_paz_y_salvo;
      console.log('[SearchPeace] - ID del paz y salvo a autorizar:', pazSalvoId);
      
      if (!pazSalvoId) {
        console.error('[SearchPeace] - No se encontró ID de paz y salvo para autorizar');
        setAlertMessage("No se encontró el ID del paz y salvo para autorizar");
        setShowErrorAlert(true);
        return;
      }
      
      // Mostrar loader durante el proceso
      setIsLoadingApproval(true);
      
      // Llamar a la función de aprobación del hook
      const response = await approveAction(pazSalvoId);
      
      console.log('[SearchPeace] - Respuesta de autorización:', response);
      
      // Ocultar loader
      setIsLoadingApproval(false);
      
      // Mostrar mensaje según el resultado
      if (response.success) {
        // Mostrar mensaje de éxito después de un breve retraso
        setTimeout(() => {
          setAlertMessage(response.detail || "Paz y salvo autorizado correctamente");
          setShowAlertNotification(true);
          
          // Cerrar notificación después de 2 segundos
          setTimeout(() => {
            setShowAlertNotification(false);
            
            // Actualizar la lista de paz y salvos para reflejar el cambio
            console.log('[SearchPeace] - Actualizando lista después de autorización exitosa');
            handleSearch();
          }, 2000);
        }, 100);
      } else {
        // Mostrar mensaje de error
        setAlertMessage(response.detail || "Error al autorizar el paz y salvo");
        setShowErrorAlert(true);
      }
    } catch (error) {
      console.error('[SearchPeace] - Error al autorizar paz y salvo:', error);
      
      // Ocultar loader
      setIsLoadingApproval(false);
      
      // Mostrar mensaje de error
      setAlertMessage("Error al procesar la autorización del paz y salvo");
      setShowErrorAlert(true);
    }
  };

  // Función para mostrar el modal de rechazo
  const handleShowRejectionModal = (row: PazSalvo) => {
    const pazSalvoId = row.id || row.id_paz_y_salvo;
    if (!pazSalvoId) {
      console.error('[SearchPeace] - No se encontró ID de paz y salvo para rechazar');
      setAlertMessage("No se encontró el ID del paz y salvo para rechazar");
      setShowErrorAlert(true);
      return;
    }
    
    // Guardar el ID y número para el rechazo
    setSelectedPazSalvoForRejection(pazSalvoId);
    setSelectedPazSalvoNumberForRejection(row.nro_paz_y_salvo || '');
    
    // Mostrar el modal de rechazo
    setShowRejectionModal(true);
  };

  // Función para rechazar un paz y salvo con observaciones
  const handleRejectPazSalvo = async (pazSalvoId: number, observacion: string) => {
    try {
      console.log('[SearchPeace] - Rechazando paz y salvo:', {
        id: pazSalvoId,
        observacion
      });
      
      // Llamar a la función de desaprobación del hook con la observación
      const response = await disapproveAction(pazSalvoId, observacion);
      
      console.log('[SearchPeace] - Respuesta de rechazo:', response);
      
      // Si fue exitoso, actualizar la lista después de cerrar el modal
      if (response.success) {
        setTimeout(() => {
          handleSearch();
        }, 2000);
      }
      
      return response;
    } catch (error) {
      console.error('[SearchPeace] - Error al rechazar paz y salvo:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error desconocido al procesar el rechazo';
      
      return {
        success: false,
        detail: errorMessage
      };
    }
  };

  // Función para desautorizar un paz y salvo (ahora solo muestra el modal)
  const handleDeauthorizePazSalvo = (row: PazSalvo) => {
    handleShowRejectionModal(row);
  };

  // Función para convertir códigos de tipo de documento a nombres legibles
  const getTipoDocumentoNombre = (codigo: string | number | null | undefined): string => {
    if (!codigo) return 'N/A';
    
    // Mapeo de códigos a nombres descriptivos
    const tiposDocumento: Record<string, string> = {
      'CC': 'Cédula de Ciudadanía',
      'CE': 'Cédula de Extranjería',
      'TI': 'Tarjeta de Identidad',
      'PA': 'Pasaporte',
      'NIT': 'NIT',
      'NT': 'NIT',
      'RC': 'Registro Civil'
    };
    
    return tiposDocumento[String(codigo)] || String(codigo);
  };

  // Definición de columnas para la tabla
  const columns = [
    {
      key: 'nro_paz_y_salvo',
      label: 'Número de Paz y Salvo',
      render: (value: string) => value || 'N/A'
    },
    {
      key: 'fecha_generacion',
      label: 'Fecha de Generación',
      render: (value: string) => value ? formatDate(value) : 'N/A'
    },
    {
      key: 'nombre_recaudador',
      label: 'Nombre Recaudador',
      render: (value: string) => value || 'N/A'
    },
    {
      key: 'documento_recaudador',
      label: 'Nº Documento Recaudador',
      render: (value: string) => value || 'N/A'
    },
    {
      key: 'nombre_tipo_doc_recaudador',
      label: 'Tipo Documento Recaudador',
      render: (value: string) => value || 'N/A'
    },
    {
      key: 'nombre_tipo_paz_y_salvo',
      label: 'Tipo',
      render: (value: string) => value || 'N/A'
    },
    {
      key: 'nombre_puerto',
      label: 'Puerto Exportación',
      render: (value: string) => value || 'N/A'
    },
    {
      key: 'total_kilos_paz_y_salvo',
      label: 'Total Kilos de Paz y Salvo',
      render: (value: number) => value ? formatNumberWithCommas(value.toString()) : '0'
    },
    {
      key: 'razon_social_tercero',
      label: 'Razón Social Tercero',
      render: (value: string) => value || 'N/A'
    },
    {
      key: 'nro_doc_tercero',
      label: 'Nº Documento Tercero',
      render: (value: string) => value || 'N/A'
    },
    {
      key: 'id_tipo_doc_tercero',
      label: 'Tipo Documento Tercero',
      render: (value: string | number | null | undefined) => getTipoDocumentoNombre(value)
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (value: string) => value || 'N/A'
    }
  ];

  // Definición de acciones para cada fila en el formato que espera DynamicTable
  const actions = [
    
    // Mostrar "Editar Paz y Salvo" solo para usuarios externos
    ...(!isInternal ? [{
      label: 'Editar Paz y Salvo',
      render: (row: PazSalvo) => (
        <IconButton
          onClick={() => {
            // Guardar tanto el ID como el número de paz y salvo
            setSelectedPazSalvoForUpdate(row.id || row.id_paz_y_salvo);
            setSelectedPazSalvoNumber(row.nro_paz_y_salvo || '');
            setShowUpdateModal(true);
          }}
          sx={{
            color: theme === 'dark' ? '#fff' : '#4D750F',
            '&:hover': {
              backgroundColor: theme === 'dark'
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(77, 117, 15, 0.1)'
            }
          }}
          title="Editar paz y salvo"
        >
          <Edit />
        </IconButton>
      )
    }] : []),
    // Mostrar "Autorizar" y "Desautorizar" para usuarios internos, siempre visibles pero con estados adecuados
    ...(isInternal ? [
      {
        label: 'Autorizar',
        render: (row: PazSalvo) => {
          // Determinar si hay una actualización pendiente
          const tieneActualizacionPendiente = row.es_actualizacion === true && (row.aprueba_actualizacion === null || row.aprueba_actualizacion === false);
          
          // Determinar si ya fue aprobado
          const yaFueAprobado = row.aprueba_actualizacion === true;
          
          // Determinar si el botón debe estar deshabilitado
          const isDisabled = isApprovingPazSalvo || !tieneActualizacionPendiente || yaFueAprobado;
          
          // Determinar el mensaje del tooltip según la condición
          let tooltipMessage = "Autorizar paz y salvo";
          if (isApprovingPazSalvo) {
            tooltipMessage = "Procesando...";
          } else if (yaFueAprobado) {
            tooltipMessage = "Este paz y salvo ya ha sido aprobado";
          } else if (!tieneActualizacionPendiente) {
            tooltipMessage = "No hay actualización pendiente para aprobar";
          }
          
       
          return (
          <IconButton
            onClick={() => handleAuthorizePazSalvo(row)}
            disabled={isDisabled}
            sx={{
              color: isDisabled ? '#6b7280' : (theme === 'dark' ? '#4ade80' : '#4D750F'),
              '&.Mui-disabled': {
                color: '#6b7280 !important',
                opacity: 0.6,
              },
              '&:hover': {
                backgroundColor: isDisabled 
                  ? 'rgba(107, 114, 128, 0.1)'
                  : (theme === 'dark' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(77, 117, 15, 0.1)'),
                opacity: isDisabled ? 0.6 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
              },
              opacity: isDisabled ? 0.6 : 1,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              display: 'inline-flex'
            }}
            title={tooltipMessage}
          >
            {isApprovingPazSalvo ? (
              <div className={`w-5 h-5 rounded-full border-2 border-t-transparent ${isDisabled ? 'border-[#6b7280]' : (theme === 'dark' ? 'border-[#4ade80]' : 'border-[#4D750F]')} animate-spin`} />
            ) : (
              <CheckCircleOutlineIcon />
            )}
          </IconButton>
          );
        }
      },
      {
        label: 'Desautorizar',
        render: (row: PazSalvo) => {
          // Determinar si hay una actualización pendiente
          const tieneActualizacionPendiente = row.es_actualizacion === true && (row.aprueba_actualizacion === null || row.aprueba_actualizacion === false);
          
          // Determinar si ya fue aprobado
          const yaFueAprobado = row.aprueba_actualizacion === true;
          
          // Determinar si el botón debe estar deshabilitado
          const isDisabled = isApprovingPazSalvo || !tieneActualizacionPendiente;
          
          // Determinar el mensaje del tooltip según la condición
          let tooltipMessage = "Rechazar paz y salvo";
          if (isApprovingPazSalvo) {
            tooltipMessage = "Procesando...";
          } else if (yaFueAprobado) {
            tooltipMessage = "Este paz y salvo fue aprobado";
          } else if (!tieneActualizacionPendiente) {
            tooltipMessage = "No hay actualización pendiente para rechazar";
          }
          
          return (
          <IconButton
            onClick={() => handleDeauthorizePazSalvo(row)}
            disabled={isDisabled}
            sx={{
              color: isDisabled ? '#6b7280' : (theme === 'dark' ? '#f87171' : '#dc2626'),
              '&.Mui-disabled': {
                color: '#6b7280 !important',
                opacity: 0.6,
              },
              '&:hover': {
                backgroundColor: isDisabled 
                  ? 'rgba(107, 114, 128, 0.1)'
                  : (theme === 'dark' ? 'rgba(248, 113, 113, 0.1)' : 'rgba(220, 38, 38, 0.1)'),
                opacity: isDisabled ? 0.6 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
              },
              opacity: isDisabled ? 0.6 : 1,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              display: 'inline-flex'
            }}
            title={tooltipMessage}
          >
            {isApprovingPazSalvo ? (
              <div className={`w-5 h-5 rounded-full border-2 border-t-transparent ${isDisabled ? 'border-[#6b7280]' : (theme === 'dark' ? 'border-[#f87171]' : 'border-[#dc2626]')} animate-spin`} />
            ) : (
              <CancelIcon />
            )}
          </IconButton>
          );
        }
      }
    ] : []),
    {
      label: 'Ver Detalle',
      render: (row: PazSalvo) => (
        <IconButton
          onClick={() => {
            setSelectedPazSalvoId(row.id || row.id_paz_y_salvo);
            setShowDetalleModal(true);
          }}
          sx={{
            color: theme === 'dark' ? '#fff' : '#4D750F',
            '&:hover': {
              backgroundColor: theme === 'dark'
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(77, 117, 15, 0.1)'
            }
          }}
          title="Ver detalle del paz y salvo"
        >
          <Visibility />
        </IconButton>
      )
    },
    // Mostrar "Ver Documento Online" para todos los usuarios (internos y externos)
    {
      label: 'Ver Documento Online',
      render: (row: PazSalvo) => (
        <IconButton
          onClick={() => handleOpenDocument(row)}
          sx={{
            color: theme === 'dark' ? '#fff' : '#4D750F',
            '&:hover': {
              backgroundColor: theme === 'dark'
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(77, 117, 15, 0.1)'
            }
          }}
          title="Ver documento en línea"
        >
          <FileDownload />
        </IconButton>
      )
    }
  ];

  // Manejar cambio de página
  const handlePageChange = (newPage: number) => {
    console.log(`[SearchPeace] - Cambiando página de ${currentPage} a ${newPage}, isInternal: ${isInternal}`);
    changePage(newPage, token || '', isInternal);
  };

  // Modificar useEffect para evitar alertas innecesarias
  useEffect(() => {
    // No hacer nada si no hay mensaje
    if (!alertMessage) return;
    
    // Lista de mensajes bloqueados que NUNCA deben mostrarse como alertas
    const mensajesBloqueados = [
      "SEÑOR(A) RECAUDOR(A)",
      "SEÑOR(A) RECAUDADOR(A)",
      "Buscando paz y salvos",
      "Actualización exitosa. Haga clic en Buscar",
      "Actualización exitosa"
    ];
    
    // Verificar si el mensaje debe ser bloqueado
    for (const fraseBloqueada of mensajesBloqueados) {
      if (alertMessage.includes(fraseBloqueada)) {
        console.log("[SearchPeace] - ❌ Mensaje BLOQUEADO:", alertMessage);
        // Ocultar inmediatamente la notificación
        setShowAlertNotification(false);
        return;
      }
    }
    
    // Lista de mensajes de operación que sí deben mostrarse
    const mensajesPermitidos = [
      "Autorizando paz y salvo",
      "Desautorizando paz y salvo",
      "autorizado correctamente",
      "desautorizado correctamente",
      "Abriendo documento en el navegador",
      "No se encontraron registros dentro del rango"
    ];
    
    // Verificar si es un mensaje permitido
    for (const frasePermitida of mensajesPermitidos) {
      if (alertMessage.includes(frasePermitida)) {
        console.log("[SearchPeace] - ✅ Mensaje de operación permitido:", alertMessage);
        return; // Permitir que se muestre
      }
    }
    
    // Para cualquier otro mensaje, verificar su origen
    console.log("[SearchPeace] - ⚠️ Mensaje no categorizado:", alertMessage);
    
    // Por defecto, permitir mensajes no categorizados
  }, [alertMessage, setShowAlertNotification]);
  
  // Modificar useEffect para limpiar timeouts al desmontar
  useEffect(() => {
    return () => {
      // Limpiar timeouts pendientes cuando el componente se desmonta
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
        requestTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Función adicional para limpiar bucles al iniciar la aplicación
  useEffect(() => {
    // Limpiar todas las notificaciones al montar el componente
    limpiarNotificacionesAntiguas();
    
    // Configurar un intervalo para limpiar notificaciones antiguas cada minuto
    const interval = setInterval(limpiarNotificacionesAntiguas, 60000);
    
    return () => {
      clearInterval(interval);
      // Asegurar que se limpien todas las notificaciones al desmontar
      setShowAlertNotification(false);
      setShowErrorAlert(false);
    };
  }, []);
  
  if (isLoadingForm) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[rgb(var(--green))]" />
      </div>
    );
  }

  if (formError) {
    return (
      <div className="w-full flex justify-center items-center p-8">
        <p className="text-lg text-red-600">Error: {formError}</p>
      </div>
    );
  }

  // Renderizado de la tabla de resultados
  const renderTablaResultados = () => {
    const dataWithDefaults = pazSalvos.map(item => ({
      ...item,
      // Asegurar que los campos existan, incluso con valores por defecto
      nombre_recaudador: item.nombre_recaudador || item.razon_social || 'N/A',
      documento_recaudador: item.documento_recaudador || (item.nro_doc_id ? String(item.nro_doc_id) : 'N/A'),
      nombre_tipo_doc_recaudador: item.nombre_tipo_doc_recaudador || 'N/A',
      razon_social_tercero: item.razon_social_tercero || 'N/A',
      nro_doc_tercero: item.nro_doc_tercero || (item.numero_documento_tercero ? String(item.numero_documento_tercero) : 'N/A'),
      // Formatear el tipo de documento de tercero (asegurando que sea un valor válido)
      id_tipo_doc_tercero_formatted: getTipoDocumentoNombre(item.id_tipo_doc_tercero || null),
      // Mantener el campo original para referencias internas
      id_tipo_doc_tercero: item.id_tipo_doc_tercero || null
    }));

    return (
      <div className="overflow-x-auto w-full">
        <DynamicTable
          columns={columns.map(col => 
            col.key === 'id_tipo_doc_tercero' 
              ? {...col, key: 'id_tipo_doc_tercero_formatted'} 
              : col
          )}
          data={dataWithDefaults}
          actions={actions}
          isLoading={isLoadingTable}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          downloadButtonPosition="top"
          fetchAllData={fetchAllDataForExcel}
        />
      </div>
    );
  };

  return (
    <div className="w-full max-w-full mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6">
      {/* Componentes de alertas */}
      <AlertError 
        isOpen={showErrorAlert} 
        onClose={() => setShowErrorAlert(false)} 
        message={errorAlertMessage} 
      />
      
      <AlertNotification
        isOpen={showAlertNotification}
        onClose={() => setShowAlertNotification(false)}
        notificationText={alertMessage}
      />
      
      <AlertLoader
        isOpen={isLoadingApproval}
        loadingText="Autorizando paz y salvo..."
      />
      
      {/* Modal de detalle de paz y salvo */}
      {selectedPazSalvoId && (
        <PazSalvoDetalleModal
          isOpen={showDetalleModal}
          onClose={() => setShowDetalleModal(false)}
          pazSalvoId={selectedPazSalvoId}
          token={token || ''}
        />
      )}
      
      {/* Modal de actualización de paz y salvo */}
      {selectedPazSalvoForUpdate && (
        <PazSalvoUpdateModal
          isOpen={showUpdateModal}
          onClose={() => {
            setShowUpdateModal(false);
            // Asegurar que no queden actualizaciones pendientes al cerrar el modal
            setIsUpdating(false);
            if (requestTimeoutRef.current) {
              clearTimeout(requestTimeoutRef.current);
              requestTimeoutRef.current = null;
            }
          }}
          pazSalvoId={selectedPazSalvoForUpdate}
          token={token || ''}
          onUpdateSuccess={handleUpdateSuccess}
          numeroPazSalvo={selectedPazSalvoNumber}
        />
      )}
      
      {/* Modal de rechazo de paz y salvo */}
      {selectedPazSalvoForRejection && (
        <PazSalvoRejectionModal
          isOpen={showRejectionModal}
          onClose={() => {
            setShowRejectionModal(false);
          }}
          pazSalvoId={selectedPazSalvoForRejection}
          onReject={handleRejectPazSalvo}
          pazSalvoNumber={selectedPazSalvoNumberForRejection}
        />
      )}
      
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'dark' : 'bg-white'}`}>
          <h3 className={` text-xl sm:text-2xl lg:text-3xl my-6 font-bold text-center ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
            CONSULTAR PAZ Y SALVO
          </h3>
          
          {/* Información del usuario - Condicional según tipo de usuario */}
          {isInternal ? (
            <InternalUserInfo onFoundCollector={handleFoundCollector} />
          ) : (
            <ExternalUserInfo />
          )}

          {/* Fechas de consulta (para ambos tipos de usuario) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <AnimatedInput
              label="Fecha Inicio"
              name="fechaInicio"
              type="date"
              value={formData.fechaInicio}
              onChange={handleInputChange}
              darkMode={theme === 'dark'}
            />

            <AnimatedInput
              label="Fecha Fin"
              name="fechaFinalizacion"
              type="date"
              value={formData.fechaFinalizacion}
              onChange={handleInputChange}
              darkMode={theme === 'dark'}
            />
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <Button
              onClick={handleSearch}
              title={isLoadingTable ? "Cargando..." : "Buscar"}
              disabled={isLoadingTable}
            />
            <Button
              onClick={handleClearSearch}
              title="Limpiar"
              disabled={isLoadingTable}
            />
            <Button
              onClick={() => router.push('/recaudadores/consulta_documentos_pagos')}
              title="Generar Paz Y Salvo"
              disabled={isLoadingTable}
            />
            <Button
              onClick={() => router.push('/')}
              title="Salir"
            />
          </div>
        </div>
    
          <div className="flex w-full items-center justify-center">
            <div className="w-full p-1">
                <div className={`rounded-xl p-2 sm:p-4 ${theme === 'dark' ? 'dark' : 'bg-white'} relative mt-4`}>
                  <div className="relative flex flex-col justify-center items-center mt-[10px]">
                    <h3 className={`text-center  text-xl sm:text-2xl lg:text-3xl mt-6 font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                      RESULTADOS DE PAZ Y SALVOS
                    </h3>
                  </div>

                  <div className="mt-4 sm:mt-6 overflow-x-auto">
                    {isLoadingTable ? (
                      <div className="flex justify-center items-center p-4 sm:p-8">
                        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-[#78390e]"></div>
                        <span className="ml-2 text-[#78390e]">Cargando...</span>
                      </div>
                    ) : (
                      renderTablaResultados()
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>
  );
};

export default SearchPeace;
