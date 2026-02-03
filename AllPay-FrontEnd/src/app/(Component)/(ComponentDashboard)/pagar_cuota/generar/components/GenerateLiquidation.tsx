'use client';

// facturas
import useCollectorInvoicesInternal from '@/application/recaudadores/factura/useCollectorInvoicesInternal';
import useFacturasLiquidadasPSE from '../hooks/useFacturasLiquidadasPSE';
import { useFechasCierre } from '@/app/(Component)/(ComponentDashboard)/recaudadores/editar_factura/hooks/useFechasCierre';
import { useTypeDni } from '@/application/dni/useTypeDni';
import useGetDepartments from '@/application/address/useGetDepartmentsCacao';
import { useGetCities } from '@/application/address/useGetCities';
import { usePlantillasDocumento } from '@/application/documento/usePlantillasDocumento';
import { useGeneradorDocumento } from '@/application/documento/useGeneradorDocumento';
import LogoPSE from '@/presenters/components/shared/logo/LogoPSE';
import LogoPSESmall from '@/presenters/components/shared/logo/LogoPSESmall';
// react
import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';

// utils
import { formatNumber, formatCurrency, formatToPercentage, formatNumberWithCommas } from '@/utils/formatters';
import { numeroALetras } from '@/utils/numero-a-letras';
import { downloadOrOpen } from '@/utils/forceDownload';
import { useWordToPdf } from '@/application/documento/useWordToPdf';
import { generateCode } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_liquidacion/utils/generate-code';	
import { calcularFechaLimitePago, obtenerAnio, obtenerNombreMes, formatearFechaDMY } from '@/utils/dateUtils';

// liquidacion
import { LiquidacionRequest } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_liquidacion/models/liquidacion.external';
import useSearchLiquidation from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_liquidacion/hooks/useSearchLiquidation';
import { useLiquidacionData } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_liquidacion/hooks/useLiquidacionData';
import { useCreateLiquidationInternal } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_liquidacion/hooks/useCreateLiquidationInternal';
import { useCreateLiquidationExternal } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_liquidacion/hooks/useCreateLiquidationExternal';

// usuario
import { useUserProfile } from '@/application/user/useUserProfile';

// ui
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AlertQuestionWithDocument from '@/presenters/components/recaudadores/AlertQuestionWithDocument';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import AlertQuestion from '@/presenters/components/recaudadores/AlertQuestion';

// services
import { FileDownload } from '@mui/icons-material';
import { IconButton } from '@mui/material';

// notificaciones
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import Logo from '@/presenters/components/shared/logo/Logo';
import { getFacturaDetalle } from '../adapters/getFacturaDetalle';

const SearchLiquidation = () => {

    const { theme } = useTheme();
    const [isInitialLoad,] = useState(true);
    const [isInternalUser, setIsInternalUser] = useState<boolean | null>(null);
    const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
    const [hasLoadedDepartments, setHasLoadedDepartments] = useState(false);
    const [hasFetchedTypes, setHasFetchedTypes] = useState(false);
    const [alreadySetProfileData, setAlreadySetProfileData] = useState(false);
    const [selectedInvoices, setSelectedInvoices] = useState<Array<{ id_factura_unica: number, id_persona_recaudador: number }>>([]);
    const [showLiquidationAlert, setShowLiquidationAlert] = useState(false);
    const [idPlantilla, setIdPlantilla] = useState<number | null>(null);
    const [, setFechaLimite] = useState<string | null>(null);
    const [, setLiquidacionData] = useState<any>(null);
    const [, setError] = useState<string | null>(null);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [docToGenerate, setDocToGenerate] = useState<any>(null);
    const [documentUrl, setDocumentUrl] = useState<string>('');

    // notificaciones
    const [isAlertError, setIsAlertError] = useState(false);
    const [isAlertLoader, setIsAlertLoader] = useState(false);
    const [isAlertSuccess, setIsAlertSuccess] = useState(false);
    const [alertErrorText, setAlertErrorText] = useState('');
    const [alertLoaderText, setAlertLoaderText] = useState('');
    const [alertSuccessText, setAlertSuccessText] = useState('');
    const [alertErrorTextHtml, setAlertErrorTextHtml] = useState<React.ReactNode>('');

    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const valueSesion: any = session;
    const router = useRouter();

    const { fechasCierre } = useFechasCierre(valueSesion?.user?.tokens?.access || '');

    // calcular fecha limite de pago 
    useEffect(() => {

        if (fechasCierre?.length) {
            const fechaCierreCF = fechasCierre.find(f => f.cod_tipo_cobro_fecha === 'PI');
            if (fechaCierreCF) {
                setFechaLimite(calcularFechaLimitePago(fechaCierreCF.dias_pago));
            }
        }
    }, [fechasCierre]);

    const { profile } = useUserProfile(valueSesion?.user?.tokens?.access || '');

    // obtener departamentos
    const {
        departments,
        fetchDepartments
    } = useGetDepartments();

    const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);

    const { formData, validationErrors,
        handleInputChange: originalHandleInputChange, handleSelectChange, clearForm, updateFormField
    } = useSearchLiquidation();

    const { types, fetchTypes } = useTypeDni();

    // obtener Facturas externas - solo liquidadas pendientes de pago para PSE
    const {
        facturas: facturasPSE, 
        isLoading: isLoadingInvoices, 
        currentPage, 
        totalPages: invoicesTotalPages,
        fetchFacturas: fetchFacturasPSE, 
        clearFacturas: clearFacturasPSE
    } = useFacturasLiquidadasPSE();

    // obtener Facturas internas
    const {
        invoices: internalInvoices, isLoading: isLoadingInternalInvoices, currentPage: internalCurrentPage, totalPages: internalTotalPages,
        fetchInvoices: fetchInternalInvoices, clearInvoices: clearInternalInvoices
    } = useCollectorInvoicesInternal();

    // obtener municipios
    const { cities, loading: loadingCities, error: citiesError } = useGetCities({
        departamentoId: selectedDepartment || 0,
        token: valueSesion?.user?.tokens?.access || ''
    });

    const latestSearchRequestRef = useRef(0);

    // obtener plantilla de liquidacion
    const { plantillas, error: errorPlantillas } = usePlantillasDocumento({
        token: valueSesion?.user?.tokens?.access || '',
        nombre: 'Liquidacion Cuota De Fomento'
    });

    // Actualizar el ID de la plantilla cuando esté disponible
    useEffect(() => {
        if (plantillas?.data?.length) {
            setIdPlantilla(plantillas.data[0].id_plantilla_doc);
        }
    }, [plantillas]);

    const { generarDocumento } = useGeneradorDocumento({
        token: valueSesion?.user?.tokens?.access || '',
        id_plantilla_doc: idPlantilla || 0,
        consecutivo: true         
      });

    const { convertToPdf } = useWordToPdf();

    useEffect(() => {
        if (!valueSesion?.user?.tipo_usuario) return;
        if (valueSesion.user.tipo_usuario === 'I') {
            setIsInternalUser(true);
        } else if (valueSesion.user.tipo_usuario === 'E') {
            setIsInternalUser(false);
        }
    }, [valueSesion?.user?.tipo_usuario]);

    useEffect(() => {
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
    }, [isInternalUser, valueSesion?.user?.tokens?.access, fetchInternalInvoices, hasLoadedInitialData]);

    // cargar facturas externas
    useEffect(() => {
        if (isInternalUser === null) return;
        if (!isInternalUser && valueSesion?.user?.tokens?.access && !hasLoadedInitialData) {
            fetchFacturasPSE(valueSesion.user.tokens.access, 1);
            setHasLoadedInitialData(true);
        }
    }, [isInternalUser, valueSesion?.user?.tokens?.access, fetchFacturasPSE, hasLoadedInitialData]);

    // cargar datos del perfil en caso sea usuario externo
    useEffect(() => {
        if (isInternalUser === null) return;
        if (!isInternalUser && profile && !alreadySetProfileData) {
            setAlreadySetProfileData(true);

            updateFormField('tipoDocumento', profile.persona.tipo_documento || '');
            updateFormField('documentoIdentificacion', profile.persona.numero_documento || '');
            updateFormField('razonSocial', profile.persona.razon_social || '');
            updateFormField('email_contacto_recaudador', profile.persona.email || '');
            updateFormField('direccion_contacto_recaudador', profile.persona.direccion_notificaciones || '');
            updateFormField('telefono_contacto_recaudador', profile.persona.telefono_celular || profile.persona.telefono_empresa || '');

            if (profile.persona.cod_departamento_notificacion) {
                updateFormField('departamento', profile.persona.cod_departamento_notificacion);
                setSelectedDepartment(parseInt(profile.persona.cod_departamento_notificacion));
            }

            if (profile.persona.cod_municipio_notificacion_nal) {
                updateFormField('municipio', profile.persona.cod_municipio_notificacion_nal);
            }
        }
    }, [isInternalUser, profile, alreadySetProfileData, updateFormField]);

    useEffect(() => {
        if (isInternalUser) {
            updateFormField('tipoDocumento', '');
            updateFormField('documentoIdentificacion', '');
            updateFormField('razonSocial', '');
            updateFormField('departamento', '');
            updateFormField('municipio', '');
        }
    }, [isInternalUser, updateFormField]);

    const { fetchLiquidacionData } = useLiquidacionData({
        token: valueSesion?.user?.tokens?.access || '',
        isInternalUser
        
    });

    const handleConfirmLiquidation = async () => {
        setShowLiquidationAlert(false);

        if (errorPlantillas) {
            setIsAlertError(true);
            setAlertErrorText('Ocurrió un error al generar el documento');
            return;
        }

        if (!idPlantilla) {
            setIsAlertError(true);
            setAlertErrorText('No se encontró la plantilla necesaria para la liquidación');
            return;
        }

        // Limpiar estados antes de comenzar
        setLiquidacionData(null);
        setError(null);
        
        // Mostrar el AlertLoader
        setIsAlertLoader(true);
        setAlertLoaderText('Generando documento...');

        try {
            // Obtener los IDs de las facturas seleccionadas
            const idsFacturas = selectedInvoices.map(invoice => invoice.id_factura_unica);
            
            // Obtener datos de liquidación
            const dataResp = await fetchLiquidacionData(idsFacturas);
          
            if (!dataResp.data.length) {
                throw new Error('No se recibieron datos de liquidación');
            }

            const first = dataResp.data[0]; 

            let fechadeliquidacion_intereses: string;
            let fechalimitepago_intereses: string;

            if(first.intereses_x_factura > 0) {
                fechadeliquidacion_intereses = first.fecha_limite_pago_intereses || '';
                fechalimitepago_intereses = fechadeliquidacion_intereses || '';
            } else {
                fechadeliquidacion_intereses = new Date().toISOString().split('T')[0] || '';
                fechalimitepago_intereses =  first.fecha_limite_pago || '';
            }

            const codigoBarras = generateCode({
                empresa: '1234567890128',
                referencia: first.numero_documento_recaudador,
                valorPagar: first.valor_a_pagar,
                fechaMaximaPago: fechalimitepago_intereses || ''
              });


            const fechaliquidacion_formateada = formatearFechaDMY(new Date(fechadeliquidacion_intereses));
            const fechalimitepago_formateada = formatearFechaDMY(new Date(fechalimitepago_intereses));
      
            const variables = {
                fechadeliquidacion: fechaliquidacion_formateada,
                fechadepago: fechalimitepago_formateada || '',
                mespago: obtenerNombreMes(fechaliquidacion_formateada),
                anopago: obtenerAnio(fechaliquidacion_formateada),
                Ndocumento: first.numero_documento_recaudador || '',
                NOMBREREPRESENTANTELEGAL: first.representante_legal || '',
                NOMBRERECAUDADOR: first.recaudador_nombre || '',
                DIRECCIONRECAUDADOR: first.direccion_recaudador || '',
                telrecuadador: first.telefono_recaudador || '',
                items: dataResp.data.map(d => ({
                    nfactura: d.nro_factura_unica.toString() || '',
                    ndproveedor: d.numero_documento_proveedor || '',
                    fcompra: formatearFechaDMY(new Date(d.fecha_compra)) || '',
                    kilos: formatNumberWithCommas(d.total_kilos.toString()) || 0,
                    valorcuota: formatCurrency(d.cuota_fomento) || 0,
                    valorinteres: formatCurrency(d.intereses_x_factura) || 0
                })),
                valortotalcuota: formatCurrency(first.cuota_fomento_total) || 0,
                valortotalintereses: formatCurrency(first.valor_intereses_total) || 0,
                valortotalpagar: formatCurrency(first.valor_a_pagar) || 0,
                VALORTOTALENLETRAS: numeroALetras(first.valor_a_pagar) || 'error',
                codigo_barras: codigoBarras
            };



            const docResp = await generarDocumento({ variables });
            if (!docResp?.success) throw new Error('Error al generar documento');

            // Cerrar el AlertLoader
            setIsAlertLoader(false);

            // Guardar el documento generado para la confirmación
            setDocumentUrl(docResp.data.ruta_documento);
            setDocToGenerate({ variables, docResp });
            setShowConfirmationModal(true);

        } catch (error) {
            console.log('error gente gente ');
            setIsAlertLoader(false);
            setIsAlertError(true);
            setAlertErrorTextHtml(
                <>
                  {error instanceof Error ? (
                    <>
                      {error.message}
                    </>
                  ) : (
                    'Ocurrió un error al obtener los detalles de las facturas'
                  )}
                </>
              );
            setSelectedInvoices([]);
        } finally {
            setLiquidacionData(null);
            setError(null);
        }
    };

    // Agregar los hooks de liquidación
    const { createLiquidationData: createLiquidationInternal } = useCreateLiquidationInternal({
        token: valueSesion?.user?.tokens?.access || ''
    });

    const { createLiquidationData: createLiquidationExternal } = useCreateLiquidationExternal({
        token: valueSesion?.user?.tokens?.access || ''
    });

    const handleConfirmGeneration = async () => {
        try {
            setShowConfirmationModal(false);
            
            if (!docToGenerate?.docResp?.success) {
                throw new Error('No hay documento generado válido');
            }

            // Convertir a PDF
            const pdfResp = await convertToPdf(
                valueSesion?.user?.tokens?.access || '',
                docToGenerate.docResp.data.id_documento_generado
            );

            if (!pdfResp.success || !pdfResp.data?.ruta_documento)
                throw new Error('No se recibió la ruta del PDF');

            // Descargar o abrir el PDF
            await downloadOrOpen(
                pdfResp.data.ruta_documento,
                `liquidacion_${docToGenerate.docResp.data.id_documento_generado}.pdf`
            );

            setIsAlertSuccess(true);
            setAlertSuccessText('Ha descargado exitosamente el documento');

            const liquidacionRequest: LiquidacionRequest = {
                id_facturas: selectedInvoices.map(invoice => invoice.id_factura_unica),
                doc_pago_id: pdfResp.data.id_documento_generado,
                codigo_barras: pdfResp.data.variables.codigo_barras
            };

            // Crear la liquidación según el tipo de usuario
            if(isInternalUser) {
                const response = await createLiquidationInternal(liquidacionRequest);
                if (!response.success) {
                    throw new Error(response.detail || 'Error al generar la liquidación');
                }
            } else {
                const response = await createLiquidationExternal(liquidacionRequest);
                if (!response.success) {
                    throw new Error(response.detail || 'Error al generar la liquidación');
                }
            }

        } catch (error) {
            setIsAlertError(true);
            setAlertErrorText(error instanceof Error ? error.message : 'Ocurrió un error al generar el documento');
        } finally {
            setSelectedInvoices([]);
        }
    };

    useEffect(() => {
        if (!isInitialLoad) {
            localStorage.setItem('collectorSearchFormData', JSON.stringify(formData));
        }
    }, [formData, isInitialLoad]);

    useEffect(() => {
        if (!isInitialLoad && facturasPSE.length > 0) {
            localStorage.setItem('collectorInvoicesData', JSON.stringify(facturasPSE));
            localStorage.setItem('collectorInvoicesCurrentPage', currentPage.toString());
        }
    }, [facturasPSE, currentPage, isInitialLoad]);

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

    const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        handleSelectChange(e);
        setSelectedDepartment(value ? parseInt(value) : null);
    };

    // Opciones de departamento
    const getDepartmentOptions = () => {
        return departments.map(dept => ({
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
        return cities.map(city => ({
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
        if (isInternalUser === null) return;

        setSelectedInvoices([]);

        latestSearchRequestRef.current++;
        const currentRequestId = latestSearchRequestRef.current;

        if (isInternalUser) {
            clearInternalInvoices();
        } else {
            clearFacturasPSE();
        }

        if (isInternalUser) {
            const params: any = {
                page: 1,
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
            if (formData.direccion_contacto_recaudador)
                params.direccion_contacto_recaudador = formData.direccion_contacto_recaudador;

            if (formData.telefono_contacto_recaudador)
                params.telefono_contacto_recaudador = formData.telefono_contacto_recaudador;

            if (formData.email_contacto_recaudador)
                params.email_contacto_recaudador = formData.email_contacto_recaudador;

            try {
                const response = await fetchInternalInvoices(valueSesion?.user?.tokens?.access, params);
                if (currentRequestId !== latestSearchRequestRef.current) return;

                if (response.data.length === 0) {
                    setIsAlertError(true);
                    setAlertErrorText('No se encontraron facturas para los criterios de búsqueda.');
                }
            } catch (error) {
                setIsAlertError(true);
                setAlertErrorText('Ocurrió un error al buscar las facturas. Por favor, intente nuevamente.');
            }
        } else {
            // Para usuarios externos, recargar las facturas del usuario actual
            try {
                const params: any = {
                    page: 1,
                    page_size: 10
                };
                if (formData.nroFacturaUnica) params.nro_factura_unica = formData.nroFacturaUnica;
                if (formData.fechaInicio) params.fecha_desde = formatDateForApi(formData.fechaInicio);
                if (formData.fechaFin) params.fecha_hasta = formatDateForApi(formData.fechaFin);

                console.log("Buscando facturas con params:", params);
                const response = await fetchFacturasPSE(valueSesion.user.tokens.access, 1, params);
                console.log("Respuesta de búsqueda:", response);
                if (response.data.length === 0) {
                    setIsAlertError(true);
                    setAlertErrorText('No se encontraron facturas liquidadas pendientes de pago.');
                }
            } catch (error) {
                setIsAlertError(true);
                setAlertErrorText('Ocurrió un error al buscar las facturas. Por favor, intente nuevamente.');
            }
        }
    };

    // Manejo de botón "Limpiar"
    const handleLimpiar = async () => {
        if (isInternalUser === null) return;

        setSelectedInvoices([]);

        if (isInternalUser) {
            clearForm();
            localStorage.removeItem('collectorSearchFormData');
            localStorage.removeItem('collectorInvoicesData');
            localStorage.removeItem('collectorInvoicesCurrentPage');

            clearInternalInvoices();
            if (valueSesion?.user?.tokens?.access) {
                try {
                    await fetchInternalInvoices(valueSesion.user.tokens.access, { page: 1, page_size: 10 });
                } catch (error) {
                    setIsAlertError(true);
                    setAlertErrorText('Ocurrió un error al cargar las facturas. Por favor, intente nuevamente.');
                }
            }
        } else {
            updateFormField('nroFacturaUnica', '');
            updateFormField('fechaInicio', '');
            updateFormField('fechaFin', '');

            const savedFormData = localStorage.getItem('collectorSearchFormData');
            if (savedFormData) {
                const parsedFormData = JSON.parse(savedFormData);
                const updatedFormData = {
                    ...parsedFormData,
                    nroFacturaUnica: '',
                    fechaInicio: '',
                    fechaFin: ''
                };
                localStorage.setItem('collectorSearchFormData', JSON.stringify(updatedFormData));
            }

            if (valueSesion?.user?.tokens?.access) {
                try {
                    await fetchFacturasPSE(valueSesion.user.tokens.access, 1);
                } catch (error) {
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
        { key: 'nro_documento_proveedor', label: 'DOCUMENTO PROVEEDOR' },
        { key: 'nombre_persona_proveedor', label: 'NOMBRE PROVEEDOR' },
        { key: 'nombre_departamento_cacao', label: 'DEPARTAMENTO' },
        { key: 'nombre_municipio_cacao', label: 'MUNICIPIO' },
        {
            key: 'total_kilos',
            label: 'TOTAL KILOS',
            render: (value: any) => formatNumberWithCommas(value)
        },
        {
            key: 'cuota_fomento',
            label: 'CUOTA DE FOMENTO',
            render: (value: any) => formatToPercentage(value)
        },
        {
            key: 'cod_estado_liquidacion_display',
            label: 'ESTADO LIQUIDACIÓN',
            render: (value: any) => value
        }
    ];

    const actions = [
        {
            label: 'Pagar PSE',
            render: (_: any) => (
                <IconButton
                    onClick={() => handlePagarPSE(_.id_factura_unica)}
                    sx={{
                        color: theme === 'dark' ? '#fff' : '#0A4971',
                        '&:hover': {
                            backgroundColor: theme === 'dark'
                                ? 'rgba(255, 255, 255, 0.1)'
                                : 'rgba(10, 73, 113, 0.1)'
                        },
                        marginLeft: '8px'
                    }}
                    title="Pagar con PSE"
                >
                    <LogoPSESmall />
                </IconButton>
            )
        },
        {
            label: 'Descargar',
            render: (row: any) => (
                <IconButton
                    onClick={() => {
                        if (row.doc_pago_liquidacion) {
                            window.open(row.doc_pago_liquidacion, '_blank');
                        } else {
                            setIsAlertError(true);
                            setAlertErrorText('No hay documento de soporte disponible para esta factura');
                        }
                    }}
                    sx={{
                        color: theme === 'dark' ? '#fff' : '#4D750F',
                        '&:hover': {
                            backgroundColor: theme === 'dark'
                                ? 'rgba(255, 255, 255, 0.1)'
                                : 'rgba(77, 117, 15, 0.1)'
                        }
                    }}
                >
                    <FileDownload />
                </IconButton>
            )
        }
    ];

    // Paginación
    const handlePageChange = (newPage: number) => {
        if (isInternalUser) {
            fetchAllData(newPage);
        } else {
            if (valueSesion?.user?.tokens?.access && !isLoadingInvoices) {
                const searchParams: any = {};
                if (formData.nroFacturaUnica) searchParams.nro_factura_unica = formData.nroFacturaUnica;
                if (formData.fechaInicio) searchParams.fecha_desde = formatDateForApi(formData.fechaInicio);
                if (formData.fechaFin) searchParams.fecha_hasta = formatDateForApi(formData.fechaFin);
                
                fetchFacturasPSE(valueSesion.user.tokens.access, newPage, searchParams);
            }
        }
    };

    const fetchAllData = async (page: number) => {
        if (isInternalUser) {
            const params: any = {
                page,
                page_size: 10
            };
            if (formData.tipoDocumento) params.tipo_documento_proveedor = formData.tipoDocumento;
            if (formData.documentoIdentificacion) params.numero_documento_proveedor = formData.documentoIdentificacion;
            if (formData.razonSocial) params.nombre_proveedor = formData.razonSocial;
            if (formData.departamento) params.id_departamento_cacao = formData.departamento;
            if (formData.municipio) params.id_municipio_cacao = formData.municipio;
            if (formData.fechaInicio) params.fecha_desde = formatDateForApi(formData.fechaInicio);
            if (formData.fechaFin) params.fecha_hasta = formatDateForApi(formData.fechaFin);
            if (formData.direccion_contacto_recaudador) params.direccion_contacto_recaudador = formData.direccion_contacto_recaudador;
            if (formData.telefono_contacto_recaudador) params.telefono_contacto_recaudador = formData.telefono_contacto_recaudador;
            if (formData.email_contacto_recaudador) params.email_contacto_recaudador = formData.email_contacto_recaudador;

            return await fetchInternalInvoices(valueSesion?.user?.tokens?.access, params);
        } else {
            const params: any = {
                page,
                page_size: 10
            };
            if (formData.nroFacturaUnica) params.nro_factura_unica = formData.nroFacturaUnica;
            if (formData.fechaInicio) params.fecha_desde = formatDateForApi(formData.fechaInicio);
            if (formData.fechaFin) params.fecha_hasta = formatDateForApi(formData.fechaFin);

            return await fetchFacturasPSE(valueSesion.user.tokens.access, page, params);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        if (name === 'fechaInicio' && formData.fechaFin) {
            const fechaInicio = new Date(value);
            const fechaFin = new Date(formData.fechaFin);
            if (fechaInicio > fechaFin) {
                setIsAlertError(true);
                setAlertErrorText('La fecha de inicio no puede ser posterior a la fecha de finalización');
                return;
            }
        }

        if (name === 'fechaFin' && formData.fechaInicio) {
            const fechaInicio = new Date(formData.fechaInicio);
            const fechaFin = new Date(value);
            if (fechaFin < fechaInicio) {
                setIsAlertError(true);
                setAlertErrorText('La fecha de finalización no puede ser anterior a la fecha de inicio');
                return;
            }
        }

        originalHandleInputChange(e);
    };

    const handleLimpiarFacturas = () => {
        setSelectedInvoices([]);
    };

    // Función para manejar el pago PSE
    const handlePagarPSE = async (idFactura: number) => {
        try {
            setIsAlertLoader(true);
            setAlertLoaderText('Obteniendo datos para el pago...');
            
            // Obtener detalles de la factura
            const facturaDetalle = await getFacturaDetalle(valueSesion?.user?.tokens?.access || '', idFactura);
            
            if (facturaDetalle && facturaDetalle.success) {
                // Guardar datos en sessionStorage para accederlos en la página de integración
                sessionStorage.setItem('pse_payment_data', JSON.stringify({
                    cuota_fomento: facturaDetalle.cuota_fomento,
                    valor_intereses: facturaDetalle.valor_intereses,
                    valor_pagar: facturaDetalle.valor_pagar,
                    factura_id: idFactura,
                    nro_factura_unica: facturaDetalle.nro_factura_unica || (facturaDetalle.data && facturaDetalle.data.length > 0 ? facturaDetalle.data[0].recaudador_info.nro_factura_unica : null),
                    nro_doc_pago: facturaDetalle.nro_doc_pago
                }));
                
                // Redirigir a la página de integración PSE
                router.push('/PSE/integracion');
            } else {
                setIsAlertError(true);
                setAlertErrorText('No se pudieron obtener los datos de la factura para realizar el pago');
            }
        } catch (error) {
            console.error('Error al obtener detalles para pago PSE:', error);
            setIsAlertError(true);
            setAlertErrorText('Ocurrió un error al preparar el pago. Intente nuevamente.');
        } finally {
            setIsAlertLoader(false);
        }
    };

    return (
        <div className="space-y-6">

            <AlertError
                isOpen={isAlertError}
                message={alertErrorText}
                messageHtml={alertErrorTextHtml}
                onClose={() => setIsAlertError(false)}
            />

            <AlertLoader
                isOpen={isAlertLoader}
                loadingText={alertLoaderText}
            />

            <AlertSuccess
                isOpen={isAlertSuccess}
                message={alertSuccessText}
                onClose={() => setIsAlertSuccess(false)}
            />

            <div
                className={`m-auto w-full rounded-3xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'
                    }`}
            >
                <div className="bg-white rounded-3xl shadow-md p-6">
                    <h2
                        className={` text-xl sm:text-2xl lg:text-3xl  font-bold text-center my-6 ${theme === 'dark' ? 'text-white' : 'text-[#562707]'
                            }`}
                    >
                        PAGO EN LÍNEA CUOTA DE FOMENTO CACAOTERO
                    </h2>

                    <div className={`flex justify-between items-center mb-10 px-8 py-6 rounded-lg ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e] border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
                        <div className="w-2/5 flex flex-col items-center">
                            <Logo />
                        </div>
                        <div className="flex-grow flex justify-center">
                            <div className={`h-16 w-0.5 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                        </div>
                        <div className="w-2/5 flex flex-col items-center">
                            <LogoPSE />
                        </div>
                    </div>

                    <h3 className="text-md font-bold my-6 text-[rgb(var(--brown))]">
                        Datos del comprador
                    </h3>

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
                        />

                        <AnimatedInput
                            label="Número de Documento"
                            name="documentoIdentificacion"
                            value={formData.documentoIdentificacion || ''}
                            onChange={handleInputChange}
                            type="text"
                            error={!!validationErrors.documentoIdentificacion}
                            disabled={!(isInternalUser === true)}
                        />

                        <AnimatedInput
                            label="Razón Social"
                            name="razonSocial"
                            value={formData.razonSocial || ''}
                            onChange={handleInputChange}
                            type="text"
                            disabled={!(isInternalUser === true)}
                        />

                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mt-6">


                        <AnimatedSelect
                            label="Departamento"
                            name="departamento"
                            value={formData.departamento || ''}
                            onChange={handleDepartmentChange}
                            options={getDepartmentOptions()}
                            disabled={!(isInternalUser === true)}
                        />


                        <AnimatedSelect
                            label="Municipio"
                            name="municipio"
                            value={formData.municipio || ''}
                            onChange={handleSelectChange}
                            options={getCityOptions()}
                            disabled={!(isInternalUser === true)}
                        />

                        <AnimatedInput
                            label="Correo electrónico"
                            name="email_contacto_recaudador"
                            value={formData.email_contacto_recaudador || ''}
                            onChange={handleInputChange}
                            type="text"
                            disabled={!(isInternalUser === true)}
                        />
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mt-6">
                        <AnimatedInput
                            label="Dirección"
                            name="direccion_contacto_recaudador"
                            value={formData.direccion_contacto_recaudador || ''}
                            onChange={handleInputChange}
                            type="text"
                            disabled={!(isInternalUser === true)}
                        />

                        <AnimatedInput
                            label="Teléfono"
                            name="telefono_contacto_recaudador"
                            value={formData.telefono_contacto_recaudador ||''}
                            onChange={handleInputChange}
                            type="number"
                            disabled={!(isInternalUser === true)}
                        />
                    </div>

                </div>

                <div className="bg-white rounded-3xl shadow-md p-6 mt-6">

                    <div className="grid md:grid-cols-3 gap-6">

                        <AnimatedInput
                            label="Factura única"
                            name="nroFacturaUnica"
                            value={formData.nroFacturaUnica || ''}
                            onChange={handleInputChange}
                            type="text"
                        />

                        <AnimatedInput
                            label="Fecha de consulta"
                            name="fechaConsulta"
                            value={new Date().toISOString().split('T')[0]}
                            onChange={handleInputChange}
                            type="date"
                            disabled={true}
                        />

                        <div></div>

                        <AnimatedInput
                            label="Fecha de inicio"
                            name="fechaInicio"
                            value={formData.fechaInicio || ''}
                            onChange={handleInputChange}
                            type="date"
                        />

                        <AnimatedInput
                            label="Fecha de finalización"
                            name="fechaFin"
                            value={formData.fechaFin || ''}
                            onChange={handleInputChange}
                            type="date"
                        />

                    </div>


                    <div className="flex justify-center gap-4 mt-6">
                        <Button title="Limpiar" onClick={handleLimpiar} />
                        <Button title="Buscar" onClick={handleSearch} />
                        <Button title="Salir" onClick={() => router.push('/')} />
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-md p-6 mt-6">

                    <h2
                        className={` text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${theme === 'dark' ? 'text-white' : 'text-[#562707]'
                            }`}
                    >
                        FACTURAS ÚNICAS NACIONALES LIQUIDADAS
                    </h2>

                    {isInternalUser ? (
                        <DynamicTable
                            columns={columns}
                            data={internalInvoices}
                            isLoading={isLoadingInternalInvoices}
                            currentPage={internalCurrentPage}
                            totalPages={internalTotalPages}
                            onPageChange={handlePageChange}
                            actions={actions}
                            fetchAllData={fetchAllData}
                        />
                    ) : (
                        <DynamicTable
                            columns={columns}
                            data={facturasPSE}
                            isLoading={isLoadingInvoices}
                            currentPage={currentPage}
                            totalPages={invoicesTotalPages}
                            onPageChange={handlePageChange}
                            actions={actions}
                            fetchAllData={fetchAllData}
                        />
                    )}


                    <div className="flex justify-center gap-4 mt-6">
                        
                        <Button title="Limpiar facturas" onClick={handleLimpiarFacturas} />
                    </div>
                </div>


            </div>
            <AlertQuestion
                isOpen={showLiquidationAlert}
                onClose={() => setShowLiquidationAlert(false)}
                onConfirm={handleConfirmLiquidation}
                questionText="Desea liquidar la compra de cacao de la(s) factura(s) Unica(s) Nacional(es) seleccionada(s)"
            />
            <AlertQuestionWithDocument
                isOpen={showConfirmationModal}
                onClose={() => setShowConfirmationModal(false)}
                onConfirm={handleConfirmGeneration}
                questionText="Esta acción genera la liquidación de la compra de la factura única nacional y emite la cuenta de cobro respectiva. ¿Desea realizar la liquidación?"
                documentUrl={documentUrl}
            />
        </div>
    );
};

export default SearchLiquidation;
