'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from 'next-themes';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { Visibility, Edit, FileDownload } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useSearchCollectors from '@/app/(Component)/(ComponentDashboard)/recaudadores/consultar_factura/hooks/useSearchCollectors';
import useCollectorInvoicesExternal from '@/application/recaudadores/factura/useCollectorInvoicesExternal';
import useCollectorInvoicesInternal from '@/application/recaudadores/factura/useCollectorInvoicesInternal';
import { useTypeDni } from '@/application/dni/useTypeDni';
import useGetDepartments from '@/application/address/useGetDepartmentsCacao';
import { useGetCities } from '@/application/address/useGetCities';
import { useUserProfile } from '@/application/user/useUserProfile';
import { formatNumber, formatCurrency, formatNumberWithCommas,  } from '@/utils/formatters';
import { useInvoiceDetails } from '@/application/recaudadores/factura/useInvoiceDetailts';
import useComprasTotales from '../hooks/useComprasTotales';
import useFacturaZip from '../hooks/useFacturaZip';
import Swal from 'sweetalert2';

// alertas de fedecacao
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertQuestion from '@/presenters/components/recaudadores/AlertQuestion';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import { usePlantillasDocumento } from '@/application/documento/usePlantillasDocumento';
import { useWordToPdf } from '@/application/documento/useWordToPdf';
import { useGeneradorDocumento } from '@/application/documento/useGeneradorDocumento';
import { obtenerNombreMes, obtenerDia, obtenerAnio } from '@/utils/dateUtils';
import { downloadOrOpen  } from '@/utils/forceDownload';
import { getInvoiceDetails } from '@/adapters/recaudadores/facturas/collector.DetailsInvoices';

const SearchCollectors = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [isInternalUser, setIsInternalUser] = useState<boolean | null>(null);

  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [hasLoadedDepartments, setHasLoadedDepartments] = useState(false);

  const [hasFetchedTypes, setHasFetchedTypes] = useState(false);
  const [alreadySetProfileData, setAlreadySetProfileData] = useState(false);
  const [idPlantilla, setIdPlantilla] = useState<number | null>(null);

  // notificaciones
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successText, setSuccessText] = useState('');
  const [isAlertError, setIsAlertError] = useState(false);
  const [alertErrorText, setAlertErrorText] = useState('');
  const [isAlertQuestion, setIsAlertQuestion] = useState(false);
  const [alertQuestionText, setAlertQuestionText] = useState('');
  

  const {
    departments,
    fetchDepartments
  } = useGetDepartments();

  const { convertToPdf } = useWordToPdf();



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

  const {
    fullInvoices,
    isLoading: isLoadingInvoices,
    currentPage,
    totalPages: invoicesTotalPages,
    fetchInvoices,
    handlePageChange: handleInvoicesPageChange,
    setInvoicesData,
    clearInvoices
  } = useCollectorInvoicesExternal();

  const {
    invoices: internalInvoices,
    isLoading: isLoadingInternalInvoices,
    currentPage: internalCurrentPage,
    totalPages: internalTotalPages,
    fetchInvoices: fetchInternalInvoices,
    clearInvoices: clearInternalInvoices
  } = useCollectorInvoicesInternal();

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });
  const valueSesion: any = session;
  const { profile } = useUserProfile(valueSesion?.user?.tokens?.access || '');

  const { cities, loading: loadingCities, error: citiesError } = useGetCities({
    departamentoId: selectedDepartment || 0,
    token: valueSesion?.user?.tokens?.access || ''
  });

  const { plantillas, error: errorPlantillas } = usePlantillasDocumento({
    token: valueSesion?.user?.tokens?.access || '',
    nombre: 'Factura Unica Nacional'
  });

  useEffect(() => {
    if (plantillas?.data?.length) {
      setIdPlantilla(plantillas.data[0].id_plantilla_doc);
    }
  }, [plantillas]);

  const { generarDocumento } = useGeneradorDocumento({
    token: valueSesion?.user?.tokens?.access || '',
    id_plantilla_doc: idPlantilla || 0
  });

  const latestSearchRequestRef = useRef(0);

  // Hook para obtener totales de compras
  const {
    comprasTotales,
    fetchComprasTotales
  } = useComprasTotales();

  // Hook para generar ZIP de facturas
  const {
    isLoading: isLoadingZip,
    generateZip,
    clearZipData
  } = useFacturaZip();

  // Estado para manejar la selección de facturas
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);

  // Función para manejar la selección de facturas
  const handleSelectInvoice = (nroFactura: number) => {
    setSelectedInvoices(prev => {
      if (prev.includes(nroFactura)) {
        // Deseleccionar
        return prev.filter(num => num !== nroFactura);
      } else {
        // Seleccionar solo si no excede el límite de 10
        if (prev.length >= 10) {
          setIsAlertError(true);
          setAlertErrorText('Solo puedes seleccionar un máximo de 10 facturas');
          return prev;
        }
        return [...prev, nroFactura];
      }
    });
  };

  // Función para seleccionar/deseleccionar todas las facturas de la página actual
  const toggleSelectAllInvoices = () => {
    const currentPageInvoices = isInternalUser ? internalInvoices : fullInvoices;
    const allSelected = currentPageInvoices.every(invoice => 
      selectedInvoices.includes(invoice.nro_factura_unica)
    );

    if (allSelected) {
      // Deseleccionar todas las facturas de la página actual
      setSelectedInvoices(prev => 
        prev.filter(selected => 
          !currentPageInvoices.some(invoice => invoice.nro_factura_unica === selected)
        )
      );
    } else {
      // Seleccionar todas las facturas de la página actual
      const newSelections = currentPageInvoices
        .filter(invoice => !selectedInvoices.includes(invoice.nro_factura_unica))
        .map(invoice => invoice.nro_factura_unica);
      
      // Verificar límite de 10
      const totalAfterSelection = selectedInvoices.length + newSelections.length;
      if (totalAfterSelection > 10) {
        setIsAlertError(true);
        setAlertErrorText('Solo puedes seleccionar un máximo de 10 facturas');
        return;
      }
      
      setSelectedInvoices(prev => [...prev, ...newSelections]);
    }
  };

  // Verificar si todas las facturas de la página actual están seleccionadas
  const areAllCurrentPageInvoicesSelected = () => {
    const currentPageInvoices = isInternalUser ? internalInvoices : fullInvoices;
    if (currentPageInvoices.length === 0) return false;
    return currentPageInvoices.every(invoice => 
      selectedInvoices.includes(invoice.nro_factura_unica)
    );
  };

  // Limpiar selección al cambiar de página
  useEffect(() => {
    setSelectedInvoices([]);
  }, [currentPage, internalCurrentPage]);

  useEffect(() => {
    if (!valueSesion?.user?.tipo_usuario) return; // Esperamos a tener el dato
    if (valueSesion.user.tipo_usuario === 'I') {
      setIsInternalUser(true);
    } else if (valueSesion.user.tipo_usuario === 'E') {
      setIsInternalUser(false);
    }
  }, [valueSesion?.user?.tipo_usuario]);

  // <<<< Efecto para carga inicial si es usuario interno
  useEffect(() => {
    // Esperamos a que 'isInternalUser' ya no sea null
    if (isInternalUser === null) return;
    if (isInternalUser && valueSesion?.user?.tokens?.access && !hasLoadedInitialData) {
      const loadInitialInternalInvoices = async () => {
        try {
          const defaultParams = { page: 1, page_size: 10 };
          await fetchInternalInvoices(valueSesion.user.tokens.access, defaultParams);
          setHasLoadedInitialData(true);
        } catch (error) {
          console.error('Error al cargar facturas internas iniciales:', error);
        }
      };

      loadInitialInternalInvoices();
    }
  }, [
    isInternalUser,
    valueSesion?.user?.tokens?.access,
    fetchInternalInvoices,
    hasLoadedInitialData
  ]);

  // <<<< Efecto para carga inicial si es usuario externo
  useEffect(() => {
    // Esperamos a que 'isInternalUser' ya no sea null
    if (isInternalUser === null) return;
    if (!isInternalUser && valueSesion?.user?.tokens?.access && !hasLoadedInitialData) {
      fetchInvoices(valueSesion.user.tokens.access, []);
      setHasLoadedInitialData(true);
    }
  }, [
    isInternalUser,
    valueSesion?.user?.tokens?.access,
    fetchInvoices,
    hasLoadedInitialData
  ]);

  // <<<< Efecto para cargar totales iniciales
  useEffect(() => {
    if (isInternalUser !== null && valueSesion?.user?.tokens?.access && !hasLoadedInitialData) {
      // Cargar totales iniciales sin filtros
      fetchComprasTotales(valueSesion.user.tokens.access);
    }
  }, [
    isInternalUser,
    valueSesion?.user?.tokens?.access,
    hasLoadedInitialData,
    fetchComprasTotales
  ]);

  useEffect(() => {
    if (isInternalUser === null) return; // Aún no sabemos si es externo
    if (!isInternalUser && profile && !alreadySetProfileData) {
      setAlreadySetProfileData(true);

      updateFormField('tipoDocumento', profile.persona.tipo_documento || '');
      updateFormField('documentoIdentificacion', profile.persona.numero_documento || '');
      updateFormField('razonSocial', profile.persona.razon_social || '');
      updateFormField('primer_nombre', profile.persona.primer_nombre || '');
      updateFormField('segundo_nombre', profile.persona.segundo_nombre || '');
      updateFormField('primer_apellido', profile.persona.primer_apellido || '');
      updateFormField('segundo_apellido', profile.persona.segundo_apellido || '');
      // Por defecto, no prellenar departamento y municipio para permitir selección manual
      updateFormField('departamento', '');
      updateFormField('municipio', '');
      setSelectedDepartment(null);

      // Manejar el cod_tipo_comprador
      if (profile.persona.cod_tipo_comprador) {
        const tiposComprador = profile.persona.cod_tipo_comprador.split('|');
        const tiposSeleccionados: string[] = [];

        for (const tipo of tiposComprador) {
          const tipoLimpio = tipo.trim();
          switch (tipoLimpio) {
            case 'P':
              tiposSeleccionados.push('Procesador');
              break;
            case 'E':
              tiposSeleccionados.push('Exportador');
              break;
            case 'C':
              tiposSeleccionados.push('Comerciante');
              break;
          }
        }

        updateFormField('tipoComprador', tiposSeleccionados);
      }
    }
  }, [
    isInternalUser,
    profile,
    alreadySetProfileData,
    updateFormField
  ]);

  useEffect(() => {
    if (isInternalUser) {
      updateFormField('tipoDocumento', '');
      updateFormField('documentoIdentificacion', '');
      updateFormField('razonSocial', '');
      updateFormField('primer_nombre', '');
      updateFormField('segundo_nombre', '');
      updateFormField('primer_apellido', '');
      updateFormField('segundo_apellido', '');
      updateFormField('departamento', '');
      updateFormField('municipio', '');
      setSelectedDepartment(null);
    } else {
      // Para externos, por defecto también en blanco departamento y municipio
      updateFormField('departamento', '');
      updateFormField('municipio', '');
      setSelectedDepartment(null);
    }
  }, [isInternalUser, updateFormField]);

  // Nuevo efecto para limpiar al montar el componente
  useEffect(() => {
    // Limpiar el formulario
    clearForm();
    
    // Limpiar localStorage
    localStorage.removeItem('collectorSearchFormData');
    localStorage.removeItem('collectorInvoicesData');
    localStorage.removeItem('collectorInvoicesCurrentPage');
  }, []); // Se ejecuta solo al montar el componente

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
        const parsedInvoices = JSON.parse(savedInvoices);
        setInvoicesData(parsedInvoices);
        handleInvoicesPageChange(parseInt(savedCurrentPage));
      } catch (error) {
        console.error('Error parsing invoices data from localStorage:', error);
      }
    }
  }, [isInitialLoad]);

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

  // Guardar facturas en localStorage
  useEffect(() => {
    if (!isInitialLoad && fullInvoices.length > 0) {
      localStorage.setItem('collectorInvoicesData', JSON.stringify(fullInvoices));
      localStorage.setItem('collectorInvoicesCurrentPage', currentPage.toString());
    }
  }, [fullInvoices, currentPage, isInitialLoad]);

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
      if (!hasLoadedDepartments) {
        try {
          await fetchDepartments();
          setHasLoadedDepartments(true);
        } catch (error) {
          console.error('Error fetching departments:', error);
        }
      }
    };
    loadDepartments();
  }, [hasLoadedDepartments, fetchDepartments]);

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

  // Función para construir parámetros de búsqueda para totales
  const buildTotalesParams = () => {
    const params: any = {};
    
    if (formData.departamento) params.id_departamento_cacao = formData.departamento;
    if (formData.municipio) params.id_municipio_cacao = formData.municipio;
    if (formData.fechaInicio) params.fecha_desde = formatDateForApi(formData.fechaInicio);
    if (formData.fechaFin) params.fecha_hasta = formatDateForApi(formData.fechaFin);
    if (formData.nroFacturaUnica) params.nro_factura_unica = parseInt(formData.nroFacturaUnica);
    
    return params;
  };

  // Función para la búsqueda
  const handleSearch = async () => {
    const currentRequestId = ++latestSearchRequestRef.current;

    if (isInternalUser) {
      clearInternalInvoices();
      const params: any = {
        page: 1,
        page_size: 10
      };
      if (formData.tipoDocumento) params.tipo_documento_proveedor = formData.tipoDocumento;
      if (formData.documentoIdentificacion) params.numero_documento_proveedor = formData.documentoIdentificacion;
      if (formData.razonSocial) params.nombre_proveedor = formData.razonSocial;
      if (formData.primer_nombre) params.recaudador_nombre = formData.primer_nombre;
      if (formData.primer_apellido) params.recaudador_apellido = formData.primer_apellido;
      if (formData.departamento) params.id_departamento_cacao = formData.departamento;
      if (formData.municipio) params.id_municipio_cacao = formData.municipio;
      if (formData.fechaInicio) params.fecha_desde = formatDateForApi(formData.fechaInicio);
      if (formData.fechaFin) params.fecha_hasta = formatDateForApi(formData.fechaFin);
      if (formData.nroFacturaUnica) params.nro_factura_unica = parseInt(formData.nroFacturaUnica);
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

      try {
        const response = await fetchInternalInvoices(valueSesion?.user?.tokens?.access, params);
        if (currentRequestId !== latestSearchRequestRef.current) return;

        if (response.data.length === 0) {
          setIsAlertError(true);
          setAlertErrorText('No se encontraron facturas para los criterios de búsqueda.');
        }

        // Actualizar totales con los mismos parámetros de búsqueda
        const totalesParams = buildTotalesParams();
        await fetchComprasTotales(valueSesion?.user?.tokens?.access, totalesParams);
      } catch (error) {
        console.error('Error al buscar facturas:', error);  
        setIsAlertError(true);
        setAlertErrorText('Ocurrió un error al buscar las facturas. Por favor, intente nuevamente.');
      }
    } else {
      clearInvoices();
      if (valueSesion?.user?.tokens?.access) {
        const params: any = {
          page: 1,
          page_size: 10
        };
        if (formData.nroFacturaUnica) params.nro_factura_unica = parseInt(formData.nroFacturaUnica);
        if (formData.fechaInicio) params.fecha_desde = formatDateForApi(formData.fechaInicio);
        if (formData.fechaFin) params.fecha_hasta = formatDateForApi(formData.fechaFin);
        if (formData.departamento) params.id_departamento_cacao = parseInt(formData.departamento);
        if (formData.municipio) params.id_municipio_cacao = parseInt(formData.municipio);
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

        try {
          await fetchInvoices(valueSesion.user.tokens.access, [], 1, params);
          
          // Actualizar totales con los mismos parámetros de búsqueda
          const totalesParams = buildTotalesParams();
          await fetchComprasTotales(valueSesion?.user?.tokens?.access, totalesParams);
        } catch (error) {
          console.error('Error al buscar facturas:', error);
          setIsAlertError(true);
          setAlertErrorText('Ocurrió un error al buscar las facturas. Por favor, intente nuevamente.');
        }
      }
    }
  };

  // Manejo de botón "Limpiar"
  const handleLimpiar = async () => {
    // Limpiar el formulario
    if (isInternalUser) {
      // Interno: limpiar todo
      clearForm();
    } else {
      // Externo: preservar tipoDocumento, documento, razonSocial y nombres
      const preserved = {
        tipoDocumento: formData.tipoDocumento || '',
        documentoIdentificacion: formData.documentoIdentificacion || '',
        razonSocial: formData.razonSocial || '',
        primer_nombre: (formData as any).primer_nombre || '',
        segundo_nombre: (formData as any).segundo_nombre || '',
        primer_apellido: (formData as any).primer_apellido || '',
        segundo_apellido: (formData as any).segundo_apellido || ''
      } as any;

      clearForm();

      updateFormField('tipoDocumento', preserved.tipoDocumento);
      updateFormField('documentoIdentificacion', preserved.documentoIdentificacion);
      updateFormField('razonSocial', preserved.razonSocial);
      updateFormField('primer_nombre', preserved.primer_nombre);
      updateFormField('segundo_nombre', preserved.segundo_nombre);
      updateFormField('primer_apellido', preserved.primer_apellido);
      updateFormField('segundo_apellido', preserved.segundo_apellido);
    }
    
    // Limpiar localStorage (pero reescribir con lo preservado en externos)
    localStorage.removeItem('collectorSearchFormData');
    localStorage.removeItem('collectorInvoicesData');
    localStorage.removeItem('collectorInvoicesCurrentPage');

    // Limpiar los checkboxes y ubicación
    updateFormField('tipoComprador', []);
    updateFormField('departamento', '');
    updateFormField('municipio', '');
    setSelectedDepartment(null);

    if (isInternalUser) {
      clearInternalInvoices();
      if (valueSesion?.user?.tokens?.access) {
        const defaultParams = { page: 1, page_size: 10 };
        try {
          await fetchInternalInvoices(valueSesion.user.tokens.access, defaultParams);
          // Actualizar totales sin filtros
          await fetchComprasTotales(valueSesion.user.tokens.access);
        } catch (error) {
          console.error('Error al cargar facturas internas:', error);
          setIsAlertError(true);
          setAlertErrorText('Ocurrió un error al cargar las facturas. Por favor, intente nuevamente.');
        }
      }
    } else {
      if (valueSesion?.user?.tokens?.access) {
        try {
          await fetchInvoices(valueSesion.user.tokens.access, []);
          // Actualizar totales sin filtros
          await fetchComprasTotales(valueSesion.user.tokens.access);
        } catch (error) {
          console.error('Error al cargar facturas:', error);
          setIsAlertError(true);
          setAlertErrorText('Ocurrió un error al cargar las facturas. Por favor, intente nuevamente.');
        }
      }
    }
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

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [, setAllFacturas] = useState<any[]>([]);
  const [, setCurrentFacturaIndex] = useState<number>(0);
  const { data: invoiceDetails } = useInvoiceDetails(
    valueSesion?.user?.tokens?.access || '',
    selectedInvoiceId?.toString() || null
  );

  useEffect(() => {
    if (invoiceDetails?.data && invoiceDetails.data.length > 0) {
      setAllFacturas(invoiceDetails.data);
      setCurrentFacturaIndex(0);
    }
  }, [invoiceDetails]);

  // Función para generar y descargar el ZIP de facturas seleccionadas
  const handleGenerarZipFacturas = async () => {
    if (selectedInvoices.length === 0) {
      setIsAlertError(true);
      setAlertErrorText('Por favor selecciona al menos una factura para descargar');
      return;
    }

    if (selectedInvoices.length > 10) {
      setIsAlertError(true);
      setAlertErrorText('Solo puedes descargar un máximo de 10 facturas a la vez');
      return;
    }

    setLoadingDoc(true);

    try {
      const response = await generateZip(
        valueSesion?.user?.tokens?.access || '',
        selectedInvoices
      );

      if (response && response.url_descarga) {
        // Descargar automáticamente el archivo
        const link = document.createElement('a');
        link.href = response.url_descarga;
        link.download = `facturas_${selectedInvoices.length}_registros.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setSuccess(true);
        setSuccessText(`Se han descargado exitosamente ${selectedInvoices.length} factura(s) en formato ZIP`);
        
        // Limpiar la selección después de descargar
        setSelectedInvoices([]);
        clearZipData();
      } else {
        throw new Error('No se pudo obtener la URL de descarga');
      }
    } catch (error) {
      console.error('Error al generar ZIP:', error);
      setIsAlertError(true);
      setAlertErrorText(error instanceof Error ? error.message : 'Ocurrió un error al generar el archivo ZIP');
    } finally {
      setLoadingDoc(false);
    }
  };

  // Manejo de detalles de factura
  useEffect(() => {
    if (selectedInvoiceId && invoiceDetails?.data && invoiceDetails.data.length > 0) {
      // Solo actualizar si el ID coincide con el ID seleccionado actualmente
      if (invoiceDetails.data[0]?.id_factura_unica === selectedInvoiceId) {
        setAllFacturas(invoiceDetails.data);
        setCurrentFacturaIndex(0);
      }
    }
  }, [invoiceDetails, selectedInvoiceId]);

  // Limpiar estados cuando el componente se desmonta
  useEffect(() => {
    return () => {
      setSelectedInvoiceId(null);
      setAllFacturas([]);
      setCurrentFacturaIndex(0);
    };
  }, []);

  const columns = [
    {
      key: 'fecha_creacion',
      label: 'FECHA DE REGISTRO FACTURA',
      render: (value: any) => formatDate(value)
    },
    { key: 'nro_factura_unica', label: 'N° FACTURA ÚNICA', render: (value: any) => formatNumber(value) },
    {
      key: 'fecha_compra',
      label: 'FECHA DE COMPRA',
      render: (value: any) => formatDate(value)
    },
    {
      key: 'nro_documento_recaudador',
      label: 'DOCUMENTO RECAUDADOR',
      render: (value: any) => value
    },
    {
      key: 'nombre_persona_recaudador',
      label: 'NOMBRE RECAUDADOR',
      render: (value: any) => value
    },
    { key: 'nro_documento_proveedor', label: 'DOCUMENTO PROVEEDOR' },
    { key: 'nombre_persona_proveedor', label: 'NOMBRE PROVEEDOR' },
    { key: 'nombre_departamento_cacao', label: 'DEPARTAMENTO' },
    { key: 'nombre_municipio_cacao', label: 'MUNICIPIO' },
    { key: 'nombre_finca', label: 'NOMBRE FINCA' },
    { key: 'nombre_vereda', label: 'NOMBRE VEREDA' },
    {
      key: 'total_kilos',
      label: 'TOTAL KILOS',
      render: (value: any) => formatNumberWithCommas(value)
    },
    {
      key: 'cuota_fomento',
      label: 'CUOTA DE FOMENTO',
      render: (value: any) => '$' + formatNumber(value)
    },
    {
      key: 'cod_estado_liquidacion_display',
      label: 'ESTADO LIQUIDACION',
      render: (value: any) => value
    }
  ];

  // Columnas específicas para Excel con detalles expandidos
  const columnasExcel = [
    { key: 'fecha_creacion', label: 'FECHA DE REGISTRO FACTURA' },
    { key: 'nro_factura_unica', label: 'N° FACTURA ÚNICA' },
    { key: 'fecha_compra', label: 'FECHA DE COMPRA' },
    { key: 'nro_documento_recaudador', label: 'DOCUMENTO RECAUDADOR' },
    { key: 'nombre_persona_recaudador', label: 'NOMBRE RECAUDADOR' },
    { key: 'nro_documento_proveedor', label: 'DOCUMENTO PROVEEDOR' },
    { key: 'nombre_persona_proveedor', label: 'NOMBRE PROVEEDOR' },
    { key: 'nombre_departamento_cacao', label: 'DEPARTAMENTO' },
    { key: 'nombre_municipio_cacao', label: 'MUNICIPIO' },
    { key: 'nombre_finca', label: 'NOMBRE FINCA' },
    { key: 'nombre_vereda', label: 'NOMBRE VEREDA' },
    { key: 'total_kilos', label: 'KILOS' },
    { key: 'cuota_fomento', label: 'CUOTA DE FOMENTO' },
    { key: 'cod_estado_liquidacion_display', label: 'ESTADO LIQUIDACION' },
    { key: 'tipo_cacao', label: 'TIPO DE CACAO' },
    { key: 'kilos_detalle', label: 'KILOS DETALLE' },
    { key: 'precio_kilo', label: 'PRECIO X KILO' },
    { key: 'valor_bruto_detalle', label: 'VALOR BRUTO DETALLE' },
    { key: 'cuota_fomento_detalle', label: 'CUOTA FOMENTO DETALLE' },
    { key: 'valor_neto_detalle', label: 'VALOR NETO DETALLE' },
    { key: 'estado_liquidacion_detalle', label: 'ESTADO LIQUIDACION DETALLE' }
  ];

  // Columnas requeridas para el nuevo Excel solicitado
  const columnasExcelSolicitadas = [
    { key: 'nro_documento_recaudador', label: 'NIT RECAUDADOR' },
    { key: 'nombre_persona_recaudador', label: 'NOMBRE RECAUDADOR' },
    { key: 'tipo_cacao', label: 'TIPO DE CACAO' },
    { key: 'fecha_compra', label: 'FECHA DE COMPRA' },
    { key: 'nro_factura_unica', label: 'No FACTURA ÚNICA' },
    { key: 'nro_documento_proveedor', label: 'NIT PROVEEDOR' },
    { key: 'nombre_municipio_cacao', label: 'MUNICIPIO DE PROCEDENCIA' },
    { key: 'nombre_departamento_cacao', label: 'DEPARTAMENTO DE PROCEDENCIA' },
    { key: 'kilos_comprados', label: 'KILOS COMPRADOS' },
    { key: 'precio_kilo', label: 'PRECIO KILO' },
    { key: 'valor_bruto', label: 'VALOR BRUTO' },
    { key: 'valor_cuota_fomento', label: 'VALOR CUOTA DE FOMENTO' },
    { key: 'valor_neto', label: 'VALOR NETO' },
    { key: 'fecha_pago_liquidacion', label: 'FECHA DE PAGO' },
    { key: 'doc', label: 'DOC' }
  ];

  // Expansión específica para el Excel solicitado (una fila por detalle)
  const expandFacturasParaExcelSolicitado = (facturas: any[]) => {
    const expanded: any[] = [];
    facturas.forEach((factura) => {
      const base = {
        nro_documento_recaudador: factura.nro_documento_recaudador || '',
        nombre_persona_recaudador: factura.nombre_persona_recaudador || '',
        fecha_compra: formatDateForExcel(factura.fecha_compra),
        nro_factura_unica: Number(factura.nro_factura_unica ?? 0),
        nro_documento_proveedor: factura.nro_documento_proveedor || '',
        nombre_municipio_cacao: factura.nombre_municipio_cacao || '',
        nombre_departamento_cacao: factura.nombre_departamento_cacao || '',
        // fecha de pago para exportar (coincide con columnasExcelSolicitadas)
        fecha_pago_liquidacion: formatDateForExcel(
          (factura.fecha_pago_liquidacion || factura.fecha_pago || factura.fecha_pago_cuota || factura.fecha_liquidacion || '') as string
        ),
        // url/identificador de soporte si existe
        doc: factura.doc_soporte_url || factura.nro_documento_soporte || factura.doc || ''
      };

      if (!factura.detalles || factura.detalles.length === 0) {
        expanded.push({
          ...base,
          tipo_cacao: '-',
          kilos_comprados: 0,
          precio_kilo: 0,
          valor_bruto: 0,
          valor_cuota_fomento: 0,
          valor_neto: 0
        });
        return;
      }

      factura.detalles.forEach((detalle: any) => {
        expanded.push({
          ...base,
          tipo_cacao: detalle.nombre_tipo_cacao || '-',
          kilos_comprados: Number(detalle.nro_kilos ?? 0),
          precio_kilo: Number(detalle.valor_kilo ?? 0),
          valor_bruto: Number(detalle.valor_bruto ?? 0),
          valor_cuota_fomento: Number(detalle.cuota_fomento ?? 0),
          valor_neto: Number(detalle.valor_neto ?? 0)
        });
      });
    });
    return expanded;
  };

  const handleGenerarDocumento = async (id_factura_unica: number) => {
    
    if (errorPlantillas) {
      setIsAlertError(true);
      setAlertErrorText('No se encontró la plantilla necesaria para la liquidación');
    }

    if (!idPlantilla) {
      setIsAlertError(true);
      setAlertErrorText('No se encontró la plantilla necesaria para la liquidación');
      return;
    }

    setAllFacturas([]);
    setCurrentFacturaIndex(0);

    setLoadingDoc(true); 

    const token = valueSesion?.user?.tokens?.access || '';

    try {

      const detalleResp = await getInvoiceDetails(
        token,
        id_factura_unica.toString()
      );

      const facturas = detalleResp.data;

      if (!facturas.length) {
        throw new Error('El servicio no devolvió detalles de la factura');
      }

      const first = facturas[0]; // todas comparten cabezote

      const codTipos = (first.recaudador_info.cod_tipo_comprador || '')
      .split('|')
      .map((t: string) => t.trim());
      const variables = {
        dia: obtenerDia(first.recaudador_info.fecha_compra) || '',
        mes: obtenerNombreMes(first.recaudador_info.fecha_compra) || '',
        año: obtenerAnio(first.recaudador_info.fecha_compra) || '',
        razonsocialrecaudador:
          first.recaudador_info.nombre_completo_o_comercial || '',
        ndocumentorecaudador: first.recaudador_info.numero_documento || '',
        tce: codTipos.includes('E') ? 'x' : '',
        tcc: codTipos.includes('C') ? 'x' : '',
        tcp: codTipos.includes('T') ? 'x' : '',
        direccionrecaudador: first.recaudador_info.direccion_notificaciones || '',
        ciudadrecaudador: first.recaudador_info.municipio || '',
        telefonorecaudador: first.recaudador_info.telefono || '',
        emailrecaudador: first.recaudador_info.email || '',
        documentoproveedor: first.proveedor_info.numero_documento || '',
        nombreproveedor:
          first.proveedor_info.nombre_completo_o_comercial || '',
        ndocsoporte: first.nro_documento_soporte || '',
        departamento: first.nombre_departamento_cacao || '',
        municipio: first.nombre_municipio_cacao || '',
        nombre_finca: first.nombre_finca || '',
        nombre_vereda: first.nombre_vereda || '',
        numerofactura: first.recaudador_info.nro_factura_unica || '',
        subtotalkilos: formatNumber(facturas
          .reduce((s, f) => s + (f.nro_kilos || 0), 0)
          .toString()),
        subtotalvalorbruto: formatCurrency( facturas
          .reduce((s, f) => s + (f.valor_bruto || 0), 0)
          .toString()),
        totalcuotafomento: formatCurrency(facturas
          .reduce((s, f) => s + (f.cuota_fomento || 0), 0)
          .toString()), 
        totalvalorneto: formatCurrency(facturas
          .reduce((s, f) => s + (f.valor_neto || 0), 0)
          .toString()),
        items: facturas.map((f) => ({
          tipocacao: f.nombre_tipo_cacao || '',
          kilos: formatNumber(f.nro_kilos) || 0,
          preciokilo: formatCurrency(f.valor_kilo) || 0,
          valorbruto: formatCurrency(f.valor_bruto) || 0,
          cuotafomento: formatCurrency(f.cuota_fomento) || 0,
          valorneto: formatCurrency(f.valor_neto) || 0,
        })),
      };

      const response = await generarDocumento({ variables });
      
      if (!response?.success) {
        throw new Error('Error al generar el documento');
      }

      const pdfResponse = await convertToPdf(
        valueSesion?.user?.tokens?.access || '',
        response.data.id_documento_generado
      );

      if (!pdfResponse.success || !pdfResponse.data.ruta_documento) {
        throw new Error('No se pudo obtener la ruta del documento');
      }

      await downloadOrOpen(
        pdfResponse.data.ruta_documento,
        `factura_${id_factura_unica}.pdf`,
      );

      setSuccess(true);
      setSuccessText('Ha descargado exitosamente el documento');
      
    } catch (error) {
      console.error('Error al generar documento:', error);
      Swal.close();
      setIsAlertError(true);
      setAlertErrorText(error instanceof Error ? error.message : 'Ocurrió un error al generar o descargar el documento');
    } finally {
      // Limpiar estados después de terminar
      setLoadingDoc(false);   
      setSelectedInvoiceId(null);
      setAllFacturas([]);
      setCurrentFacturaIndex(0);
    }
  };

  // Obtener datos crudos para el Excel solicitado (sin paginación)
  const fetchRawDataForExcel = async () => {
    let response: any;
    if (isInternalUser) {
      const params: any = { sin_paginacion: true };
      if (formData.tipoDocumento) params.tipo_documento_proveedor = formData.tipoDocumento;
      if (formData.documentoIdentificacion) params.numero_documento_proveedor = formData.documentoIdentificacion;
      if (formData.razonSocial) params.nombre_proveedor = formData.razonSocial;
      if (formData.primer_nombre) params.recaudador_nombre = formData.primer_nombre;
      if (formData.primer_apellido) params.recaudador_apellido = formData.primer_apellido;
      if (formData.departamento) params.id_departamento_cacao = formData.departamento;
      if (formData.municipio) params.id_municipio_cacao = formData.municipio;
      if (formData.fechaInicio) params.fecha_desde = formatDateForApi(formData.fechaInicio);
      if (formData.fechaFin) params.fecha_hasta = formatDateForApi(formData.fechaFin);
      if (formData.nroFacturaUnica) params.nro_factura_unica = parseInt(formData.nroFacturaUnica);
      if (formData.tipoComprador && formData.tipoComprador.length > 0) {
        const tipoCompradorMap: { [key: string]: string } = { 'Procesador': 'P', 'Exportador': 'E', 'Comerciante': 'C' };
        params.cod_tipo_comprador = formData.tipoComprador.map(t => tipoCompradorMap[t] || t).join('|');
      }
      const { getCollectorInvoices } = await import('@/adapters/recaudadores/facturas/collector.invoices.internal');
      response = await getCollectorInvoices(params, valueSesion?.user?.tokens?.access || '');
    } else {
      const params: any = { sin_paginacion: true };
      if (formData.nroFacturaUnica) params.nro_factura_unica = parseInt(formData.nroFacturaUnica);
      if (formData.fechaInicio) params.fecha_desde = formatDateForApi(formData.fechaInicio);
      if (formData.fechaFin) params.fecha_hasta = formatDateForApi(formData.fechaFin);
      if (formData.departamento) params.id_departamento_cacao = parseInt(formData.departamento);
      if (formData.municipio) params.id_municipio_cacao = parseInt(formData.municipio);
      if (formData.tipoComprador && formData.tipoComprador.length > 0) {
        const tipoCompradorMap: { [key: string]: string } = { 'Procesador': 'P', 'Exportador': 'E', 'Comerciante': 'C' };
        params.cod_tipo_comprador = formData.tipoComprador.map(t => tipoCompradorMap[t] || t).join('|');
      }
      const { getFacturasExternas } = await import('@/adapters/recaudadores/facturas/collector.invoices.external');
      response = await getFacturasExternas(valueSesion?.user?.tokens?.access || '', [], 1, params);
    }
    return response?.data || [];
  };

  // Función para renderizar filas expandibles con detalles
  const expandedRowRender = (record: any) => {
    if (!record.detalles || record.detalles.length === 0) return null;

    // Calcular totales
    const totalKilos = record.detalles.reduce((acc: number, d: any) => acc + (parseFloat(Number(d.nro_kilos).toFixed(2)) || 0), 0);
    const totalValorBruto = record.detalles.reduce((acc: number, d: any) => acc + (parseFloat(Number(d.valor_bruto).toFixed(2)) || 0), 0);
    const totalCuotaFomento = record.detalles.reduce((acc: number, d: any) => acc + (parseFloat(Number(d.cuota_fomento).toFixed(2)) || 0), 0);
    const totalValorNeto = record.detalles.reduce((acc: number, d: any) => acc + (parseFloat(Number(d.valor_neto).toFixed(2)) || 0), 0);

    // Calcular promedio del precio por kilo
    const sumaPrecioKilo = record.detalles.reduce((acc: number, d: any) => acc + (parseFloat(Number(d.valor_kilo).toFixed(2)) || 0), 0);
    const promedioPrecioKilo = record.detalles.length > 0 ? sumaPrecioKilo / record.detalles.length : 0;

    return (
      <div className="py-2">
        <div style={{ 
          maxHeight: '400px',
          overflowY: 'scroll',
          scrollbarWidth: 'thin',
          scrollbarColor: '#888 #f1f1f1',
          direction: 'rtl'
        }}>
          <div style={{ direction: 'ltr' }}>
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 text-center text-xs font-bold text-[#8B4513] uppercase">Tipo de Cacao</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-[#8B4513] uppercase">Kilos</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-[#8B4513] uppercase">Precio x Kilo</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-[#8B4513] uppercase">Valor Bruto</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-[#8B4513] uppercase">Cuota Fomento</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-[#8B4513] uppercase">Valor Neto</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {record.detalles.map((detalle: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-2 py-2 text-center text-sm text-gray-500">
                      {detalle.nombre_tipo_cacao}
                    </td>
                    <td className="px-2 py-2 text-center text-sm text-gray-500">
                      {formatNumber(detalle.nro_kilos, 2)}
                    </td>
                    <td className="px-2 py-2 text-center text-sm text-gray-500">
                      {formatCurrency(detalle.valor_kilo)}
                    </td>
                    <td className="px-2 py-2 text-center text-sm text-gray-500">
                      {formatCurrency(detalle.valor_bruto)}
                    </td>
                    <td className="px-2 py-2 text-center text-sm text-gray-500">
                      {formatCurrency(detalle.cuota_fomento)}
                    </td>
                    <td className="px-2 py-2 text-center text-sm text-gray-500">
                      {formatCurrency(detalle.valor_neto)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold sticky bottom-0">
                  <td className="px-2 py-2 text-center">TOTALES:</td>
                  <td className="px-2 py-2 text-center">
                    {formatNumber(totalKilos, 2)}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {formatCurrency(promedioPrecioKilo)}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {formatCurrency(totalValorBruto)}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {formatCurrency(totalCuotaFomento)}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {formatCurrency(totalValorNeto)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Determinar si está en modo oscuro (debe estar antes de actions)
  const isDarkMode = mounted && theme === 'dark';

  // Botón para seleccionar/deseleccionar todas las facturas en el header de acciones
  const selectAllButton = (
    <button
      onClick={toggleSelectAllInvoices}
      className={`
        flex items-center gap-2 px-2 py-1 rounded font-medium transition-all duration-200 text-xs
        ${areAllCurrentPageInvoicesSelected()
          ? 'bg-[#4D750F] text-white hover:bg-[#3d5d0c]'
          : isDarkMode
            ? 'bg-gray-700 text-white hover:bg-gray-600'
            : 'bg-[#DEDEDE] text-[#562707] hover:bg-gray-200'
        }
      `}
      disabled={isLoadingInternalInvoices || isLoadingInvoices}
    >
      <input
        type="checkbox"
        checked={areAllCurrentPageInvoicesSelected()}
        onChange={() => {}} // El onChange se maneja en el botón padre
        className="w-4 h-4 accent-[#4D750F] cursor-pointer"
        readOnly
      />
      <span>
        {areAllCurrentPageInvoicesSelected() 
          ? 'Deseleccionar todas' 
          : 'Seleccionar todas'
        }
      </span>
    </button>
  );

  const actions = [
    {
      label: 'Seleccionar',
      render: (row: any) => (
        <div className="flex justify-center items-center">
          <input
            type="checkbox"
            checked={selectedInvoices.includes(row.nro_factura_unica)}
            onChange={() => handleSelectInvoice(row.nro_factura_unica)}
            className="cursor-pointer w-5 h-5"
            title="Seleccionar para descargar"
          />
        </div>
      )
    },
    {
      label: 'Ver',
      render: (row: any) => (
        <IconButton
          onClick={() => {
            router.push(`/recaudadores/detalle_compra?id=${row.id_factura_unica}`);
          }}
          sx={{
            color: isDarkMode ? '#fff' : '#4D750F',
            '&:hover': {
              backgroundColor: isDarkMode
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(77, 117, 15, 0.1)'
            }
          }}
        >
          <Visibility />
        </IconButton>
      )
    },
    ...(isInternalUser ? [{
      label: 'Editar',
      render: (row: any) => (
        <IconButton
          onClick={() => {
            router.push(`/recaudadores/editar_factura?id=${row.id_factura_unica}`);
          }}
          sx={{
            color: isDarkMode ? '#fff' : '#4D750F',
            '&:hover': {
              backgroundColor: isDarkMode
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(77, 117, 15, 0.1)'
            }
          }}
        >
          <Edit />
        </IconButton>
      )
    }] : [])
    ,{
      label: 'Descargar',
      render: (row: any) => (
        <IconButton
          onClick={() => {
            if (row.id_factura_unica) {
              handleGenerarDocumento(row.id_factura_unica);
            } else {
              setIsAlertQuestion(true);
              setAlertQuestionText('No hay documento de soporte disponible para esta factura');
            }
          }}
          sx={{
            color: theme === 'dark' ? '#fff' : '#4D750F',
          }}
        >
          <FileDownload  />
        </IconButton>
      )
    },
  ];

  // Paginación
  const handlePageChange = (newPage: number) => {
    if (isInternalUser) {
      const params: any = {
        page: newPage,
        page_size: 10
      };
      if (formData.tipoDocumento) params.tipo_documento_proveedor = formData.tipoDocumento;
      if (formData.documentoIdentificacion) params.numero_documento_proveedor = formData.documentoIdentificacion;
      if (formData.razonSocial) params.nombre_proveedor = formData.razonSocial;
      if (formData.departamento) params.id_departamento_cacao = formData.departamento;
      if (formData.municipio) params.id_municipio_cacao = formData.municipio;
      if (formData.fechaInicio) params.fecha_desde = formatDateForApi(formData.fechaInicio);
      if (formData.fechaFin) params.fecha_hasta = formatDateForApi(formData.fechaFin);
      if (formData.nroFacturaUnica) params.nro_factura_unica = parseInt(formData.nroFacturaUnica);
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

      fetchInternalInvoices(valueSesion.user.tokens.access, params);
    } else if (valueSesion?.user?.tokens?.access) {
      const params: any = {
        page: newPage,
        page_size: 10
      };
      if (formData.nroFacturaUnica) params.nro_factura_unica = parseInt(formData.nroFacturaUnica);
      if (formData.fechaInicio) params.fecha_desde = formatDateForApi(formData.fechaInicio);
      if (formData.fechaFin) params.fecha_hasta = formatDateForApi(formData.fechaFin);
      if (formData.departamento) params.id_departamento_cacao = parseInt(formData.departamento);
      if (formData.municipio) params.id_municipio_cacao = parseInt(formData.municipio);
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

      fetchInvoices(valueSesion.user.tokens.access, [], newPage, params);
    }
  };

  // Fechas para Excel (YYYY-MM-DD) y números sin formato para permitir operaciones
  const formatDateForExcel = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };


  // Función para expandir facturas con sus detalles para Excel
  const expandFacturasForExcel = (facturas: any[]) => {
    const expandedData: any[] = [];

    facturas.forEach(factura => {
      // Si la factura no tiene detalles, crear una fila con datos básicos
      if (!factura.detalles || factura.detalles.length === 0) {
        expandedData.push({
          // Información de la factura
          fecha_creacion: formatDateForExcel(factura.fecha_creacion),
          nro_factura_unica: Number(factura.nro_factura_unica ?? 0),
          fecha_compra: formatDateForExcel(factura.fecha_compra),
          nro_documento_recaudador: factura.nro_documento_recaudador || '',
          nombre_persona_recaudador: factura.nombre_persona_recaudador || '',
          nro_documento_proveedor: factura.nro_documento_proveedor || '',
          nombre_persona_proveedor: factura.nombre_persona_proveedor || '',
          nombre_departamento_cacao: factura.nombre_departamento_cacao || '',
          nombre_municipio_cacao: factura.nombre_municipio_cacao || '',
          nombre_finca: factura.nombre_finca || '',
          nombre_vereda: factura.nombre_vereda || '',
          total_kilos: 0,
          cuota_fomento: 0,
          cod_estado_liquidacion_display: factura.cod_estado_liquidacion_display || '',
          // Detalles vacíos
          tipo_cacao: '-',
          kilos_detalle: 0,
          precio_kilo: 0,
          valor_bruto_detalle: 0,
          cuota_fomento_detalle: 0,
          valor_neto_detalle: 0,
          estado_liquidacion_detalle: '-',
          // Campos adicionales para completar la información
          valor_bruto: 0,
          valor_neto: 0
        });
      } else {
        // Si tiene detalles, crear una fila por cada detalle
        factura.detalles.forEach((detalle: any) => {
          expandedData.push({
            // Información de la factura (se repite para cada detalle)
            fecha_creacion: formatDateForExcel(factura.fecha_creacion),
            nro_factura_unica: Number(factura.nro_factura_unica ?? 0),
            fecha_compra: formatDateForExcel(factura.fecha_compra),
            nro_documento_recaudador: factura.nro_documento_recaudador || '',
            nombre_persona_recaudador: factura.nombre_persona_recaudador || '',
            nro_documento_proveedor: factura.nro_documento_proveedor || '',
            nombre_persona_proveedor: factura.nombre_persona_proveedor || '',
            nombre_departamento_cacao: detalle.nombre_departamento_cacao || factura.nombre_departamento_cacao || '',
            nombre_municipio_cacao: detalle.nombre_municipio_cacao || factura.nombre_municipio_cacao || '',
            nombre_finca: detalle.nombre_finca || factura.nombre_finca || '',
            nombre_vereda: detalle.nombre_vereda || factura.nombre_vereda || '',
            // Usar valores específicos del detalle en lugar de totales de factura
            total_kilos: Number(detalle.nro_kilos ?? 0), // Kilos específicos del detalle
            cuota_fomento: Number(detalle.cuota_fomento ?? 0), // Cuota fomento específica del detalle
            cod_estado_liquidacion_display: factura.cod_estado_liquidacion_display || '',
            // Información del detalle (valores específicos del detalle)
            tipo_cacao: detalle.nombre_tipo_cacao || '-',
            kilos_detalle: Number(detalle.nro_kilos ?? 0),
            precio_kilo: Number(detalle.valor_kilo ?? 0),
            valor_bruto_detalle: Number(detalle.valor_bruto ?? 0),
            cuota_fomento_detalle: Number(detalle.cuota_fomento ?? 0),
            valor_neto_detalle: Number(detalle.valor_neto ?? 0),
            estado_liquidacion_detalle: detalle.cod_estado_liquidacion_display || 'No liquidado',

          });
        });
      }
    });

    return expandedData;
  };

  // Función para obtener datos para Excel (sin actualizar la tabla)
  const fetchDataForExcel = async () => {
    let response;
    
    if (isInternalUser) {
      const params: any = {
        sin_paginacion: true
      };
      if (formData.tipoDocumento) params.tipo_documento_proveedor = formData.tipoDocumento;
      if (formData.documentoIdentificacion) params.numero_documento_proveedor = formData.documentoIdentificacion;
      if (formData.razonSocial) params.nombre_proveedor = formData.razonSocial;
      if (formData.primer_nombre) params.recaudador_nombre = formData.primer_nombre;
      if (formData.primer_apellido) params.recaudador_apellido = formData.primer_apellido;
      if (formData.departamento) params.id_departamento_cacao = formData.departamento;
      if (formData.municipio) params.id_municipio_cacao = formData.municipio;
      if (formData.fechaInicio) params.fecha_desde = formatDateForApi(formData.fechaInicio);
      if (formData.fechaFin) params.fecha_hasta = formatDateForApi(formData.fechaFin);
      if (formData.nroFacturaUnica) params.nro_factura_unica = parseInt(formData.nroFacturaUnica);
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
      const { getCollectorInvoices } = await import('@/adapters/recaudadores/facturas/collector.invoices.internal');
      response = await getCollectorInvoices(params, valueSesion?.user?.tokens?.access || '');
    } else {
      const params: any = {
        sin_paginacion: true
      };
      if (formData.nroFacturaUnica) params.nro_factura_unica = parseInt(formData.nroFacturaUnica);
      if (formData.fechaInicio) params.fecha_desde = formatDateForApi(formData.fechaInicio);
      if (formData.fechaFin) params.fecha_hasta = formatDateForApi(formData.fechaFin);
      if (formData.departamento) params.id_departamento_cacao = parseInt(formData.departamento);
      if (formData.municipio) params.id_municipio_cacao = parseInt(formData.municipio);
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
      const { getFacturasExternas } = await import('@/adapters/recaudadores/facturas/collector.invoices.external');
      response = await getFacturasExternas(valueSesion?.user?.tokens?.access || '', [], 1, params);
    }

    // Expandir las facturas con sus detalles para Excel
    const expandedData = expandFacturasForExcel(response.data);
    
    return {
      ...response,
      data: expandedData,
      columns: columnasExcel // Incluir las columnas específicas para Excel
    };
  };

  // Función original para la tabla (con paginación normal)
  const fetchAllData = async (page: number) => {
    if (isInternalUser) {
      const params: any = {
        page,
        page_size: 10
      };
      if (formData.tipoDocumento) params.tipo_documento_proveedor = formData.tipoDocumento;
      if (formData.documentoIdentificacion) params.numero_documento_proveedor = formData.documentoIdentificacion;
      if (formData.razonSocial) params.nombre_proveedor = formData.razonSocial;
      if (formData.primer_nombre) params.recaudador_nombre = formData.primer_nombre;
      if (formData.primer_apellido) params.recaudador_apellido = formData.primer_apellido;
      if (formData.departamento) params.id_departamento_cacao = formData.departamento;
      if (formData.municipio) params.id_municipio_cacao = formData.municipio;
      if (formData.fechaInicio) params.fecha_desde = formatDateForApi(formData.fechaInicio);
      if (formData.fechaFin) params.fecha_hasta = formatDateForApi(formData.fechaFin);
      if (formData.nroFacturaUnica) params.nro_factura_unica = parseInt(formData.nroFacturaUnica);
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

      return await fetchInternalInvoices(valueSesion?.user?.tokens?.access, params);
    } else {
      const params: any = {
        page,
        page_size: 10
      };
      if (formData.nroFacturaUnica) params.nro_factura_unica = parseInt(formData.nroFacturaUnica);
      if (formData.fechaInicio) params.fecha_desde = formatDateForApi(formData.fechaInicio);
      if (formData.fechaFin) params.fecha_hasta = formatDateForApi(formData.fechaFin);
      if (formData.departamento) params.id_departamento_cacao = parseInt(formData.departamento);
      if (formData.municipio) params.id_municipio_cacao = parseInt(formData.municipio);
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

      return await fetchInvoices(valueSesion?.user?.tokens?.access, [], page, params);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-6 md:p-6">

      <AlertLoader
        isOpen={loadingDoc}                               
        loadingText="Generando documento, por favor espere…"
      />

      <AlertSuccess
        isOpen={success}
        message={successText}
        onClose={() => setSuccess(false)}
      />

      <AlertError
        isOpen={isAlertError}
        message={alertErrorText}
        onClose={() => setIsAlertError(false)}
      />

      <AlertQuestion
        isOpen={isAlertQuestion}
        questionText={alertQuestionText}
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
            className={` text-xl sm:text-2xl lg:text-3xl font-bold text-center my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'
              }`}
          >
            CONSULTA DE FACTURAS UNICAS NACIONALES
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
        <div className={`rounded-3xl mt-6 shadow-md p-6 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>
          <h2
            className={` text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'
              }`}
          >
            FACTURAS UNICAS NACIONALES REGISTRADAS
          </h2>

          <DynamicTable
            columns={columns}
            data={isInternalUser ? internalInvoices : fullInvoices}
            isLoading={isInternalUser ? isLoadingInternalInvoices : isLoadingInvoices}
            currentPage={isInternalUser ? internalCurrentPage : currentPage}
            totalPages={isInternalUser ? internalTotalPages : invoicesTotalPages}
            onPageChange={handlePageChange}
            actions={actions}
            fetchAllData={fetchAllData}
            fetchDataForExcel={fetchDataForExcel}
            actionsHeader={selectAllButton}
            customExcelExporter={async () => {
              const raw = await fetchRawDataForExcel();
              const data = expandFacturasParaExcelSolicitado(raw);
              return {
                columns: columnasExcelSolicitadas,
                data,
                fileName: 'Facturas_Compras_Detallado.xlsx',
                sheetName: 'Facturas'
              };
            }}
            expandable={{
              expandedRowRender,
              rowExpandable: (record) => record.detalles && record.detalles.length > 0
            }}
          />

          {/* Botón para descargar facturas seleccionadas */}
          {selectedInvoices.length > 0 && (
            <div className="mt-4 flex justify-center">
              <Button
                title={`Descargar factura${selectedInvoices.length > 1 ? 's' : ''}`}
                onClick={handleGenerarZipFacturas}
                disabled={isLoadingZip}
              />
            </div>
          )}

<div className="mt-6 w-full xl:w-1/2 lg:ml-auto flex flex-col lg:flex-row gap-4 lg:justify-end">

            <AnimatedInput
              label="TOTAL CUOTA DE FOMENTO"
              labelSize="sm"
              name="totalValorCuotaFomento"
              value={comprasTotales ? formatCurrency(comprasTotales.total_cuota_fomento) : ''}
              onChange={() => {}} // Solo lectura
              type="text"
              disabled={true}
              darkMode={isDarkMode}
            />

            <AnimatedInput
              label="TOTAL INTERESES"
              labelSize="sm"
              name="totalIntereses"
              value={comprasTotales ? formatCurrency(comprasTotales.total_intereses) : ''}
              onChange={() => {}} // Solo lectura
              type="text"
              disabled={true}
              darkMode={isDarkMode}
            />
          </div>
            

        </div>
      </div>
    </div>
  );
};

export default SearchCollectors;
