'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from 'next-themes';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useSearchCollectors from '@/app/(Component)/(ComponentDashboard)/recaudadores/consultar_factura/hooks/useSearchCollectors';
import { useTypeDni } from '@/application/dni/useTypeDni';
import useGetDepartments from '@/application/address/useGetDepartmentsCacao';
import { useGetCities } from '@/application/address/useGetCities';
import { formatNumber, formatCurrency, formatNumberWithCommas } from '@/utils/formatters';
import useConsultarSieza from '@/app/(Component)/(ComponentDashboard)/recaudadores/consultar_sieza/hooks/useConsultarSieza';
import useSiezaComprobante from '@/app/(Component)/(ComponentDashboard)/recaudadores/consultar_sieza/hooks/useSiezaComprobante';
import { GetSiezaComprobanteParams } from '../models/sieza.comprobante.types';
import { GetSiezaConsultaParams } from '../models/sieza.consulta.types';


// alertas de fedecacao
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertQuestion from '@/presenters/components/recaudadores/AlertQuestion';
import AlertError from '@/presenters/components/recaudadores/AlertError';

const SearchCollectors = () => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [isInternalUser, setIsInternalUser] = useState<boolean | null>(null);

  const [hasFetchedTypes, setHasFetchedTypes] = useState(false);
  const [hasLoadedInitialSieza, setHasLoadedInitialSieza] = useState(false);

  // notificaciones
  const [success, setSuccess] = useState(false);
  const [isAlertError, setIsAlertError] = useState(false);
  const [alertErrorText, setAlertErrorText] = useState('');
  const [isAlertQuestion, setIsAlertQuestion] = useState(false);
  

  const {
    departments,
    fetchDepartments
  } = useGetDepartments();

  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);

  const {
    formData,
    validationErrors,
    handleInputChange,
    handleSelectChange,
    // handleConsultar,
    clearForm,
    updateFormField
  } = useSearchCollectors();

  const { types, fetchTypes } = useTypeDni();

  // Hook para consultar SIEZA
  const {
    rows: siezaRows,
    isLoading: isLoadingSieza,
    currentPage: siezaCurrentPage,
    totalPages: siezaTotalPages,
    totalCuotaFomento,
    totalIntereses,
    fetchRows: fetchSiezaRows,
    handlePageChange: handleSiezaPageChange,
    clear: clearSieza
  } = useConsultarSieza();

  // Hook para comprobante SIEZA (para Excel)
  const {
    fetchComprobante
  } = useSiezaComprobante();

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });
  const valueSesion: any = session;

  const { cities, loading: loadingCities, error: citiesError } = useGetCities({
    departamentoId: selectedDepartment || 0,
    token: valueSesion?.user?.tokens?.access || ''
  });

  const latestSearchRequestRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!valueSesion?.user?.tipo_usuario) return; // Esperamos a tener el dato
    if (valueSesion.user.tipo_usuario === 'I') {
      setIsInternalUser(true);
    } else if (valueSesion.user.tipo_usuario === 'E') {
      setIsInternalUser(false);
    }
  }, [valueSesion?.user?.tipo_usuario]);


  // Cargar datos del localStorage SOLO UNA VEZ
  useEffect(() => {
    // No cargar datos del localStorage en la carga inicial
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }

    const savedFormData = localStorage.getItem('collectorSearchFormData');
    const savedInvoices = localStorage.getItem('collectorInvoicesData');
    const savedCurrentPage = localStorage.getItem('collectorInvoicesCurrentPage');

    if (savedFormData) {
      try {
        const parsedFormData = JSON.parse(savedFormData);
        // Asegurarse de que todos los campos estén presentes
        const completeFormData = {
          tipoDocumento: '',
          documentoIdentificacion: '',
          razonSocial: '',
          primer_nombre: '',
          segundo_nombre: '',
          primer_apellido: '',
          segundo_apellido: '',
          departamento: '',
          municipio: '',
          nroFacturaUnica: '',
          fechaInicio: '',
          fechaFin: '',
          ...parsedFormData // Sobrescribir solo los campos que existen en localStorage
        };
        
        Object.entries(completeFormData).forEach(([key, value]) => {
          updateFormField(key, value as string);
        });
      } catch (error) {
        console.error('Error parsing form data from localStorage:', error);
        clearForm(); // Si hay error, limpiar el formulario
      }
    }

    if (savedInvoices && savedCurrentPage) {
      try {
        JSON.parse(savedInvoices);
        // No hay setInvoicesData disponible, solo limpiar
      } catch (error) {
        console.error('Error parsing invoices data from localStorage:', error);
      }
    }
  }, [isInitialLoad]);

  // Carga inicial del sistema contable sin filtros cuando hay token disponible
  useEffect(() => {
    const token = valueSesion?.user?.tokens?.access || '';
    if (!token || hasLoadedInitialSieza) return;
    (async () => {
      try {
        await fetchSiezaRows(token, { page: 1, page_size: 10 });
      } catch (e) {
        console.error('Error en carga inicial del sistema contable:', e);
      } finally {
        setHasLoadedInitialSieza(true);
      }
    })();
  }, [valueSesion?.user?.tokens?.access, hasLoadedInitialSieza, fetchSiezaRows]);

  // Guardar formData en localStorage (cuando no sea la carga inicial)
  useEffect(() => {
    if (!isInitialLoad) {
      const formDataToSave = {
        ...formData,
        // Asegurarse de que los campos vacíos se guarden como strings vacíos
        tipoDocumento: formData.tipoDocumento || '',
        documentoIdentificacion: formData.documentoIdentificacion || '',
        razonSocial: formData.razonSocial || '',
        primer_nombre: formData.primer_nombre || '',
        segundo_nombre: formData.segundo_nombre || '',
        primer_apellido: formData.primer_apellido || '',
        segundo_apellido: formData.segundo_apellido || '',
        departamento: formData.departamento || '',
        municipio: formData.municipio || '',
        nroFacturaUnica: formData.nroFacturaUnica || '',
        fechaInicio: formData.fechaInicio || '',
        fechaFin: formData.fechaFin || ''
      };
      localStorage.setItem('collectorSearchFormData', JSON.stringify(formDataToSave));
    }
  }, [formData, isInitialLoad]);


  // Llamar a fetchTypes solo una vez, cuando tengamos un token
  useEffect(() => {
    if (!valueSesion?.user?.tokens?.access || hasFetchedTypes) return;
    setHasFetchedTypes(true);
    fetchTypes(valueSesion.user.tokens.access)
      .catch((err) => {
        console.error('Error fetching document types:', err);
      });
  }, [valueSesion?.user?.tokens?.access, hasFetchedTypes, fetchTypes]);

  // Cargar departamentos (una sola vez)
  useEffect(() => {
    const loadDepartments = async () => {
        try {
          await fetchDepartments();
        } catch (error) {
          console.error('Error fetching departments:', error);
      }
    };
    loadDepartments();
  }, [fetchDepartments]);

  // Manejo de selección de departamento
  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    handleSelectChange(e);
    setSelectedDepartment(value ? parseInt(value) : null);
  };

  // Opciones de departamento
  const getDepartmentOptions = () => {
    return departments
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map(dept => ({
        key: dept.cod_departamento,
        value: dept.cod_departamento,
        title: dept.nombre
      }));
  };

  // Opciones de ciudad
  const getCityOptions = () => {
    if (loadingCities) {
      return [{ key: '', value: '', title: 'Cargando...' }];
    }
    if (citiesError) {
      return [{ key: '', value: '', title: 'Error al cargar municipios' }];
    }
    return cities
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map(city => ({
        key: city.cod_municipio,
        value: city.cod_municipio,
        title: city.nombre
      }));
  };

  // Formatear fecha antes de enviar a la API
  const formatDateForApi = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // Función para la búsqueda
  const handleSearch = async () => {
    const currentRequestId = ++latestSearchRequestRef.current;

    try {
      clearSieza();
      
      const params: GetSiezaConsultaParams = {
        page: 1,
        page_size: 10
      };

      // Mapear los parámetros del formulario a los parámetros de SIEZA
      if (formData.tipoDocumento) params.tipo_documento_proveedor = formData.tipoDocumento;
      if (formData.documentoIdentificacion) params.numero_documento_proveedor = formData.documentoIdentificacion;
      if (formData.razonSocial) params.nombre_proveedor = formData.razonSocial;
      if (formData.primer_nombre) params.recaudador_nombre = formData.primer_nombre;
      if (formData.primer_apellido) params.recaudador_apellido = formData.primer_apellido;
      if (formData.departamento) params.id_departamento_cacao = parseInt(formData.departamento);
      if (formData.municipio) params.id_municipio_cacao = parseInt(formData.municipio);
      if (formData.fechaInicio) params.fecha_desde = formatDateForApi(formData.fechaInicio);
      if (formData.fechaFin) params.fecha_hasta = formatDateForApi(formData.fechaFin);
      if (formData.nroFacturaUnica) params.no_factura_unica = parseInt(formData.nroFacturaUnica);
      if (formData.tipoComprador && formData.tipoComprador.length > 0) {
        const tipoCompradorMap: { [key: string]: string } = {
          'Procesador': 'P',
          'Exportador': 'E',
          'Comerciante': 'C'
        };
        const tiposCompradorFormateados = formData.tipoComprador
          .map(tipo => tipoCompradorMap[tipo] || tipo)
          .join('|');
        params.cod_tipo_comprador = tiposCompradorFormateados;
      }

      const response = await fetchSiezaRows(valueSesion?.user?.tokens?.access || '', params);
      
        if (currentRequestId !== latestSearchRequestRef.current) return;

      if (response.data.data.length === 0) {
          setIsAlertError(true);
        setAlertErrorText('No se encontraron registros para los criterios de búsqueda.');
        }
      } catch (error) {
      console.error('Error al buscar registros del sistema contable:', error);  
        setIsAlertError(true);
      setAlertErrorText('Ocurrió un error al buscar los registros. Por favor, intente nuevamente.');
    }
  };

  // Manejo de botón "Limpiar"
  const handleLimpiar = async () => {
    // Limpiar el formulario
      clearForm();
    
    // Limpiar localStorage
    localStorage.removeItem('collectorSearchFormData');
    localStorage.removeItem('collectorInvoicesData');
    localStorage.removeItem('collectorInvoicesCurrentPage');

    // Limpiar los checkboxes y ubicación
    updateFormField('tipoComprador', []);
    updateFormField('departamento', '');
    updateFormField('municipio', '');
    setSelectedDepartment(null);

    // Limpiar datos del sistema contable
    clearSieza();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };




  const columns = [
    {
      key: 'fecha_registro',
      label: 'FECHA DE REGISTRO FACTURA',
      render: (value: any) => formatDate(value)
    },
    { key: 'no_factura_unica', label: 'N° FACTURA ÚNICA', render: (value: any) => formatNumber(value) },
    {
      key: 'fecha_compra',
      label: 'FECHA DE COMPRA',
      render: (value: any) => formatDate(value)
    },
    {
      key: 'nit_cc_recaudador',
      label: 'NIT/CC RECAUDADOR',
      render: (value: any) => value
    },
    {
      key: 'nombre_recaudador',
      label: 'NOMBRE RECAUDADOR',
      render: (value: any) => value
    },
    { key: 'departamento_procedencia_cacao', label: 'DEPARTAMENTO' },
    { key: 'municipio_procedencia_cacao', label: 'MUNICIPIO' },
    {
      key: 'total_kilos',
      label: 'TOTAL KILOS',
      render: (value: any) => formatNumberWithCommas(value)
    },
    {
      key: 'valor_cuota_fomento',
      label: 'VALOR CUOTA DE FOMENTO',
      render: (value: any) => formatCurrency(value)
    },
    {
      key: 'valor_intereses',
      label: 'VALOR INTERESES',
      render: (value: any) => formatCurrency(value)
    },
    {
      key: 'mes_recaudo',
      label: 'MES RECAUDO',
      render: (value: any) => value
    },
  ];

  // Columnas específicas para Excel
  const columnasExcel = [
    { key: 'fecha_registro', label: 'FECHA DE REGISTRO FACTURA' },
    { key: 'no_factura_unica', label: 'N° FACTURA ÚNICA' },
    { key: 'fecha_compra', label: 'FECHA DE COMPRA' },
    { key: 'nit_cc_recaudador', label: 'NIT/CC RECAUDADOR' },
    { key: 'nombre_recaudador', label: 'NOMBRE RECAUDADOR' },
    { key: 'departamento_procedencia_cacao', label: 'DEPARTAMENTO' },
    { key: 'municipio_procedencia_cacao', label: 'MUNICIPIO' },
    { key: 'total_kilos', label: 'TOTAL KILOS' },
    { key: 'valor_cuota_fomento', label: 'VALOR CUOTA DE FOMENTO' },
    { key: 'valor_intereses', label: 'VALOR INTERESES' },
    { key: 'mes_recaudo', label: 'MES RECAUDO' }
  ];



  // Paginación
  const handlePageChange = (newPage: number) => {
    handleSiezaPageChange(newPage, valueSesion?.user?.tokens?.access || '');
  };




  // Función para obtener datos para Excel (sin actualizar la tabla)
  const fetchDataForExcel = async () => {
    const params: GetSiezaConsultaParams = {
        sin_paginacion: true
      };

    // Mapear los parámetros del formulario a los parámetros de SIEZA
      if (formData.tipoDocumento) params.tipo_documento_proveedor = formData.tipoDocumento;
      if (formData.documentoIdentificacion) params.numero_documento_proveedor = formData.documentoIdentificacion;
      if (formData.razonSocial) params.nombre_proveedor = formData.razonSocial;
      if (formData.primer_nombre) params.recaudador_nombre = formData.primer_nombre;
      if (formData.primer_apellido) params.recaudador_apellido = formData.primer_apellido;
    if (formData.departamento) params.id_departamento_cacao = parseInt(formData.departamento);
    if (formData.municipio) params.id_municipio_cacao = parseInt(formData.municipio);
      if (formData.fechaInicio) params.fecha_desde = formatDateForApi(formData.fechaInicio);
      if (formData.fechaFin) params.fecha_hasta = formatDateForApi(formData.fechaFin);
    if (formData.nroFacturaUnica) params.no_factura_unica = parseInt(formData.nroFacturaUnica);
      if (formData.tipoComprador && formData.tipoComprador.length > 0) {
        const tipoCompradorMap: { [key: string]: string } = {
          'Procesador': 'P',
          'Exportador': 'E',
          'Comerciante': 'C'
        };
        const tiposCompradorFormateados = formData.tipoComprador
          .map(tipo => tipoCompradorMap[tipo] || tipo)
          .join('|');
        params.cod_tipo_comprador = tiposCompradorFormateados;
      }

      // Llamada directa al adapter sin actualizar el estado
    const { getSiezaConsulta } = await import('../adapters/sieza.consulta.get');
    const response = await getSiezaConsulta(valueSesion?.user?.tokens?.access || '', params);
    
    return {
      ...response,
      data: response.data.data,
      columns: columnasExcel // Incluir las columnas específicas para Excel
    };
  };

  // Función original para la tabla (con paginación normal)
  const fetchAllData = async (page: number) => {
    const params: GetSiezaConsultaParams = {
        page,
        page_size: 10
      };

    // Mapear los parámetros del formulario a los parámetros de SIEZA
      if (formData.tipoDocumento) params.tipo_documento_proveedor = formData.tipoDocumento;
      if (formData.documentoIdentificacion) params.numero_documento_proveedor = formData.documentoIdentificacion;
      if (formData.razonSocial) params.nombre_proveedor = formData.razonSocial;
      if (formData.primer_nombre) params.recaudador_nombre = formData.primer_nombre;
      if (formData.primer_apellido) params.recaudador_apellido = formData.primer_apellido;
    if (formData.departamento) params.id_departamento_cacao = parseInt(formData.departamento);
    if (formData.municipio) params.id_municipio_cacao = parseInt(formData.municipio);
      if (formData.fechaInicio) params.fecha_desde = formatDateForApi(formData.fechaInicio);
      if (formData.fechaFin) params.fecha_hasta = formatDateForApi(formData.fechaFin);
    if (formData.nroFacturaUnica) params.no_factura_unica = parseInt(formData.nroFacturaUnica);
      if (formData.tipoComprador && formData.tipoComprador.length > 0) {
        const tipoCompradorMap: { [key: string]: string } = {
          'Procesador': 'P',
          'Exportador': 'E',
          'Comerciante': 'C'
        };
        const tiposCompradorFormateados = formData.tipoComprador
          .map(tipo => tipoCompradorMap[tipo] || tipo)
          .join('|');
        params.cod_tipo_comprador = tiposCompradorFormateados;
      }

    const response = await fetchSiezaRows(valueSesion?.user?.tokens?.access || '', params);
    return {
      data: response.data.data,
      total_pages: response.total_pages
    };
  };

  // Función personalizada para exportar Excel con múltiples hojas (comprobante SIEZA)
  const customExcelExporter = async () => {
    try {
      // Obtener datos del comprobante SIEZA con todos los filtros seleccionados
      const paramsComprobante: GetSiezaComprobanteParams = {
        fecha_inicio: formData.fechaInicio ? formatDateForApi(formData.fechaInicio) : undefined,
        fecha_fin: formData.fechaFin ? formatDateForApi(formData.fechaFin) : undefined,
        factura_unica: formData.nroFacturaUnica ? parseInt(formData.nroFacturaUnica) : undefined,
        municipio: formData.municipio || undefined,
        departamento: formData.departamento || undefined,
        numero_documento: formData.documentoIdentificacion || undefined,
        tipo_documento: formData.tipoDocumento || undefined,
      };
      const comprobanteResponse = await fetchComprobante(
        valueSesion?.user?.tokens?.access || '',
        paramsComprobante
      );
      
      if (!comprobanteResponse.success) {
        throw new Error('No se pudieron obtener los datos del comprobante');
      }

      // Crear las hojas del Excel
      const sheets = [];

      // Hoja 1: Inicial
      if (comprobanteResponse.Inicial) {
        sheets.push({
          name: 'Inicial',
          columns: [
            { key: 'COMPAÑIA', label: 'COMPAÑIA' }
          ],
          data: [comprobanteResponse.Inicial]
        });
      }

      // Hoja 2: DocumentoContable
      if (comprobanteResponse.DocumentoContable && comprobanteResponse.DocumentoContable.length > 0) {
        sheets.push({
          name: 'DocumentoContable',
          columns: [
            { key: 'COMPAÑIA', label: 'COMPAÑIA' },
            { key: 'CONSECUTIVO', label: 'CONSECUTIVO' },
            { key: 'FECHA DOCUMENTO', label: 'FECHA DOCUMENTO' },
            { key: 'TERCERO', label: 'TERCERO' },
            { key: 'OBSERVACIONES', label: 'OBSERVACIONES' }
          ],
          data: comprobanteResponse.DocumentoContable
        });
      }

      // Hoja 3: Movimientocontable
      if (comprobanteResponse.Movimientocontable && comprobanteResponse.Movimientocontable.length > 0) {
        // Procesar los datos antes de pasarlos
        const movimientocontableProcessed = comprobanteResponse.Movimientocontable.map((row: any) => ({
          ...row,
          'Valor debito': (row['Valor debito'] !== null && row['Valor debito'] !== undefined && row['Valor debito'] !== '') ? row['Valor debito'] : 0,
          'Valor debito libro 2': (row['Valor debito libro 2'] !== null && row['Valor debito libro 2'] !== undefined && row['Valor debito libro 2'] !== '') ? row['Valor debito libro 2'] : 0,
          'Valor debito libro 3': (row['Valor debito libro 3'] !== null && row['Valor debito libro 3'] !== undefined && row['Valor debito libro 3'] !== '') ? row['Valor debito libro 3'] : 0,
          'Mes recaudo': row['mes_pago'] || ''
        }));
        
        sheets.push({
          name: 'Movimientocontable',
          columns: [
            { key: 'COMPAÑIA', label: 'COMPAÑIA' },
            { key: 'TIPO DE DOCUMENTO', label: 'TIPO DE DOCUMENTO' },
            { key: 'Numero de documento', label: 'Numero de documento' },
            { key: 'Auxiliar de cuenta contable', label: 'Auxiliar de cuenta contable' },
            { key: 'Tercero', label: 'Tercero' },
            { key: 'Centro de operación del movimiento', label: 'Centro de operación del movimiento' },
            { key: 'Unidad de negocio', label: 'Unidad de negocio' },
            { key: 'Valor debito', label: 'Valor debito' },
            { key: 'Valor crédito', label: 'Valor crédito' },
            { key: 'Valor debito libro 2', label: 'Valor debito libro 2' },
            { key: 'Valor crédito libro 2', label: 'Valor crédito libro 2' },
            { key: 'Valor debito libro 3', label: 'Valor debito libro 3' },
            { key: 'Valor crédito libro 3', label: 'Valor crédito libro 3' },
            { key: 'Mes recaudo', label: 'Mes recaudo' },
          ],
          data: movimientocontableProcessed
        });
      }

      // Hoja 4: MovimientoCxC
      if (comprobanteResponse.MovimientoCxC && comprobanteResponse.MovimientoCxC.length > 0) {
        // Procesar los datos antes de pasarlos
        const movimientoCxCProcessed = comprobanteResponse.MovimientoCxC.map((row: any) => ({
          ...row,
          'Valor debito': (row['Valor debito'] !== null && row['Valor debito'] !== undefined && row['Valor debito'] !== '') ? row['Valor debito'] : 0,
          'Valor debito libro 2': (row['Valor debito libro 2'] !== null && row['Valor debito libro 2'] !== undefined && row['Valor debito libro 2'] !== '') ? row['Valor debito libro 2'] : 0,
          'Valor crédito': (row['Valor crédito'] !== null && row['Valor crédito'] !== undefined && row['Valor crédito'] !== '') ? row['Valor crédito'] : 0,
          'Valor crédito libro 2': (row['Valor crédito libro 2'] !== null && row['Valor crédito libro 2'] !== undefined && row['Valor crédito libro 2'] !== '') ? row['Valor crédito libro 2'] : 0,
          'Mes recaudo': row['mes_recaudo'] || ''
        }));
        
        sheets.push({
          name: 'MovimientoCxC',
          columns: [
            { key: 'Compañía', label: 'Compañía' },
            { key: 'Centro de operación del documento', label: 'Centro de operación del documento' },
            { key: 'Tipo de documento', label: 'Tipo de documento' },
            { key: 'Numero de documento 00', label: 'Numero de documento 00' },
            { key: 'Auxiliar de cuenta contable', label: 'Auxiliar de cuenta contable' },
            { key: 'Tercero', label: 'Tercero' },
            { key: 'Centro de operación del movimiento', label: 'Centro de operación del movimiento' },
            { key: 'Unidad de negocio', label: 'Unidad de negocio' },
            { key: 'Valor debito', label: 'Valor debito' },
            { key: 'Valor crédito', label: 'Valor crédito' },
            { key: 'Valor debito libro 2', label: 'Valor debito libro 2' },
            { key: 'Valor crédito libro 2', label: 'Valor crédito libro 2' },
            { key: 'Observaciones del movimiento', label: 'Observaciones del movimiento' },
            { key: 'Sucursal cliente', label: 'Sucursal cliente' },
            { key: 'Numero de documento de cruce', label: 'Numero de documento de cruce' },
            { key: 'Fecha de vencimiento del documento', label: 'Fecha de vencimiento del documento' },
            { key: 'Fecha de pronto pago del documento', label: 'Fecha de pronto pago del documento' },
            { key: 'Tercero vendedor', label: 'Tercero vendedor' },
            { key: 'Fecha del documento de cruce', label: 'Fecha del documento de cruce' },
            { key: 'Fecha de radicacion', label: 'Fecha de radicacion' },
            { key: 'Mes recaudo', label: 'Mes recaudo' }
          ],
          data: movimientoCxCProcessed
        });
      }

      // Hoja 5: Final
      if (comprobanteResponse.Final) {
        sheets.push({
          name: 'Final',
          columns: [
            { key: 'Compañía', label: 'Compañía' }
          ],
          data: [comprobanteResponse.Final]
        });
      }

      return {
        sheets,
        fileName: 'Comprobante_SIEZA.xlsx',
        columns: [], // Propiedad requerida pero no usada cuando hay sheets
        data: [] // Propiedad requerida pero no usada cuando hay sheets
      };
    } catch (error) {
      console.error('Error al generar comprobante Excel:', error);
      throw error;
    }
  };

  const isDarkMode = mounted && theme === 'dark';

  if (!mounted) {
    return null;
  }

  return (
    <div className={`space-y-6 md:p-6 ${isDarkMode ? 'text-white' : ''}`}>

      <AlertLoader
        isOpen={false}                               
        loadingText="Generando documento, por favor espere…"
      />

      <AlertSuccess
        isOpen={success}
        message="Operación exitosa"
        onClose={() => setSuccess(false)}
      />

      <AlertError
        isOpen={isAlertError}
        message={alertErrorText}
        onClose={() => setIsAlertError(false)}
      />

      <AlertQuestion
        isOpen={isAlertQuestion}
        questionText=""
        onClose={() => setIsAlertQuestion(false)}
        onConfirm={() => setIsAlertQuestion(true)}
      />

      <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
        <div className={`rounded-xl p-4 sm:p-5 lg:p-6 relative ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>

        <button
          onClick={() => router.push('/')}
          className={`absolute top-2 right-2 sm:right-4 text-xl sm:text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
        >
          &times;
        </button>
          <h1
            className={` text-xl sm:text-2xl lg:text-3xl font-bold text-center my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
          >
            INTEGRACIÓN SISTEMA CONTABLE
          </h1>

          <div className="grid md:grid-cols-3 gap-6">
            <AnimatedSelect
              label="Tipo de Documento"
              name="tipoDocumento"
              value={formData.tipoDocumento || ''}
              onChange={handleSelectChange}
              options={types.map(type => ({
                key: type.cod_tipo_documento,
                value: type.cod_tipo_documento,
                title: type.nombre
              }))}
              error={!!validationErrors.tipoDocumento}
              disabled={!(isInternalUser === true)}
              darkMode={isDarkMode}
            />
            <AnimatedInput
              label="Número de Documento"
              name="documentoIdentificacion"
              value={formData.documentoIdentificacion || ''}
              onChange={handleInputChange}
              type="text"
              error={!!validationErrors.documentoIdentificacion}
              disabled={!(isInternalUser === true)}
              darkMode={isDarkMode}
            />

            <AnimatedSelect
              label="Departamento"
              name="departamento"
              value={formData.departamento || ''}
              onChange={handleDepartmentChange}
              options={getDepartmentOptions()}
              darkMode={isDarkMode}
            />

          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-6">

            <div className="col-span-2">
              <AnimatedInput
                label="Razón Social"
                name="razonSocial"
                value={isInternalUser ? (formData.razonSocial || '') : `${formData.primer_nombre || ''} ${formData.segundo_nombre || ''} ${formData.primer_apellido || ''} ${formData.segundo_apellido || ''}`.trim()}
                onChange={handleInputChange}
                type="text"
                disabled={!(isInternalUser === true)}
                darkMode={isDarkMode}
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <AnimatedSelect
                label="Municipio"
                name="municipio"
                value={formData.municipio || ''}
                onChange={handleSelectChange}
                options={getCityOptions()}
                darkMode={isDarkMode}
              />
            </div>
            
            <div></div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:mt-0 ">
            <AnimatedInput
              label="Factura única"
              name="nroFacturaUnica"
              value={formData.nroFacturaUnica || ''}
              onChange={handleInputChange}
              type="number"
              darkMode={isDarkMode}
            />
            <AnimatedInput
              label="Fecha de Inicio"
              name="fechaInicio"
              value={formData.fechaInicio || ''}
              onChange={handleInputChange}
              type="date"
              darkMode={isDarkMode}
            />
            <AnimatedInput
              label="Fecha de finalización"
              name="fechaFin"
              value={formData.fechaFin || ''}
              onChange={handleInputChange}
              type="date"
              darkMode={isDarkMode}
            />
          </div>

          <div className="flex justify-center gap-4 mt-6">
            <Button title="Limpiar" onClick={handleLimpiar} />
            <Button title="Buscar" onClick={handleSearch} />
            <Button title="Salir" onClick={() => router.push('/')} />
          </div>
        </div>

        {/* Tabla de resultados */}
        <div className={`${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'} rounded-3xl mt-6 shadow-md p-6`}>
      
          <DynamicTable
            columns={columns}
            data={siezaRows}
            isLoading={isLoadingSieza}
            currentPage={siezaCurrentPage}
            totalPages={siezaTotalPages}
            onPageChange={handlePageChange}
            fetchAllData={fetchAllData}
            fetchDataForExcel={fetchDataForExcel}
            customExcelExporter={customExcelExporter}
          />

          <div className="flex flex-col md:flex-row md:justify-end gap-4 mt-6">
            
            <div className="hidden md:block md:w-[50%]">
              
            </div>

            <div className="flex flex-col md:flex-row md:items-end gap-4 w-full md:w-[50%]">
            <div className="w-full">
            <AnimatedInput
              label="TOTAL CF"
              labelSize="sm"
              name="totalValorCuotaFomento"
              value={formatCurrency(totalCuotaFomento.toString())}
              onChange={() => {}} // Solo lectura
              type="text"
              disabled={true}
              darkMode={isDarkMode}
            />
            </div>
            <div className="w-full">
            <AnimatedInput
              label="TOTAL INTERESES"
              labelSize="sm"
              name="totalIntereses"
              value={formatCurrency(totalIntereses.toString())}
              onChange={() => {}} // Solo lectura
              type="text"
              disabled={true}
              darkMode={isDarkMode}
            />
            </div>
            </div>
            
          </div>

        </div>
      </div>
    </div>
  );
};

export default SearchCollectors;
