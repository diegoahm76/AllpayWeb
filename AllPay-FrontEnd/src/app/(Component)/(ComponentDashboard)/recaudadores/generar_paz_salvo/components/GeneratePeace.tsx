'use client';
import React, { useState, useEffect, useReducer, useRef } from 'react';
import { useTheme } from 'next-themes';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { useTiposPazSalvo } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_paz_salvo/hooks/useTiposPazSalvo';
import { useSession, signIn } from 'next-auth/react';
import { usePuertosExportacion } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_paz_salvo/hooks/usePuertosExportacion';
import { useTiposDocumento } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_paz_salvo/hooks/useTiposDocumento';
import { useRouter } from 'next/navigation';
import { useRecaudadorPazSalvo } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_paz_salvo/hooks/useRecaudadorPazSalvo';
import { useGenerarPazSalvo } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_paz_salvo/hooks/useGenerarPazSalvo';
import { useFacturasSeleccionadas } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_paz_salvo/hooks/useFacturasSeleccionadas';
import { FacturaSeleccionada } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_paz_salvo/models/facturas.seleccionadas.model';
import { useConsecutivoPazSalvo } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_paz_salvo/hooks/useConsecutivoPazSalvo';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertQuestion from '@/presenters/components/recaudadores/AlertQuestion';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
import { formatNumberWithCommas } from '@/utils/formatters';

interface FacturaMapeada {
  id: number;
  fecha_registro_factura: string;
  numero_factura_unica: string;
  departamento: string;
  municipio: string;
  nit_proveedor: string;
  fecha_compra: string;
  kilos_reportados: number;
  kilos_certificados: number;
  precio_kilo: number;
  cuota_fomento: number;
  fecha_pago: string;
  kilos_paz_salvo: number;
  kilos_para_reportar: number;
}

// Definición del estado inicial y reducer para manejar el estado de manera más controlada
interface PazSalvoState {
  facturasFormateadas: FacturaMapeada[];
  kilosParaReportar: Record<number, number>;
  formData: {
    pazSalvo: string;
    fechaGeneracion: string;
    tipoPazSalvo: string;
    puertoExportacion: string;
    razonSocial: string;
    documentoIdentificacion: string;
    tipoDocumento: string;
    totalKilos: string;
    personaGenera: number;
    numDocId: string;
    docPazSalvo: number;
  };
  documentFieldsDisabled: boolean;
  razonSocialFieldDisabled: boolean;
}

type PazSalvoAction = 
  | { type: 'INIT_FACTURAS', payload: FacturaMapeada[] }
  | { type: 'INIT_KILOS', payload: Record<number, number> }
  | { type: 'UPDATE_KILOS', payload: { id: number, value: number } }
  | { type: 'UPDATE_FORM_FIELD', payload: { fieldName: string, value: string | number } }
  | { type: 'SET_DOC_FIELDS_DISABLED', payload: boolean }
  | { type: 'SET_RAZON_SOCIAL_DISABLED', payload: boolean }
  | { type: 'UPDATE_TOTAL_KILOS', payload: string }
  | { type: 'RESET_FORM' }
  | { type: 'UPDATE_RECAUDADOR_DATA', payload: any };

function pazSalvoReducer(state: PazSalvoState, action: PazSalvoAction): PazSalvoState {
  switch (action.type) {
    case 'INIT_FACTURAS':
      return {
        ...state,
        facturasFormateadas: action.payload
      };
    case 'INIT_KILOS':
      return {
        ...state,
        kilosParaReportar: action.payload,
        formData: {
          ...state.formData,
          totalKilos: Object.values(action.payload).reduce((sum, val) => sum + val, 0).toString()
        }
      };
    case 'UPDATE_KILOS': {
      const newKilos = { 
        ...state.kilosParaReportar, 
        [action.payload.id]: action.payload.value 
      };
      // Calcular el total de kilos inmediatamente
      const totalKilos = Object.values(newKilos).reduce((sum, val) => sum + val, 0);
      
      return {
        ...state,
        kilosParaReportar: newKilos,
        formData: {
          ...state.formData,
          totalKilos: totalKilos.toString()
        }
      };
    }
    case 'UPDATE_FORM_FIELD': {
      const { fieldName, value } = action.payload;
      
      // Si se intenta actualizar fechaGeneracion, siempre usar la fecha actual
      if (fieldName === 'fechaGeneracion') {
        action.payload.value = new Date().toISOString().split('T')[0];
      }
      
      const newState = {
        ...state,
        formData: {
          ...state.formData,
          [fieldName]: value
        }
      };
      
      // Si cambia el tipo de paz y salvo, actualizar el estado de los campos deshabilitados
      // y limpiar los campos según corresponda
      if (fieldName === 'tipoPazSalvo') {
        // LÓGICA:
        // - Para PT (PAZ Y SALVO DE EXPORTACION A NOMBRE DE TERCERO):
        //   * Los campos de tipo de documento, doc. de identificación y razón social SÍ son editables
        //   * El usuario debe completar los datos del tercero
        // - Para PV (PAZ Y SALVO DE VENTA NACIONAL):
        //   * Los campos de tipo de documento, doc. de identificación y razón social SÍ son editables
        //   * El usuario debe completar los datos del comprador nacional
        // - Para otros tipos (propio):
        //   * Los campos NO son editables (muestran datos del recaudador)
        const isPTorPV = value === 'PT' || value === 'PV';
        newState.documentFieldsDisabled = !isPTorPV; // Habilitar cuando es PT o PV
        newState.razonSocialFieldDisabled = !isPTorPV; // Habilitar cuando es PT o PV
        
        if (isPTorPV) {
          // Si es PT o PV:
          // - Limpiar los campos para que el usuario los complete
          newState.formData = {
            ...newState.formData,
            tipoDocumento: '',
            documentoIdentificacion: '',
            razonSocial: ''
          };
        } else {
          // Si es otro tipo (propio):
          // - Usar datos del recaudador (no editables)
          if (state.formData.numDocId) {
            newState.formData = {
              ...newState.formData,
              tipoDocumento: state.formData.tipoDocumento || '',
              documentoIdentificacion: state.formData.numDocId || '',
              razonSocial: state.formData.razonSocial || ''
            };
          }
        }
      }
      
      return newState;
    }
    case 'SET_DOC_FIELDS_DISABLED':
      return {
        ...state,
        documentFieldsDisabled: action.payload
      };
    case 'SET_RAZON_SOCIAL_DISABLED':
      return {
        ...state,
        razonSocialFieldDisabled: action.payload
      };
    case 'UPDATE_TOTAL_KILOS':
      return {
        ...state,
        formData: {
          ...state.formData,
          totalKilos: action.payload
        }
      };
    case 'RESET_FORM':
      return {
        ...state,
        formData: {
          ...state.formData,
          puertoExportacion: '',
          totalKilos: ''
        }
      };
    case 'UPDATE_RECAUDADOR_DATA': {
      const recaudadorData = action.payload;
      
      if (!recaudadorData) return state;
      
      // Determinar si debemos usar razon_social o nombre_recaudador
      const esNIT = recaudadorData.tipo_documento === 'NT';
      const nombreParaMostrar = esNIT 
        ? recaudadorData.razon_social 
        : recaudadorData.nombre_recaudador;
          
      const newState = {
        ...state,
        formData: {
          ...state.formData,
          razonSocial: nombreParaMostrar || '',
          numDocId: recaudadorData.numero_documento || '',
          documentoIdentificacion: recaudadorData.numero_documento || '',
          tipoDocumento: recaudadorData.tipo_documento || '',
          personaGenera: recaudadorData.id_persona || 0
        }
      };
      
      return newState;
    }
    default:
      return state;
  }
}

const GeneratePeace: React.FC = () => {
  const { theme } = useTheme();
  const router = useRouter();
  
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    },
  });

  const token = (session as any)?.user?.tokens?.access;

  // Estado para almacenar los IDs de facturas seleccionadas
  const [idsFacturasSeleccionadas, setIdsFacturasSeleccionadas] = useState<number[]>([]);
  // Referencia para comparar IDs anteriores y evitar actualizaciones innecesarias
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  // Referencia para el timeout de seguridad
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Estado para el manejo de AlertError
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Estados para las alertas
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showLoaderAlert, setShowLoaderAlert] = useState(false);
  const [showQuestionAlert, setShowQuestionAlert] = useState(false);
  const [questionMessage, setQuestionMessage] = useState('');
  const [questionCallback, setQuestionCallback] = useState<() => void>(() => {});
  // Estado para controlar si se ha verificado localStorage
  const [facturasVerificadas, setFacturasVerificadas] = useState(false);
  const [facturasExisten, setFacturasExisten] = useState(false);
  
  // Estado para la etiqueta dinámica de razón social/nombre completo
  const [razonSocialLabel, setRazonSocialLabel] = useState("Razón Social");

  // Códigos para tipos de paz y salvo
  const PAZ_SALVO_EXPORTACION_TERCERO = 'PT';
  const PAZ_SALVO_VENTA_NACIONAL = 'PV';

  // Inicializar el estado con useReducer para manejar toda la lógica de actualización
  const initialState: PazSalvoState = {
    facturasFormateadas: [],
    kilosParaReportar: {},
    formData: {
      pazSalvo: '',
      fechaGeneracion: new Date().toISOString().split('T')[0],
      tipoPazSalvo: '',
      puertoExportacion: '',
      razonSocial: '',
      documentoIdentificacion: '',
      tipoDocumento: '',
      totalKilos: '',
      personaGenera: 0,
      numDocId: '',
      docPazSalvo: 0
    },
    documentFieldsDisabled: true,
    razonSocialFieldDisabled: true  // Nuevo campo para controlar si razón social está deshabilitada
  };

  const [state, dispatch] = useReducer(pazSalvoReducer, initialState);
  const { facturasFormateadas, kilosParaReportar, formData, documentFieldsDisabled, razonSocialFieldDisabled } = state;
  const isVentaNacional = formData.tipoPazSalvo === PAZ_SALVO_VENTA_NACIONAL;

  // Estado para mantener valores temporales de input mientras el usuario escribe
  const [tempKilosInput, setTempKilosInput] = useState<Record<number, string>>({});

  // Hooks para cargar datos
  const { tiposDocumentoParaSelect, tiposDocumento, isLoading: loadingDocumentos, error: errorDocumentos } = useTiposDocumento(token);
  const { puertosParaSelect, isLoading: loadingPuertos, error: errorPuertos } = usePuertosExportacion(token);
  const { tiposPazSalvo, isLoading: loadingTipos, error: errorTipos } = useTiposPazSalvo(token);
  const { recaudadorData, isLoading: isLoadingRecaudador } = useRecaudadorPazSalvo(token);
  
  // Hook para obtener el consecutivo del paz y salvo
  const { 
    isLoading: isLoadingConsecutivo, 
    error: errorConsecutivo 
  } = useConsecutivoPazSalvo({
    onSuccess: (consecutivo) => {
      dispatch({ 
        type: 'UPDATE_FORM_FIELD', 
        payload: { fieldName: 'pazSalvo', value: consecutivo } 
      });
    },
    onError: (error) => {
      setErrorMessage(`Error al obtener el consecutivo del paz y salvo: ${error}`);
      setShowError(true);
    }
  });
  
  // Hook para obtener datos detallados de las facturas seleccionadas
  const { 
    facturas: facturasSeleccionadas, 
    isLoading: isLoadingFacturas,
    error: errorFacturas,
    refetch: refetchFacturas
  } = useFacturasSeleccionadas({
    token,
    idsFacturas: idsFacturasSeleccionadas,
    onSuccess: (facturas) => {
      
      if (facturas.length === 0) {
        showErrorAlert('No se pudieron recuperar datos de las facturas seleccionadas.', () => {
          router.push('/recaudadores/consultar_cuotas_pagadas');
        });
        return;
      }
      
      // Mapear facturas al formato de la tabla cuando se obtienen con éxito
      try {
        // Mapear las facturas al formato para la tabla
        const facturasMapeadas = facturas.map(factura => {
          // Inicializar los valores de kilos para reportar
          return mapFacturaToTableFormat(factura, {});
        });
        
        // Inicializar los kilos para reportar
        const initialKilos: Record<number, number> = {};
        facturas.forEach(factura => {
          // Calcular los kilos disponibles basándose en kilos certificados
          const kilosCertificados = factura.total_kilos_certificados || 0;
          const kilosYaEnPazSalvo = factura.kilos_paz_y_salvo || 0;
          const kilosDisponibles = kilosCertificados - kilosYaEnPazSalvo;
          
          // Usar los kilos disponibles como valor inicial
          initialKilos[factura.id_factura_unica] = kilosDisponibles;
        });
        
        // Actualizar los estados usando el reducer en un solo dispatch
        dispatch({ type: 'INIT_FACTURAS', payload: facturasMapeadas });
        dispatch({ type: 'INIT_KILOS', payload: initialKilos });
        
        // Ocultar el loader una vez que se han cargado las facturas
        setShowLoaderAlert(false);
      } catch (err) {
        console.error('Error al mapear facturas:', err);
        showConfirmQuestion('Ocurrió un error al procesar los datos de las facturas. ¿Desea reintentar?', () => {
          setShowQuestionAlert(false);
          refetchFacturas();
        });
      }
    },
    onError: (msg) => {
      showConfirmQuestion(`Error al cargar las facturas seleccionadas: ${msg}. ¿Desea reintentar?`, () => {
        setShowQuestionAlert(false);
        refetchFacturas();
      });
    }
  });
  

  // Hook para generar paz y salvo
  const { 
    generarPazSalvo, 
    isLoading: isGenerando
  } = useGenerarPazSalvo({
    onSuccess: (data) => {
      setShowLoaderAlert(false);
      setSuccessMessage(`Se ha generado el paz y salvo N° ${data.nro_paz_y_salvo} correctamente.`);
      setShowSuccessAlert(true);
      
      // Limpiar localStorage al generar el paz y salvo
      localStorage.removeItem('facturasSeleccionadasPazSalvo');
      // Redirigir después de que el usuario cierre la alerta
    },
    onError: (msg) => {
      setShowLoaderAlert(false);
      setErrorMessage(msg);
      setShowError(true);
    }
  });

  // Limpiar timeouts al desmontar el componente
  useEffect(() => {
    return () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
    };
  }, []);

  // Verificar si hay facturas seleccionadas y cargar sus IDs
  useEffect(() => {
    // Evitar múltiples verificaciones usando una bandera
    if (facturasVerificadas) {
      return;
    }
    
    const facturasSeleccionadasJson = localStorage.getItem('facturasSeleccionadasPazSalvo');
    
    // Marcar como verificado inmediatamente para evitar múltiples ejecuciones
    setFacturasVerificadas(true);
    
    // Manejar caso donde no existen facturas en localStorage
    if (!facturasSeleccionadasJson) {
      console.error('No se encontraron facturas seleccionadas en localStorage');
      setErrorMessage('No se encontraron facturas seleccionadas para generar el paz y salvo.');
      setShowError(true);
      setFacturasExisten(false);
      // Ocultar loader si se está mostrando
      setShowLoaderAlert(false);
      // Usar una referencia mutable para almacenar la función de redireccionamiento
      // en lugar de crear una función en cada render
      setQuestionCallback(() => () => {
        router.push('/recaudadores/consultar_cuotas_pagadas');
      });
      return;
    }

    try {
      const facturas = JSON.parse(facturasSeleccionadasJson);
      
      // Guardar una copia del objeto facturas original para depuración
      localStorage.setItem('facturasSeleccionadasPazSalvo_debug', JSON.stringify({
        timestamp: new Date().toISOString(),
        facturas
      }));
      
      // Validar que facturas sea un array y no esté vacío
      if (!Array.isArray(facturas) || facturas.length === 0) {
        console.error('No se encontraron facturas válidas en localStorage');
        setErrorMessage('No se encontraron facturas válidas.');
        setShowError(true);
        setFacturasExisten(false);
        // Ocultar loader si se está mostrando
        setShowLoaderAlert(false);
        setQuestionCallback(() => () => {
          router.push('/recaudadores/consultar_cuotas_pagadas');
        });
        return;
      }
      
      // Validar que cada factura tenga un ID válido y mostrar más información de debug
      let facturasValidas = 0;
      let facturasInvalidas = 0;
      
      // CORRECCIÓN: Extraer correctamente los IDs de las facturas seleccionadas
      const ids = facturas
        .map((factura: any, index: number) => {
          // Corregir la extracción del ID para soportar diferentes estructuras de datos
          let id = null;
          if (factura && typeof factura.id_factura_unica === 'number' && factura.id_factura_unica > 0) {
            id = factura.id_factura_unica;
          } else if (factura && typeof factura.id === 'number' && factura.id > 0) {
            id = factura.id;
          }
          
          if (id) {
            facturasValidas++;
            return id;
          } else {
            facturasInvalidas++;
            console.error(`Factura inválida en posición ${index}:`, factura);
            console.error('Propiedades disponibles:', Object.keys(factura).join(', '));
            return null;
          }
        })
        .filter(Boolean) as number[]; // Filtrar valores nulos
      
      if (ids.length === 0) {
        console.error('No se encontraron IDs de facturas válidos');
        setErrorMessage('No se encontraron IDs de facturas válidos.');
        setShowError(true);
        setFacturasExisten(false);
        // Ocultar loader si se está mostrando
        setShowLoaderAlert(false);
        setQuestionCallback(() => () => {
          router.push('/recaudadores/consultar_cuotas_pagadas');
        });
        return;
      }
      
      // Si llegamos aquí, hay facturas válidas
      setFacturasExisten(true);
      
      // Iniciar la carga de datos con los IDs válidos
      setIdsFacturasSeleccionadas(ids);
      
      // Mostrar un indicador de carga solo cuando estamos iniciando la consulta
      setShowLoaderAlert(true);
      
      // Configurar un timeout de seguridad para ocultar el loader después de 10 segundos
      // incluso si las facturas no se cargan por alguna razón
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
      
      safetyTimeoutRef.current = setTimeout(() => {
        setShowLoaderAlert(false);
        // Mostrar un mensaje amigable si después de 10 segundos no hay facturas
        if (facturasFormateadas.length === 0) {
          setErrorMessage('Estamos teniendo problemas para cargar los datos. Por favor, intente nuevamente.');
          setShowError(true);
        }
      }, 10000); // 10 segundos de espera máxima
      
    } catch (error) {
      console.error('Error al procesar las facturas del localStorage:', error);
      setErrorMessage('Error al procesar las facturas seleccionadas. Por favor, inténtelo de nuevo.');
      setShowError(true);
      setFacturasExisten(false);
      // Ocultar loader si se está mostrando
      setShowLoaderAlert(false);
      setQuestionCallback(() => () => {
        router.push('/recaudadores/consultar_cuotas_pagadas');
      });
    }
  }, [router, facturasVerificadas]);

  // Efecto para actualizar los datos del recaudador cuando se cargan
  useEffect(() => {
    if (recaudadorData) {
      dispatch({ 
        type: 'UPDATE_RECAUDADOR_DATA', 
        payload: recaudadorData 
      });
      
      // Si ya hay un tipo de paz y salvo seleccionado que no es PT, actualizar los campos con los datos del recaudador
      if (formData.tipoPazSalvo && formData.tipoPazSalvo !== PAZ_SALVO_EXPORTACION_TERCERO) {
        dispatch({ 
          type: 'UPDATE_FORM_FIELD', 
          payload: { 
            fieldName: 'documentoIdentificacion', 
            value: recaudadorData.numero_documento || '' 
          } 
        });
        
        dispatch({ 
          type: 'UPDATE_FORM_FIELD', 
          payload: { 
            fieldName: 'tipoDocumento', 
            value: recaudadorData.tipo_documento || '' 
          } 
        });
        
        dispatch({ 
          type: 'UPDATE_FORM_FIELD', 
          payload: { 
            fieldName: 'razonSocial', 
            value: recaudadorData.razon_social || '' 
          } 
        });
      }
    }
  }, [recaudadorData, formData.tipoPazSalvo, PAZ_SALVO_EXPORTACION_TERCERO]);

  // Efecto adicional para establecer la razón social cuando se cargan los datos del recaudador
  useEffect(() => {
    if (recaudadorData) {
      
      // Determinar si debemos usar razon_social o nombre_recaudador
      const esNIT = recaudadorData.tipo_documento === 'NT';
      const nombreParaMostrar = esNIT 
        ? recaudadorData.razon_social 
        : recaudadorData.nombre_recaudador;

      
      // Establecer la razón social si hay datos disponibles
      if (nombreParaMostrar) {
        dispatch({ 
          type: 'UPDATE_FORM_FIELD', 
          payload: { 
            fieldName: 'razonSocial', 
            value: nombreParaMostrar 
          } 
        });
        
        // Actualizar la etiqueta del campo razonSocial según el tipo de documento
        setRazonSocialLabel(esNIT ? "Razón Social" : "Nombre Completo");
      }
    }
  }, [recaudadorData]);

  // Efecto para manejar cambios en el tipo de paz y salvo
  useEffect(() => {
    // No hacer nada si no tenemos datos del recaudador
    if (!recaudadorData) return;
    
    const isPTorPV = formData.tipoPazSalvo === PAZ_SALVO_EXPORTACION_TERCERO || 
                     formData.tipoPazSalvo === PAZ_SALVO_VENTA_NACIONAL;
    
    // Configurar el estado de los campos según el tipo
    dispatch({ 
      type: 'SET_DOC_FIELDS_DISABLED', 
      payload: !isPTorPV  // Campos habilitados para PT o PV, deshabilitados para otros
    });
    
    dispatch({ 
      type: 'SET_RAZON_SOCIAL_DISABLED', 
      payload: !isPTorPV  // Campo habilitado para PT o PV, deshabilitado para otros
    });
    
    if (!isPTorPV) {
      // Si NO es PT ni PV (solo propio), usar datos del recaudador
      dispatch({ 
        type: 'UPDATE_FORM_FIELD', 
        payload: { 
          fieldName: 'documentoIdentificacion', 
          value: recaudadorData.numero_documento || '' 
        } 
      });
      
      dispatch({ 
        type: 'UPDATE_FORM_FIELD', 
        payload: { 
          fieldName: 'tipoDocumento', 
          value: recaudadorData.tipo_documento || '' 
        } 
      });
      
      // Determinar si debemos usar razon_social o nombre_recaudador
      const esNIT = recaudadorData.tipo_documento === 'NT';
      const nombreParaMostrar = esNIT 
        ? recaudadorData.razon_social 
        : recaudadorData.nombre_recaudador;
      
      dispatch({ 
        type: 'UPDATE_FORM_FIELD', 
        payload: { 
          fieldName: 'razonSocial', 
          value: nombreParaMostrar || '' 
        } 
      });
      
      // Actualizar la etiqueta del campo razonSocial según el tipo de documento
      setRazonSocialLabel(esNIT ? "Razón Social" : "Nombre Completo");
    } else {
      // Si es PT o PV, limpiar los campos para que el usuario los complete
      dispatch({ 
        type: 'UPDATE_FORM_FIELD', 
        payload: { fieldName: 'documentoIdentificacion', value: '' } 
      });
      
      dispatch({ 
        type: 'UPDATE_FORM_FIELD', 
        payload: { fieldName: 'tipoDocumento', value: '' } 
      });
      
      dispatch({ 
        type: 'UPDATE_FORM_FIELD', 
        payload: { fieldName: 'razonSocial', value: '' } 
      });
      
      // La etiqueta se manejará en otro useEffect basado en el tipo de documento
    }
  }, [formData.tipoPazSalvo, recaudadorData, PAZ_SALVO_EXPORTACION_TERCERO, PAZ_SALVO_VENTA_NACIONAL]);

  // Nuevo useEffect para manejar el cambio de la etiqueta según el tipo de documento
  useEffect(() => {
    // Solo aplicar para paz y salvos de exportación a nombre de tercero o venta nacional
    const isPTorPV = formData.tipoPazSalvo === PAZ_SALVO_EXPORTACION_TERCERO || 
                     formData.tipoPazSalvo === PAZ_SALVO_VENTA_NACIONAL;
    
    if (isPTorPV) {
      // Si es NIT (código NT), mostrar "Razón Social"
      if (formData.tipoDocumento === 'NT') {
        setRazonSocialLabel("Razón Social");
      } else if (formData.tipoDocumento) {
        // Para cualquier otro tipo de documento, mostrar "Nombre Completo"
        setRazonSocialLabel("Nombre Completo");
      } else {
        // Si no hay tipo de documento seleccionado, usar "Razón Social" por defecto
        setRazonSocialLabel("Razón Social");
      }
    } else if (recaudadorData) {
      // Para otros tipos de paz y salvo, mostrar según el tipo de documento del recaudador
      const esNIT = recaudadorData.tipo_documento === 'NT';
      setRazonSocialLabel(esNIT ? "Razón Social" : "Nombre Completo");
    } else {
      // Si no hay datos de recaudador, usar "Razón Social" por defecto
      setRazonSocialLabel("Razón Social");
    }
  }, [formData.tipoDocumento, formData.tipoPazSalvo, PAZ_SALVO_EXPORTACION_TERCERO, PAZ_SALVO_VENTA_NACIONAL, recaudadorData]);

  // Convertir factura a formato de tabla
  const mapFacturaToTableFormat = (factura: FacturaSeleccionada, kilosSource: Record<number, number>): FacturaMapeada => {
    if (!factura) {
      console.error('Factura inválida para mapear:', factura);
      return {
        id: 0,
        fecha_registro_factura: '',
        numero_factura_unica: '',
        departamento: '-',
        municipio: '-',
        nit_proveedor: '-',
        fecha_compra: '',
        kilos_reportados: 0,
        kilos_certificados: 0,
        precio_kilo: 0,
        cuota_fomento: 0,
        fecha_pago: '',
        kilos_paz_salvo: 0,
        kilos_para_reportar: 0
      };
    }
    
    // Calcular los kilos certificados y los ya utilizados para paz y salvo
    const kilosTotales = factura.total_kilos || 0;
    const kilosCertificados = factura.total_kilos_certificados || 0;
    const kilosYaEnPazSalvo = factura.kilos_paz_y_salvo || 0;
    
    // Calcular los kilos disponibles como la diferencia entre kilos certificados y kilos ya usados
    const kilosDisponibles = kilosCertificados - kilosYaEnPazSalvo;
    
    // Log para depuración
    
    // Determinar valor inicial para kilos para reportar - usar kilos disponibles como valor por defecto
    let initialKilosParaReportar = kilosDisponibles;
    
    // Si hay un valor personalizado en kilosSource, usarlo (siempre que no exceda el disponible)
    if (kilosSource[factura.id_factura_unica] !== undefined) {
      initialKilosParaReportar = Math.min(kilosSource[factura.id_factura_unica], kilosDisponibles);
    } 
    // Si hay un valor en el estado, usarlo (siempre que no exceda el disponible)
    else if (kilosParaReportar[factura.id_factura_unica] !== undefined) {
      initialKilosParaReportar = Math.min(kilosParaReportar[factura.id_factura_unica], kilosDisponibles);
    }

    
    return {
      id: factura.id_factura_unica,
      fecha_registro_factura: factura.fecha_creacion,
      numero_factura_unica: factura.nro_factura_unica?.toString() || '',
      departamento: factura.nombre_departamento || '-',
      municipio: factura.nombre_municipio || '-',
      nit_proveedor: factura.nit_proveedor || '-',
      fecha_compra: factura.fecha_compra,
      kilos_reportados: kilosTotales,
      kilos_certificados: kilosCertificados,
      precio_kilo: factura.precio_kilo || 0,
      cuota_fomento: parseFloat(factura.cuota_fomento || '0'),
      fecha_pago: factura.fecha_pago || factura.fecha_creacion || '',
      kilos_paz_salvo: kilosYaEnPazSalvo,
      kilos_para_reportar: initialKilosParaReportar
    };
  };

  // Manejador de cambios en los campos de formulario usando el reducer
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // No permitir cambios en el campo fechaGeneracion
    if (name === 'fechaGeneracion') return;
    
    dispatch({ 
      type: 'UPDATE_FORM_FIELD', 
      payload: { fieldName: name, value } 
    });
  };

  // Función para parsear el valor formateado del input (con puntos de miles y coma decimal)
  // ENTRADA: "1.000,5" (formato visual colombiano)
  // SALIDA: 1000.5 (número JavaScript con punto decimal)
  // Al enviar al API, JavaScript serializa automáticamente con punto decimal
  const parseKilosInput = (value: string): number => {
    if (!value) return 0;
    // Remover puntos de miles y convertir coma decimal a punto
    const sanitized = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(sanitized) || 0;
  };

  // Manejador para actualizar kilos para reportar
  const handleKilosChange = (id: number, value: string) => {
    // Permitir solo números, comas y puntos
    let sanitizedValue = value.replace(/[^0-9.,]/g, '');
    
    // Permitir solo una coma en el valor
    const commaCount = (sanitizedValue.match(/,/g) || []).length;
    if (commaCount > 1) {
      return; // No permitir más de una coma
    }
    
    // Limitar a máximo 2 dígitos después de la coma (si existe y no es el último carácter)
    const commaIndex = sanitizedValue.indexOf(',');
    if (commaIndex !== -1 && !sanitizedValue.endsWith(',')) {
      const integerWithSeparators = sanitizedValue.slice(0, commaIndex); // conserva puntos de miles
      const decimalsRaw = sanitizedValue.slice(commaIndex + 1).replace(/[^0-9]/g, '');
      const decimalsLimited = decimalsRaw.slice(0, 2);
      sanitizedValue = `${integerWithSeparators},${decimalsLimited}`;
    }
    
    // Guardar el valor temporal mientras el usuario escribe
    setTempKilosInput(prev => ({
      ...prev,
      [id]: sanitizedValue
    }));
    
    // Si el valor está vacío, actualizar a 0
    if (sanitizedValue === '') {
      dispatch({ 
        type: 'UPDATE_KILOS', 
        payload: { id, value: 0 } 
      });
      return;
    }
    
    // Si termina con coma, permitir que el usuario continúe escribiendo
    if (sanitizedValue.endsWith(',')) {
      return;
    }
    
    // Intentar parsear el valor
    const numericValue = parseKilosInput(sanitizedValue);
    
    // Si no es un número válido, no actualizar
    if (isNaN(numericValue)) {
      return;
    }
    
    // Permitir 0 pero no valores negativos
    if (numericValue < 0) {
      return;
    }
    
    // Actualizar el valor (permitir exceder temporalmente, validar en blur)
    dispatch({ 
      type: 'UPDATE_KILOS', 
      payload: { id, value: numericValue } 
    });
  };

  // Manejar el input blur para validar y formatear
  const handleKilosBlur = (id: number, value: string) => {
    // Limpiar el valor temporal
    setTempKilosInput(prev => {
      const newTemp = { ...prev };
      delete newTemp[id];
      return newTemp;
    });
    
    if (value === '' || value === ',') {
      dispatch({ 
        type: 'UPDATE_KILOS', 
        payload: { id, value: 0 } 
      });
      return;
    }
    
    const numericValue = parseKilosInput(value);
    
    if (isNaN(numericValue)) {
      setErrorMessage('Por favor ingrese un número válido');
      setShowError(true);
      dispatch({ 
        type: 'UPDATE_KILOS', 
        payload: { id, value: 0 } 
      });
      return;
    }
    
    if (numericValue < 0) {
      setErrorMessage('El valor no puede ser negativo');
      setShowError(true);
      dispatch({ 
        type: 'UPDATE_KILOS', 
        payload: { id, value: 0 } 
      });
      return;
    }
    
    // Verificar límite de kilos disponibles
    const factura = facturasSeleccionadas.find(f => f.id_factura_unica === id);
    if (factura) {
      const kilosCertificados = factura.total_kilos_certificados || 0;
      const kilosYaEnPazSalvo = factura.kilos_paz_y_salvo || 0;
      const kilosDisponibles = kilosCertificados - kilosYaEnPazSalvo;
      
      if (numericValue > kilosDisponibles) {
        setErrorMessage(`No puede reportar más de ${formatNumberWithCommas(kilosDisponibles.toString())} kilos disponibles`);
        setShowError(true);
        dispatch({ 
          type: 'UPDATE_KILOS', 
          payload: { id, value: kilosDisponibles } 
        });
        return;
      }
      
      dispatch({ 
        type: 'UPDATE_KILOS', 
        payload: { id, value: numericValue } 
      });
    }
  };

  // Manejador para enviar el formulario
  const handleGenerarPazSalvo = async () => {
    // Validar campos requeridos
    const camposRequeridos = [
      { campo: 'tipoPazSalvo', nombre: 'Tipo de Paz y Salvo' },
      { campo: 'razonSocial', nombre: razonSocialLabel }
    ];
    if (!isVentaNacional) {
      camposRequeridos.push({ campo: 'puertoExportacion', nombre: 'Puerto de Exportación' });
    }
    
    // LÓGICA:
    // - Para PT (PAZ Y SALVO DE EXPORTACION A NOMBRE DE TERCERO):
    //   * Los campos de tipo de documento, doc. de identificación y razón social SÍ son editables
    //   * El usuario debe ingresar los datos del tercero
    // - Para PV (PAZ Y SALVO DE VENTA NACIONAL):
    //   * Los campos de tipo de documento, doc. de identificación y nombre completo SÍ son editables
    //   * El usuario debe ingresar los datos del comprador nacional
    // - Para otros tipos (propio):
    //   * Los campos NO son editables (muestran datos del recaudador)
    
    // Para cualquier tipo, todos estos campos son requeridos
    camposRequeridos.push(
      { campo: 'tipoDocumento', nombre: 'Tipo de Documento' },
      { campo: 'documentoIdentificacion', nombre: 'Número de Documento' }
    );
    
    const camposFaltantes = camposRequeridos
      .filter(({ campo }) => !formData[campo as keyof typeof formData])
      .map(({ nombre }) => nombre);
    
    if (camposFaltantes.length > 0) {
      const mensaje = `Por favor, complete los siguientes campos:\n${camposFaltantes.map(c => `- ${c}`).join('\n')}`;
      showErrorAlert(mensaje);
      return;
    }
    
    // Verificar que al menos una factura tiene kilos para reportar
    const hayKilosParaReportar = Object.values(kilosParaReportar).some(valor => valor > 0);
    if (!hayKilosParaReportar) {
      showErrorAlert('Debe ingresar una cantidad mayor a cero en al menos una factura para generar el paz y salvo');
      return;
    }
    
    // Preparar las facturas con sus kilos para reportar
    const facturasParaEnviar = facturasSeleccionadas
      .filter(factura => {
        // Obtener los kilos para reportar para esta factura
        const kilos = kilosParaReportar[factura.id_factura_unica] || 0;
        // Solo incluir facturas que tengan kilos mayores a cero
        return kilos > 0;
      })
      .map(factura => {
        // Los kilos se envían como número, JavaScript los serializa con punto decimal
        const kilosReportar = Number(kilosParaReportar[factura.id_factura_unica]) || 0;
        return {
          id_factura: factura.id_factura_unica,
          kilos_reportar: Number(kilosReportar.toFixed(2)) // Asegurar 2 decimales y formato numérico
        };
      });
    
    console.log('Facturas para enviar al API:', facturasParaEnviar);
    console.log('Formato JSON (como se enviará):', JSON.stringify(facturasParaEnviar, null, 2));
    
    if (facturasParaEnviar.length === 0) {
      showErrorAlert('Debe ingresar una cantidad mayor a cero en al menos una factura para generar el paz y salvo');
      return;
    }
    
    // Mostrar alerta de confirmación antes de continuar
    const mensajeConfirmacion = `
Esta acción de generar el paz y salvo de la cuota de fomento cacaotero es inmodificable, cruza saldos y afecta la disponibilidad de los kilos de cacao reportados disponibles.

¿Estás Seguro?`;

    showConfirmQuestion(mensajeConfirmacion, async () => {
      // Cerrar la alerta de confirmación inmediatamente
      setShowQuestionAlert(false);
      
      // Código que se ejecutará si el usuario confirma
      
      // Para los tipos diferentes a PT, usamos los datos ya completados en el formulario
      // que deben contener los valores del recaudador (no editables)
      let tipoDocumento = formData.tipoDocumento;
      let documentoIdentificacion = formData.documentoIdentificacion;
      
      // Ya no necesitamos una lógica especial aquí, ya que los campos siempre estarán 
      // completos: si es PT con información ingresada por el usuario, y si es otro tipo 
      // con información del recaudador que se cargó automáticamente
      
      // Actualizar localStorage con los kilos para reportar editados
      try {
        const facturasSeleccionadasJson = localStorage.getItem('facturasSeleccionadasPazSalvo');
        if (facturasSeleccionadasJson) {
          const facturas = JSON.parse(facturasSeleccionadasJson);
          
          // Actualizar los kilos_paz_y_salvo con los valores editados y filtrar las que tienen 0 kilos
          const facturasActualizadas = facturas
            .map((factura: any) => {
              const kilosEditados = kilosParaReportar[factura.id_factura_unica];
              if (kilosEditados !== undefined) {
                // Asegurar que kilosEditados sea un número válido antes de usar toFixed
                const kilosNumerico = Number(kilosEditados) || 0;
                return {
                  ...factura,
                  // Asegurar que se guarde como número con 2 decimales
                  kilos_paz_y_salvo: Number(kilosNumerico.toFixed(2))
                };
              }
              return factura;
            })
            // Filtrar y solo mantener facturas con kilos_paz_y_salvo mayores a 0
            .filter((factura: any) => {
              const kilos = factura.kilos_paz_y_salvo || 0;
              return kilos > 0;
            });
          
          console.log('Facturas actualizadas en localStorage (solo con kilos > 0):', facturasActualizadas);
          
          if (facturasActualizadas.length === 0) {
            showErrorAlert('Debe ingresar una cantidad mayor a cero en al menos una factura para generar el paz y salvo');
            return;
          }
          
          // Guardar las facturas actualizadas en localStorage
          localStorage.setItem('facturasSeleccionadasPazSalvo', JSON.stringify(facturasActualizadas));
        }
      } catch (error) {
        console.error('Error al actualizar facturas en localStorage:', error);
      }
      
      // Mostrar mensaje de carga
      toggleLoader(true);
      
      // Enviar datos para generar paz y salvo
      const payload: any = {
        tipo_paz_y_salvo: formData.tipoPazSalvo,
        total_kilos_paz_y_salvo: formData.totalKilos,
        id_persona_genera: formData.personaGenera,
        // Estos valores siempre se envían:
        // - Para PT: datos del tercero ingresados por el usuario
        // - Para PV: datos del comprador nacional ingresados por el usuario
        // - Para propio: datos del recaudador
        razon_social: formData.razonSocial,
        id_tipo_doc_id: tipoDocumento,
        nro_doc_id: documentoIdentificacion,
        doc_paz_y_salvo: typeof formData.docPazSalvo === 'number' ? formData.docPazSalvo : 0,
        id_puerto_exportacion: isVentaNacional ? '' : parseInt(formData.puertoExportacion)
      };
      await generarPazSalvo(payload);
    });
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

  // Formatear moneda para mostrar
  const formatCurrency = (value: number | string) => {
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numericValue);
  };


  const tableColumns = [
    {
      key: 'fecha_registro_factura',
      label: 'Fecha de Registro',
      render: (value: string) => formatDate(value || new Date().toISOString())
    },
    {
      key: 'numero_factura_unica',
      label: 'Nº Factura Única',
      render: (value: string) => value || '-'
    },
    {
      key: 'departamento',
      label: 'Departamento',
      render: (value: string) => value || '-'
    },
    {
      key: 'municipio',
      label: 'Municipio',
      render: (value: string) => value || '-'
    },
    {
      key: 'nit_proveedor',
      label: 'NIT Proveedor',
      render: (value: string) => value || '-'
    },
    {
      key: 'fecha_compra',
      label: 'Fecha de Compra',
      render: (value: string) => formatDate(value || new Date().toISOString())
    },
    {
      key: 'kilos_reportados',
      label: 'Kilos Totales',
      render: (value: number) => {
        return formatNumberWithCommas(value.toString());
      }
    },
    {
      key: 'kilos_certificados',
      label: 'Kilos Certificables',
      render: (value: number) => {
        return formatNumberWithCommas(value.toString());
      }
    },
    {
      key: 'kilos_paz_salvo',
      label: 'Kilos con Paz y Salvo',
      render: (value: number) => {
        return formatNumberWithCommas(value.toString());
      }
    },
    {
      key: 'kilos_para_reportar',
      label: 'Kilos para Exportar',
      render: (value: number, row: FacturaMapeada) => {
        // Calcular kilos disponibles como la diferencia entre kilos certificados y kilos ya usados en paz y salvo
        const kilosCertificados = row.kilos_certificados || 0;
        const kilosYaEnPazSalvo = row.kilos_paz_salvo || 0;
        const kilosDisponibles = kilosCertificados - kilosYaEnPazSalvo;
        
        return (
          <div className="flex flex-col">
            <input
              type="text"
              inputMode="decimal"
              min="0"
              max={kilosDisponibles}
              step="0.01"
              value={
                tempKilosInput[row.id] !== undefined
                  ? tempKilosInput[row.id]
                  : formatNumberWithCommas(
                      (kilosParaReportar[row.id] !== undefined 
                        ? kilosParaReportar[row.id] 
                        : row.kilos_para_reportar
                      ).toString()
                    )
              }
              onChange={(e) => handleKilosChange(row.id, e.target.value)}
              onBlur={(e) => handleKilosBlur(row.id, e.target.value)}
              className={`w-24 p-1 border rounded focus:outline-none focus:ring-[#78390e] ${
                value <= kilosDisponibles ? 'border-[#4D750F]' : 'border-red-300'
              }`}
            />
            {value < 0 && (
              <span className="text-xs text-red-500 mt-1">Valor negativo</span>
            )}
          </div>
        );
      }
    },
    {
      key: 'precio_kilo',
      label: 'Precio por Kilo',
      render: (value: number) => {
        const numericValue = Number(value) || 0;
        return formatCurrency(numericValue);
      }
    },
    {
      key: 'cuota_fomento',
      label: 'Cuota de Fomento',
      render: (value: number) => {
        const numericValue = Number(value) || 0;
        return formatCurrency(numericValue);
      }
    },
    {
      key: 'fecha_pago',
      label: 'Fecha de Pago',
      render: (value: string) => formatDate(value || new Date().toISOString())
    }
  ];

  // Paginación para la tabla
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return facturasFormateadas.slice(startIndex, endIndex);
  };

  // Transformar tiposPazSalvo para el select
  const peaceTypesOptions = tiposPazSalvo.map(tipo => ({
    key: tipo.codigo,
    value: tipo.codigo,
    title: tipo.descripcion
  }));

  // Función para mostrar mensajes de error FUERA del useEffect
  // Modificar esta función para evitar causar re-renderizados dentro de useEffect
  const showErrorAlert = (message: string, callback?: () => void) => {
    setErrorMessage(message);
    setShowError(true);
    if (callback) {
      setShowSuccessAlert(false); // Asegurar que no se muestren múltiples alertas
      setShowQuestionAlert(false);
      setQuestionCallback(() => callback);
    }
  };

  // Función para mostrar/ocultar el loader
  const toggleLoader = (show: boolean) => {
    setShowLoaderAlert(show);
  };

  // Función para mostrar alertas de confirmación
  const showConfirmQuestion = (message: string, onConfirm: () => void) => {
    setQuestionMessage(message);
    setQuestionCallback(() => onConfirm);
    setShowQuestionAlert(true);
  };

  // Modificar el manejador onClose para AlertSuccess para redirigir a la página de consulta
  const handleSuccessClose = () => {
    setShowSuccessAlert(false);
    router.push('/recaudadores/consultar_paz_salvo');
  };

  // Manejar el estado de carga general con un useEffect
  useEffect(() => {
    // Si ya tenemos facturas formateadas, no necesitamos mostrar el loader
    if (facturasFormateadas.length > 0) {
      console.log('Facturas formateadas encontradas, ocultando indicador de carga:', facturasFormateadas.length);
      setShowLoaderAlert(false);
      
      // Limpiar el timeout de seguridad si existe
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      
      return;
    }
    
    const isLoadingAny = loadingTipos || loadingPuertos || loadingDocumentos || 
                         isLoadingRecaudador || isLoadingConsecutivo || isLoadingFacturas;
    
    const errorAny = errorTipos || errorPuertos || errorDocumentos || errorFacturas || errorConsecutivo;
    
    if (isLoadingAny) {
      setShowLoaderAlert(true);
    } else if (errorAny) {
      const errorMsg = errorTipos || errorPuertos || errorDocumentos || errorFacturas || errorConsecutivo;
      console.error('Error en componente GeneratePeace:', errorMsg);
      setErrorMessage(`Error al cargar datos: ${errorMsg}`);
      setShowError(true);
      setShowLoaderAlert(false);
      
      // Limpiar el timeout de seguridad si existe
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      
      setQuestionCallback(() => () => {
        router.push('/recaudadores/consultar_cuotas_pagadas');
      });
    } else {
      // Si no hay carga en progreso ni errores, y ya se ha verificado si hay facturas,
      // podemos ocultar el loader
      console.log('Ocultando indicador de carga - No hay cargas en progreso');
      setShowLoaderAlert(false);
    }
  }, [
    loadingTipos, loadingPuertos, loadingDocumentos, 
    isLoadingRecaudador, isLoadingFacturas, isLoadingConsecutivo,
    errorTipos, errorPuertos, errorDocumentos, errorFacturas, errorConsecutivo,
    router, facturasVerificadas, facturasFormateadas.length
  ]);

  // Condición simplificada para mostrar la pantalla de carga
  const showLoadingScreen = (loadingTipos || loadingPuertos || loadingDocumentos || 
                           isLoadingRecaudador || isLoadingConsecutivo || isLoadingFacturas) && 
                           facturasFormateadas.length === 0 && facturasVerificadas;

  // En lugar de retornar null, mostramos un indicador de carga o mensaje de error
  if (facturasVerificadas && !facturasExisten) {
    return (
      <div className="w-full max-w-full mx-auto p-6">
        <div className="p-8 rounded-xl bg-white shadow-md">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4">
            <strong className="font-bold">Atención: </strong>
            <span className="block sm:inline">No se encontraron facturas seleccionadas para generar paz y salvo.</span>
          </div>
          <div className="flex justify-center">
            <button 
              className="mt-2 px-4 py-2 bg-[#4D750F] text-white rounded-md"
              onClick={() => router.push('/recaudadores/consultar_cuotas_pagadas')}
            >
              Volver a Consultar Cuotas Pagadas
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showLoadingScreen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[rgb(var(--green))]"></div>
      </div>
    );
  }

  if (errorTipos || errorPuertos || errorDocumentos || errorFacturas || errorConsecutivo) {
    const errorMsg = errorTipos || errorPuertos || errorDocumentos || errorFacturas || errorConsecutivo;
    return (
      <div className="w-full max-w-full mx-auto p-6">
        <div className="p-8 rounded-xl bg-white shadow-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{errorMsg}</span>
          </div>
          <div className="flex justify-center">
            <button 
              className="mt-2 px-4 py-2 bg-[#4D750F] text-white rounded-md"
              onClick={() => router.push('/recaudadores/consultar_cuotas_pagadas')}
            >
              Volver a Consultar Cuotas Pagadas
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full mx-auto p-6">
      {/* Alertas del sistema */}
      <AlertLoader
        isOpen={showLoaderAlert || isGenerando}
        loadingText="Generando paz y salvo, por favor espere..."
      />
      
      <AlertSuccess
        isOpen={showSuccessAlert}
        message={successMessage}
        onClose={handleSuccessClose}
      />
      
      <AlertError 
        isOpen={showError} 
        message={errorMessage} 
        onClose={() => setShowError(false)} 
      />
      
      <AlertQuestion
        isOpen={showQuestionAlert}
        questionText={questionMessage}
        onClose={() => setShowQuestionAlert(false)}
        onConfirm={questionCallback}
      />
      
      <div
        className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}
      >
        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'dark' : 'bg-white'}`}>
          <h3
            className={`text-2xl font-bold text-center my-6 ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
          >
            GENERADOR DE PAZ Y SALVO
          </h3>

          {/* Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <AnimatedInput
              label="Número Paz y Salvo"
              name="pazSalvo"
              value={formData.pazSalvo}
              readOnly
              darkMode={theme === 'dark'}
            />
            <AnimatedInput
              label="Fecha de Generación"
              name="fechaGeneracion"
              type="date"
              value={formData.fechaGeneracion}
              onChange={handleInputChange}
              readOnly
              darkMode={theme === 'dark'}
            />
            <div className={`${isVentaNacional ? 'sm:col-span-2' : ''}`}>
              <AnimatedSelect
                label="Tipo de Paz y Salvo"
                name="tipoPazSalvo"
                value={formData.tipoPazSalvo}
                onChange={handleInputChange}
                options={peaceTypesOptions}
                darkMode={theme === 'dark'}
              />
            </div>
            {!isVentaNacional && (
              <AnimatedSelect
                label="Puerto de Exportación"
                name="puertoExportacion"
                value={formData.puertoExportacion}
                onChange={handleInputChange}
                options={puertosParaSelect}
                darkMode={theme === 'dark'}
              />
            )}
            <AnimatedInput
              label={razonSocialLabel}
              name="razonSocial"
              value={formData.razonSocial}
              onChange={handleInputChange}
              readOnly={razonSocialFieldDisabled}
              darkMode={theme === 'dark'}
            />
            <AnimatedInput
              label="Documento de Identificación"
              name="documentoIdentificacion"
              value={formData.documentoIdentificacion}
              onChange={handleInputChange}
              readOnly={documentFieldsDisabled}
              darkMode={theme === 'dark'}
            />
            <AnimatedSelect
              label="Tipo de Documento"
              name="tipoDocumento"
              options={tiposDocumentoParaSelect}
              value={formData.tipoDocumento}
              onChange={handleInputChange}
              disabled={documentFieldsDisabled}
              darkMode={theme === 'dark'}
            />
            <AnimatedInput
              label="Total Kilos"
              name="totalKilos"
              value={formData.totalKilos}
              onChange={handleInputChange}
              readOnly
              type="number"
              darkMode={theme === 'dark'}
            />
          </div>

          <div className="flex flex-wrap justify-center sm:justify-center gap-4 mt-6">
            <Button
              onClick={() => {

                const idPersonaGenera = recaudadorData?.id_persona;
                // Guardar el número de paz y salvo actual
                const numeroPazSalvoActual = formData.pazSalvo;
                
                // Obtener el tipo de paz y salvo actual (si existe)
                const tipoPazSalvoActual = formData.tipoPazSalvo;
                
                // Para los tipos PT y PV, limpiar todos los campos para que el usuario los ingrese (todos editables)
                // Para otros tipos, usar los datos del recaudador (no editables)
                const isPTorPV = tipoPazSalvoActual === PAZ_SALVO_EXPORTACION_TERCERO || 
                                 tipoPazSalvoActual === PAZ_SALVO_VENTA_NACIONAL;
                
                if (isPTorPV) {
                  // Si es PT o PV:
                  // - Limpiar todos los campos para que el usuario los complete
                  dispatch({ 
                    type: 'UPDATE_FORM_FIELD', 
                    payload: { fieldName: 'documentoIdentificacion', value: '' } 
                  });
                  
                  dispatch({ 
                    type: 'UPDATE_FORM_FIELD', 
                    payload: { fieldName: 'tipoDocumento', value: '' } 
                  });
                  
                  // Limpiar la razón social
                  dispatch({ 
                    type: 'UPDATE_FORM_FIELD', 
                    payload: { fieldName: 'razonSocial', value: '' } 
                  });
                  
                  // Habilitar todos los campos
                  dispatch({ 
                    type: 'SET_DOC_FIELDS_DISABLED', 
                    payload: false 
                  });
                  
                  dispatch({ 
                    type: 'SET_RAZON_SOCIAL_DISABLED', 
                    payload: false 
                  });
                } else {
                  // Si NO es PT ni PV:
                  // - Usar datos del recaudador para todos los campos (no editables)
                  dispatch({ 
                    type: 'UPDATE_FORM_FIELD', 
                    payload: { fieldName: 'documentoIdentificacion', value: recaudadorData?.numero_documento || '' } 
                  });
                  
                  // Seleccionar tipo de documento (preferiblemente NIT)
                  let tipoDocumentoDefecto = '';
                  if (tiposDocumento && tiposDocumento.length > 0) {
                    const nit = tiposDocumento.find(t => t.cod_tipo_documento === 'NT' || t.nombre.toUpperCase().includes('NIT'));
                    if (nit) {
                      tipoDocumentoDefecto = nit.cod_tipo_documento;
                    } else {
                      tipoDocumentoDefecto = tiposDocumento[0].cod_tipo_documento;
                    }
                  }
                  
                  dispatch({ 
                    type: 'UPDATE_FORM_FIELD', 
                    payload: { fieldName: 'tipoDocumento', value: tipoDocumentoDefecto } 
                  });
                  
                  // Determinar si debemos usar razon_social o nombre_recaudador
                  if (recaudadorData) {
                    const esNIT = recaudadorData.tipo_documento === 'NT';
                    const nombreParaMostrar = esNIT 
                      ? recaudadorData.razon_social 
                      : recaudadorData.nombre_recaudador;
                    
                    // Establecer nombre/razón social del recaudador
                    dispatch({ 
                      type: 'UPDATE_FORM_FIELD', 
                      payload: { fieldName: 'razonSocial', value: nombreParaMostrar || '' } 
                    });
                    
                    // Actualizar etiqueta según el tipo de documento
                    setRazonSocialLabel(esNIT ? "Razón Social" : "Nombre Completo");
                  } else {
                    // Si no hay datos del recaudador, dejar vacío
                    dispatch({ 
                      type: 'UPDATE_FORM_FIELD', 
                      payload: { fieldName: 'razonSocial', value: '' } 
                    });
                  }
                  
                  // Deshabilitar todos los campos
                  dispatch({ 
                    type: 'SET_DOC_FIELDS_DISABLED', 
                    payload: true 
                  });
                  
                  dispatch({ 
                    type: 'SET_RAZON_SOCIAL_DISABLED', 
                    payload: true 
                  });
                }
                
                // Limpiar el formulario pero mantener el número de paz y salvo y la fecha actual
                dispatch({ 
                  type: 'UPDATE_FORM_FIELD', 
                  payload: { fieldName: 'pazSalvo', value: numeroPazSalvoActual } 
                });
                dispatch({ 
                  type: 'UPDATE_FORM_FIELD', 
                  payload: { fieldName: 'fechaGeneracion', value: new Date().toISOString().split('T')[0] } 
                });
                dispatch({ 
                  type: 'UPDATE_FORM_FIELD', 
                  payload: { fieldName: 'tipoPazSalvo', value: tipoPazSalvoActual } 
                });
                dispatch({ 
                  type: 'UPDATE_FORM_FIELD', 
                  payload: { fieldName: 'puertoExportacion', value: '' } 
                });
                dispatch({ 
                  type: 'UPDATE_FORM_FIELD', 
                  payload: { fieldName: 'totalKilos', value: '' } 
                });
                dispatch({ 
                  type: 'UPDATE_FORM_FIELD', 
                  payload: { fieldName: 'personaGenera', value: idPersonaGenera || 0 } 
                });
                dispatch({ 
                  type: 'UPDATE_FORM_FIELD', 
                  payload: { fieldName: 'numDocId', value: recaudadorData?.numero_documento || '' } 
                });
                dispatch({ 
                  type: 'UPDATE_FORM_FIELD', 
                  payload: { fieldName: 'docPazSalvo', value: 0 } 
                });
              }}
              title="Limpiar"
            />
            <Button
              onClick={handleGenerarPazSalvo}
              title="Generar"
              disabled={isGenerando}
            />
            <Button
              onClick={() => router.push('/recaudadores/consulta_documentos_pagos/')}
              title="Salir"
            />
          </div>
        </div>
        <div className={`rounded-xl mt-4 p-6 ${theme === 'dark' ? 'dark' : 'bg-white'}`}>
          <h3
            className={`text-2xl font-bold text-center ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
          >
            Facturas Pagadas Seleccionadas
          </h3>
          
          <div className="overflow-x-auto">
            <DynamicTable
              columns={tableColumns}
              data={getCurrentPageData()}
              currentPage={currentPage}          
              totalPages={Math.ceil(facturasFormateadas.length / itemsPerPage)}           
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default GeneratePeace;

