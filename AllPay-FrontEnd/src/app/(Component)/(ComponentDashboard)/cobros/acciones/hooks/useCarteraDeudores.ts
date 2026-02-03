import { useState, useCallback } from 'react';

// Interfaces
export interface CarteraDeudor {
  id: number;
  documento_recaudador: string;
  nombre_recaudador: string;
  fecha_compra: string;
  nro_factura_unica: string;
  factura_proveedor: string;
  nit_proveedor: string;
  municipio_procedencia_cacao: string;
  departamento_procedencia_cacao: string;
  kilos: number;
  precio_kilo: number;
  valor_bruto: number;
  dias_mora: number;
  nro_acuerdo_pago: string;
  valor_interes: number;
  estado_acuerdo_pago: string;
}

export interface FormDataCartera {
  fechaInicio: string;
  fechaFinalizacion: string;
}

export interface AlertState {
  showAlertNotification: boolean;
  alertMessage: string;
  showErrorAlert: boolean;
  errorAlertMessage: string;
}

// Hook personalizado para manejar la cartera de deudores
export const useCarteraDeudores = () => {
  // Estados principales
  const [formData, setFormData] = useState<FormDataCartera>({
    fechaInicio: '',
    fechaFinalizacion: ''
  });
  
  const [carteraDeudores, setCarteraDeudores] = useState<CarteraDeudor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [foundCollectorDocument, setFoundCollectorDocument] = useState('');
  
  // Estados para alertas
  const [alertState, setAlertState] = useState<AlertState>({
    showAlertNotification: false,
    alertMessage: '',
    showErrorAlert: false,
    errorAlertMessage: ''
  });
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Estados para selección múltiple
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Datos de ejemplo
  const datosEjemplo: CarteraDeudor[] = [
    {
      id: 1,
      documento_recaudador: "12345678",
      nombre_recaudador: "RECAUDADOR EJEMPLO S.A.S",
      fecha_compra: "2024-01-15",
      nro_factura_unica: "FU-2024001",
      factura_proveedor: "FP-001234",
      nit_proveedor: "900123456-7",
      municipio_procedencia_cacao: "San Vicente del Caguán",
      departamento_procedencia_cacao: "Caquetá",
      kilos: 1500,
      precio_kilo: 8500,
      valor_bruto: 12750000,
      dias_mora: 45,
      nro_acuerdo_pago: "AP-2024001",
      valor_interes: 850000,
      estado_acuerdo_pago: "VIGENTE"
    },
    {
      id: 2,
      documento_recaudador: "87654321",
      nombre_recaudador: "COOPERATIVA CACAOTERA DEL SUR",
      fecha_compra: "2024-01-20",
      nro_factura_unica: "FU-2024002",
      factura_proveedor: "FP-001235",
      nit_proveedor: "800987654-3",
      municipio_procedencia_cacao: "Tumaco",
      departamento_procedencia_cacao: "Nariño",
      kilos: 2300,
      precio_kilo: 8200,
      valor_bruto: 18860000,
      dias_mora: 30,
      nro_acuerdo_pago: "AP-2024002",
      valor_interes: 564000,
      estado_acuerdo_pago: "EN MORA"
    },
    {
      id: 3,
      documento_recaudador: "11223344",
      nombre_recaudador: "ASOCIACIÓN CACAOTERA AMAZÓNICA",
      fecha_compra: "2024-02-05",
      nro_factura_unica: "FU-2024003",
      factura_proveedor: "FP-001236",
      nit_proveedor: "800112233-4",
      municipio_procedencia_cacao: "Florencia",
      departamento_procedencia_cacao: "Caquetá",
      kilos: 3200,
      precio_kilo: 8800,
      valor_bruto: 28160000,
      dias_mora: 15,
      nro_acuerdo_pago: "AP-2024003",
      valor_interes: 422400,
      estado_acuerdo_pago: "AL DÍA"
    }
  ];

  // Funciones para manejo de formulario
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // Función para manejar recaudador encontrado
  const handleFoundCollector = useCallback((documentoIdentificacion: string) => {
    setFoundCollectorDocument(documentoIdentificacion);
  }, []);

  // Función de búsqueda
  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Simular llamada a API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Filtrar datos según parámetros de búsqueda
      let resultados = [...datosEjemplo];
      
      // Filtrar por fechas si están definidas
      if (formData.fechaInicio) {
        resultados = resultados.filter(item => 
          new Date(item.fecha_compra) >= new Date(formData.fechaInicio)
        );
      }
      
      if (formData.fechaFinalizacion) {
        resultados = resultados.filter(item => 
          new Date(item.fecha_compra) <= new Date(formData.fechaFinalizacion)
        );
      }
      
      // Filtrar por documento de recaudador si está definido
      if (foundCollectorDocument) {
        resultados = resultados.filter(item => 
          item.documento_recaudador.includes(foundCollectorDocument)
        );
      }
      
      setCarteraDeudores(resultados);
      setTotalPages(Math.ceil(resultados.length / 10)); // Asumiendo 10 registros por página
      
      setAlertState({
        showAlertNotification: true,
        alertMessage: `Búsqueda completada exitosamente. ${resultados.length} registros encontrados.`,
        showErrorAlert: false,
        errorAlertMessage: ''
      });
      
      // Ocultar alerta después de 3 segundos
      setTimeout(() => {
        setAlertState(prev => ({
          ...prev,
          showAlertNotification: false
        }));
      }, 3000);
      
    } catch (error) {
      console.error('[useCarteraDeudores] - Error en búsqueda:', error);
      setAlertState({
        showAlertNotification: false,
        alertMessage: '',
        showErrorAlert: true,
        errorAlertMessage: 'Error al realizar la búsqueda. Intente nuevamente.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [formData, foundCollectorDocument, datosEjemplo]);

  // Función para limpiar búsqueda
  const handleClearSearch = useCallback(() => {
    setFormData({ fechaInicio: '', fechaFinalizacion: '' });
    setFoundCollectorDocument('');
    setSelectedRows(new Set());
    setSelectAll(false);
    setCarteraDeudores([]);
    setCurrentPage(1);
    setTotalPages(1);
    
    setAlertState({
      showAlertNotification: false,
      alertMessage: '',
      showErrorAlert: false,
      errorAlertMessage: ''
    });
  }, []);

  // Funciones para manejo de selección
  const handleRowSelect = useCallback((rowId: number) => {
    const newSelectedRows = new Set(selectedRows);
    if (newSelectedRows.has(rowId)) {
      newSelectedRows.delete(rowId);
    } else {
      newSelectedRows.add(rowId);
    }
    setSelectedRows(newSelectedRows);
    setSelectAll(newSelectedRows.size === carteraDeudores.length && carteraDeudores.length > 0);
  }, [selectedRows, carteraDeudores.length]);

  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedRows(new Set());
      setSelectAll(false);
    } else {
      const allIds = carteraDeudores.map(item => item.id);
      setSelectedRows(new Set(allIds));
      setSelectAll(true);
    }
  }, [selectAll, carteraDeudores]);

  // Función para cambio de página
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, [currentPage]);

  // Función para obtener datos para Excel
  const fetchAllDataForExcel = useCallback(async (_page: number) => {
    return {
      data: carteraDeudores,
      total_pages: totalPages
    };
  }, [carteraDeudores, totalPages]);

  // Funciones de utilidad para formateo
  const formatDate = useCallback((value: string) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    return date.toLocaleDateString('es-CO');
  }, []);

  const formatNumber = useCallback((value: number) => {
    if (!value) return '0';
    return new Intl.NumberFormat('es-CO').format(value);
  }, []);

  const formatCurrency = useCallback((value: number) => {
    if (!value) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  }, []);

  // Funciones para manejo de alertas
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

  return {
    // Estados
    formData,
    carteraDeudores,
    isLoading,
    foundCollectorDocument,
    alertState,
    currentPage,
    totalPages,
    selectedRows,
    selectAll,
    
    // Funciones
    handleInputChange,
    handleFoundCollector,
    handleSearch,
    handleClearSearch,
    handleRowSelect,
    handleSelectAll,
    handlePageChange,
    fetchAllDataForExcel,
    
    // Funciones de utilidad
    formatDate,
    formatNumber,
    formatCurrency,
    
    // Funciones de alertas
    closeAlertNotification,
    closeErrorAlert
  };
}; 