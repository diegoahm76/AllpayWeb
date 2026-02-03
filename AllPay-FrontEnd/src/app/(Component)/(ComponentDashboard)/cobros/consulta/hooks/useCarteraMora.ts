import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  getCarteraMora,
  getAllCarteraMoraForExport,
  downloadFacturaFile
} from '../adapters/carteraMora.adapter';
import {
  FacturaCarteraMora,
  FacturaCarteraMoraAPI,
  FormDataCarteraMora,
  TotalesCartera,
  TotalesCarteraMora,
  CarteraMoraBusquedaParams
} from '../models/carteraConsulta.model';

// Interface para el estado de alertas
export interface AlertState {
  showAlertNotification: boolean;
  alertMessage: string;
  showErrorAlert: boolean;
  errorAlertMessage: string;
  showAlertSuccess: boolean;
}

// Función para transformar datos de API a estructura interna
const transformApiDataToCarteraMora = (apiData: FacturaCarteraMoraAPI): FacturaCarteraMora => {
  // Función auxiliar para determinar el estado de acuerdo de pago
  const getEstadoAcuerdoPago = (factura: FacturaCarteraMoraAPI): string => {
    if (factura.estado_acuerdo_pago) return factura.estado_acuerdo_pago;
    if (factura.nro_acuerdo_pago) return 'CON ACUERDO';
    if (factura.dias_mora > 90) return 'MORA CRÍTICA';
    if (factura.dias_mora > 60) return 'MORA ALTA';
    if (factura.dias_mora > 30) return 'MORA MEDIA';
    if (factura.dias_mora > 0) return 'MORA INICIAL';
    return 'SIN MORA';
  };

  // Función auxiliar para obtener número de acuerdo
  const getNumeroAcuerdoPago = (factura: FacturaCarteraMoraAPI): string => {
    return factura.nro_acuerdo_pago || 'SIN ACUERDO';
  };

  return {
    id: apiData.id_factura_unica,
    documento_recaudador: apiData.nro_documento_recaudador || 'N/A',
    razon_social_recaudador: apiData.razon_social_recaudador || 'N/A',
    fecha_compra: apiData.fecha_compra || '',
    nro_factura_unica: apiData.nro_factura_unica?.toString() || 'N/A',
    factura_proveedor: apiData.factura_proveedor || 'N/A',
    nit_proveedor: apiData.nit_proveedor || 'N/A',
    nombre_proveedor: apiData.nombre_proveedor || 'N/A',
    municipio_cacao: apiData.nombre_municipio_cacao || 'N/A',
    departamento_cacao: apiData.nombre_departamento_cacao || 'N/A',
    total_kilos: apiData.total_kilos || 0,
    valor_bruto: parseFloat(apiData.valor_bruto) || 0,
    cuota_fomento: parseFloat(apiData.cuota_fomento) || 0,
    valor_neto: parseFloat(apiData.valor_neto) || 0,
    dias_mora: apiData.dias_mora || 0,
    nro_acuerdo_pago: getNumeroAcuerdoPago(apiData),
    valor_intereses: apiData.valor_intereses || 0,
    estado_acuerdo_pago: getEstadoAcuerdoPago(apiData),
    archivo_url: apiData.archivo || ''
  };
};

// Función para transformar totales de API a estructura interna
const transformTotales = (totales?: TotalesCarteraMora): TotalesCartera => {
  if (!totales) {
    return {
      total_kilos: 0,
      total_cuota_fomento: 0,
      total_interes: 0
    };
  }
  return {
    total_kilos: totales.total_kilos || 0,
    total_cuota_fomento: totales.total_cuota_fomento || 0,
    total_interes: totales.total_interes || 0
  };
};

// Hook personalizado para manejar la cartera en mora
export const useCarteraMora = () => {
  const { data: session } = useSession();
  const token = (session as any)?.user?.tokens?.access;

  // Estados principales
  const [formData, setFormData] = useState<FormDataCarteraMora>({
    fechaInicio: '',
    fechaFinalizacion: '',
    documentoRecaudador: '',
    nroFactura: '',
    nitProveedor: '',
    nombreProveedor: '',
    municipio: '',
    departamento: '',
    diasMoraMin: '',
    diasMoraMax: ''
  });

  const [carteraMora, setCarteraMora] = useState<FacturaCarteraMora[]>([]);
  const [totales, setTotales] = useState<TotalesCartera>({
    total_kilos: 0,
    total_cuota_fomento: 0,
    total_interes: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  // Estados para alertas
  const [alertState, setAlertState] = useState<AlertState>({
    showAlertNotification: false,
    alertMessage: '',
    showErrorAlert: false,
    errorAlertMessage: '',
    showAlertSuccess: false
  });

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Estados para selección múltiple
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Funciones para manejo de formulario
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // Función para limpiar formulario
  const handleClearForm = useCallback(() => {
    setFormData({
      fechaInicio: '',
      fechaFinalizacion: '',
      documentoRecaudador: '',
      nroFactura: '',
      nitProveedor: '',
      nombreProveedor: '',
      municipio: '',
      departamento: '',
      diasMoraMin: '',
      diasMoraMax: ''
    });
  }, []);

  // Función de búsqueda principal
  const handleSearch = useCallback(async () => {
    if (!token) {
      setAlertState({
        showAlertNotification: false,
        alertMessage: '',
        showErrorAlert: true,
        errorAlertMessage: 'No se ha encontrado el token de autenticación. Por favor, inicie sesión nuevamente.',
        showAlertSuccess: false
      });
      return;
    }

    setIsLoading(true);

    try {
      // Preparar parámetros de búsqueda
      const searchParams: CarteraMoraBusquedaParams = {
        page: currentPage,
        page_size: 10
      };

      // Agregar filtros si están definidos
      if (formData.fechaInicio) searchParams.fecha_desde = formData.fechaInicio;
      if (formData.fechaFinalizacion) searchParams.fecha_hasta = formData.fechaFinalizacion;
      if (formData.documentoRecaudador) searchParams.nro_documento_recaudador = formData.documentoRecaudador;
      if (formData.nroFactura) searchParams.nro_factura_unica = formData.nroFactura;
      if (formData.nitProveedor) searchParams.nit_proveedor = formData.nitProveedor;
      if (formData.nombreProveedor) searchParams.nombre_proveedor = formData.nombreProveedor;
      if (formData.municipio) searchParams.municipio_cacao = formData.municipio;
      if (formData.departamento) searchParams.departamento_cacao = formData.departamento;
      if (formData.diasMoraMin) searchParams.dias_mora_min = parseInt(formData.diasMoraMin);
      if (formData.diasMoraMax) searchParams.dias_mora_max = parseInt(formData.diasMoraMax);

      // Llamar a la API
      const response = await getCarteraMora(token, searchParams);

      if (response.results.success) {
        // Transformar datos de API a estructura interna
        const carteraTransformada = response.results.data.map(transformApiDataToCarteraMora);
        
        // Si no hay totales en la respuesta, calcularlos localmente
        let totalesTransformados: TotalesCartera;
        if (response.results.totales) {
          totalesTransformados = transformTotales(response.results.totales);
        } else {
          // Calcular totales localmente desde los datos recibidos
          const totalesCalculados = response.results.data.reduce((acc, factura) => {
            acc.total_kilos += factura.total_kilos || 0;
            acc.total_cuota_fomento += parseFloat(factura.cuota_fomento) || 0;
            acc.total_interes += factura.valor_intereses || 0;
            return acc;
          }, {
            total_kilos: 0,
            total_cuota_fomento: 0,
            total_interes: 0
          });
          totalesTransformados = totalesCalculados;
        }

        setCarteraMora(carteraTransformada);
        setTotales(totalesTransformados);
        setTotalRecords(response.count);
        
        // Calcular total de páginas
        const calculatedPages = Math.ceil(response.count / 10);
        setTotalPages(calculatedPages);

        setAlertState({
          showAlertNotification: false,
          alertMessage: `${response.count} registros encontrados.`,
          showErrorAlert: false,
          errorAlertMessage: '',
          showAlertSuccess: false
        });

      } else {
        throw new Error('Respuesta no exitosa de la API');
      }

    } catch (error) {
      console.error('[useCarteraMora] - Error en búsqueda:', error);
      
      // Solo mostrar alerta de error si no es un 404 (que ya se maneja en el adapter)
      const errorMessage = error instanceof Error ? error.message : 'Error al realizar la búsqueda. Intente nuevamente.';
      const is404Error = errorMessage.includes('No se encontraron registros');
      
      if (!is404Error) {
        setAlertState({
          showAlertNotification: false,
          alertMessage: '',
          showErrorAlert: true,
          errorAlertMessage: errorMessage,
          showAlertSuccess: false
        });
      } else {
        // Para 404, solo limpiar el estado de alertas sin mostrar error
        setAlertState({
          showAlertNotification: false,
          alertMessage: '',
          showErrorAlert: false,
          errorAlertMessage: '',
          showAlertSuccess: false
        });
      }
      
      // Limpiar datos en caso de error
      setCarteraMora([]);
      setTotales({
        total_kilos: 0,
        total_cuota_fomento: 0,
        total_interes: 0
      });
      setTotalRecords(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [formData, currentPage, token]);

  // useEffect para cargar datos automáticamente al montar el componente
  useEffect(() => {
    // Solo ejecutar la búsqueda inicial si hay token disponible
    if (token) {
      handleSearch();
    }
  }, [token]); // Solo dependemos del token para la carga inicial

  // useEffect para ejecutar búsqueda automática cuando cambie el documento del recaudador
  useEffect(() => {
    if (token && formData.documentoRecaudador) {
      
      // Determinar el delay basado en la longitud del documento
      // Delay más corto si viene de selección de recaudador (documento completo)
      // Delay más largo si está escribiendo manualmente
      const delay = formData.documentoRecaudador.length >= 8 ? 300 : 1000;
      
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, delay);
      
      return () => clearTimeout(timeoutId);
    }
    // No hay else, pero TypeScript necesita que todos los caminos retornen algo
    return undefined;
  }, [formData.documentoRecaudador, token]);

  // Función para limpiar búsqueda
  const handleClearSearch = useCallback(async () => {
    handleClearForm();
    setCarteraMora([]);
    setTotales({
      total_kilos: 0,
      total_cuota_fomento: 0,
      total_interes: 0
    });
    setCurrentPage(1);
    setTotalPages(1);
    setTotalRecords(0);
    setSelectedRows(new Set());
    setSelectAll(false);

    setAlertState({
      showAlertNotification: false,
      alertMessage: '',
      showErrorAlert: false,
      errorAlertMessage: '',
      showAlertSuccess: false
    });

    // Hacer petición sin filtros después de limpiar
    if (token) {
      try {
        setIsLoading(true);
        const response = await getCarteraMora(token, { page: 1, page_size: 10 });

        if (response.results.success) {
          const carteraTransformada = response.results.data.map(transformApiDataToCarteraMora);
          
          let totalesTransformados: TotalesCartera;
          if (response.results.totales) {
            totalesTransformados = transformTotales(response.results.totales);
          } else {
            const totalesCalculados = response.results.data.reduce((acc, factura) => {
              acc.total_kilos += factura.total_kilos || 0;
              acc.total_cuota_fomento += parseFloat(factura.cuota_fomento) || 0;
              acc.total_interes += factura.valor_intereses || 0;
              return acc;
            }, {
              total_kilos: 0,
              total_cuota_fomento: 0,
              total_interes: 0
            });
            totalesTransformados = totalesCalculados;
          }

          setCarteraMora(carteraTransformada);
          setTotales(totalesTransformados);
          setTotalRecords(response.count);
          
          const calculatedPages = Math.ceil(response.count / 10);
          setTotalPages(calculatedPages);

          // No mostrar alerta de registros encontrados al limpiar
        }
      } catch (error) {
        console.error('[useCarteraMora] - Error en búsqueda sin filtros:', error);
        setAlertState({
          showAlertNotification: false,
          alertMessage: '',
          showErrorAlert: true,
          errorAlertMessage: error instanceof Error ? error.message : 'Error al realizar la búsqueda. Intente nuevamente.',
          showAlertSuccess: false
        });
      } finally {
        setIsLoading(false);
      }
    }
  }, [handleClearForm, token]);

  // Función para manejo de selección de filas
  const handleRowSelect = useCallback((id: number) => {
    setSelectedRows(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }

      // Actualizar estado de seleccionar todo
      setSelectAll(newSelection.size === carteraMora.length && carteraMora.length > 0);

      return newSelection;
    });
  }, [carteraMora.length]);

  // Función para seleccionar/deseleccionar todo
  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedRows(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(carteraMora.map(item => item.id));
      setSelectedRows(allIds);
      setSelectAll(true);
    }
  }, [selectAll, carteraMora]);

  // Función para cambio de página
  const handlePageChange = useCallback(async (page: number) => {
    setCurrentPage(page);

    if (!token) return;

    setIsLoading(true);

    try {
      // Preparar parámetros con la nueva página
      const searchParams: CarteraMoraBusquedaParams = {
        page,
        page_size: 10
      };

      // Agregar los mismos filtros de la búsqueda actual
      if (formData.fechaInicio) searchParams.fecha_desde = formData.fechaInicio;
      if (formData.fechaFinalizacion) searchParams.fecha_hasta = formData.fechaFinalizacion;
      if (formData.documentoRecaudador) searchParams.nro_documento_recaudador = formData.documentoRecaudador;
      if (formData.nroFactura) searchParams.nro_factura_unica = formData.nroFactura;
      if (formData.nitProveedor) searchParams.nit_proveedor = formData.nitProveedor;
      if (formData.nombreProveedor) searchParams.nombre_proveedor = formData.nombreProveedor;
      if (formData.municipio) searchParams.municipio_cacao = formData.municipio;
      if (formData.departamento) searchParams.departamento_cacao = formData.departamento;
      if (formData.diasMoraMin) searchParams.dias_mora_min = parseInt(formData.diasMoraMin);
      if (formData.diasMoraMax) searchParams.dias_mora_max = parseInt(formData.diasMoraMax);

      const response = await getCarteraMora(token, searchParams);

      if (response.results.success) {
        const carteraTransformada = response.results.data.map(transformApiDataToCarteraMora);
        setCarteraMora(carteraTransformada);
        
        // Actualizar totales si están disponibles o calcularlos localmente
        if (response.results.totales) {
          const totalesTransformados = transformTotales(response.results.totales);
          setTotales(totalesTransformados);
        } else {
          // Calcular totales localmente desde los datos de esta página
          const totalesCalculados = response.results.data.reduce((acc, factura) => {
            acc.total_kilos += factura.total_kilos || 0;
            acc.total_cuota_fomento += parseFloat(factura.cuota_fomento) || 0;
            acc.total_interes += factura.valor_intereses || 0;
            return acc;
          }, {
            total_kilos: 0,
            total_cuota_fomento: 0,
            total_interes: 0
          });
          setTotales(totalesCalculados);
        }
      }

    } catch (error) {
      console.error('[useCarteraMora] - Error al cambiar página:', error);
    } finally {
      setIsLoading(false);
    }
  }, [formData, token]);

  // Función para obtener todos los datos para Excel
  const fetchAllDataForExcel = useCallback(async () => {
    if (!token) {
      return { data: [], total_pages: 1 };
    }

    try {
      // Preparar parámetros sin paginación
      const searchParams: Omit<CarteraMoraBusquedaParams, 'page' | 'page_size'> = {};

      if (formData.fechaInicio) searchParams.fecha_desde = formData.fechaInicio;
      if (formData.fechaFinalizacion) searchParams.fecha_hasta = formData.fechaFinalizacion;
      if (formData.documentoRecaudador) searchParams.nro_documento_recaudador = formData.documentoRecaudador;
      if (formData.nroFactura) searchParams.nro_factura_unica = formData.nroFactura;
      if (formData.nitProveedor) searchParams.nit_proveedor = formData.nitProveedor;
      if (formData.nombreProveedor) searchParams.nombre_proveedor = formData.nombreProveedor;
      if (formData.municipio) searchParams.municipio_cacao = formData.municipio;
      if (formData.departamento) searchParams.departamento_cacao = formData.departamento;
      if (formData.diasMoraMin) searchParams.dias_mora_min = parseInt(formData.diasMoraMin);
      if (formData.diasMoraMax) searchParams.dias_mora_max = parseInt(formData.diasMoraMax);

      const response = await getAllCarteraMoraForExport(token, searchParams);
      const carteraTransformada = response.facturas.map(transformApiDataToCarteraMora);

      return {
        data: carteraTransformada,
        total_pages: 1
      };

    } catch (error) {
      console.error('[useCarteraMora] - Error al obtener datos para Excel:', error);
      return { data: [], total_pages: 1 };
    }
  }, [formData, token]);

  // Función para descargar archivo de factura
  const handleDownloadFile = useCallback(async (idFactura: number, nombreArchivo?: string) => {
    if (!token) {
      setAlertState({
        showAlertNotification: false,
        alertMessage: '',
        showErrorAlert: true,
        errorAlertMessage: 'Token de autenticación no disponible',
        showAlertSuccess: false
      });
      return;
    }

    try {
      const blob = await downloadFacturaFile(token, idFactura);
      
      // Crear URL para descargar
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nombreArchivo || `factura_${idFactura}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('[useCarteraMora] - Error al descargar archivo:', error);
      setAlertState({
        showAlertNotification: false,
        alertMessage: '',
        showErrorAlert: true,
        errorAlertMessage: error instanceof Error ? error.message : 'Error al descargar el archivo',
        showAlertSuccess: false
      });
    }
  }, [token]);

  // Funciones de formateo
  const formatDate = useCallback((dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }, []);

  const formatNumber = useCallback((value: number): string => {
    if (!value && value !== 0) return '';
    return new Intl.NumberFormat('es-CO').format(value);
  }, []);

  const formatCurrency = useCallback((value: number): string => {
    if (!value && value !== 0) return '';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(value);
  }, []);

  // Funciones para cerrar alertas
  const closeAlertNotification = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      showAlertNotification: false
    }));
  }, []);

  const closeErrorAlert = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      showErrorAlert: false
    }));
  }, []);

  const closeAlertSuccess = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      showAlertSuccess: false
    }));
  }, []);

  return {
    // Estados
    formData,
    carteraMora,
    totales,
    isLoading,
    alertState,
    currentPage,
    totalPages,
    totalRecords,
    selectedRows,
    selectAll,

    // Funciones
    handleInputChange,
    handleClearForm,
    handleSearch,
    handleClearSearch,
    handleRowSelect,
    handleSelectAll,
    handlePageChange,
    fetchAllDataForExcel,
    handleDownloadFile,
    formatDate,
    formatNumber,
    formatCurrency,
    closeAlertNotification,
    closeErrorAlert,
    closeAlertSuccess,
    setFormData
  };
}; 