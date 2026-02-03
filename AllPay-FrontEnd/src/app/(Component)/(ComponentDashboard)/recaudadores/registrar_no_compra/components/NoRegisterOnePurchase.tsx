'use client';

// utils
import { formatCurrency } from '@/utils/formatters';

// next
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';

// ui
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { AnimatedTextarea } from '@/presenters/components/ui/AnimatedTextarea';
import AlertNotification from '@/presenters/components/recaudadores/AlertNotification';

// proveedor
import CreateProviderModal from '@/presenters/components/recaudadores/CreateProviderModal';

// address
import useGetDepartments from '@/application/address/useGetDepartmentsCacao';

// dni
import { useTypeDni } from '@/application/dni/useTypeDni';

// user profile
import { useUserProfile } from '@/application/user/useUserProfile';


import RegisterPurchase from './RegisterPurchase';
import { useGetTaxCollectors } from '@/application/user/useGetTaxCollectors';
import { useRegistroNoCompras } from '../hooks/useRegistroNoCompras';
import { RegistroNoComprasData } from '../models/registroNoCompras.model';
import { getRegistroNoCompras } from '../adapter/registroNoCompras.adapter';

// notificaciones
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
import AlertQuestion from '@/presenters/components/recaudadores/AlertQuestion';

interface FormData {
    fechaCompra: string;
    fechaRegistro: string;
    nitComprador: string;
    comprador: string;
    telefono: string;
    ciudad: string;
    tipoComprador: string[];
    direccion: string;
    email: string;
    facturaUnica: string;
    nitProveedor: string;
    nombreProveedor: string;
    departamento: string;
    municipio: string;
    departamento_compra: string;
    municipio_compra: string;
    tipo_documento_recaudador: string;
    numero_documento_recaudador: string;
    tipo_documento_proveedor: string;
    numero_documento_proveedor: string;
    doc_soporte: File | null;
    id_persona_proveedor: number;
    id_persona_recaudador: number;
    nro_documento_soporte: string;
    doc_soporte_url?: string | File;
    nombre_comercial?: string;
    nombre_finca: string;
    nombre_vereda: string;
}

interface PurchaseDetailsProps {

    contentProps?: any;
    invoiceData?: {
        recaudador_info: {
            fecha_compra: string;
            fecha_registro: string;
            numero_documento: string;
            nombre_completo_o_comercial: string;
            telefono: string;
            municipio: string;
            tipo_comprador: string;
            direccion_notificaciones: string;
            email: string;
            nro_factura_unica: string;
        };
        proveedor_info: {
            numero_documento: string;
            nombre_completo_o_comercial: string;
            departamento: string;
            municipio: string;
        };
    };
}

export interface PurchaseData {
    id: string;
    tipoCacao: string;
    cantidadKilos: string;
    precioKilo: string;
    valorBruto: string;
    cuotaFomento: string;
    valorNeto: string;
}

const RegisterOnePurchase: React.FC<PurchaseDetailsProps> = ({ invoiceData, }) => {
    
    const router = useRouter();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();
    const isRegisterRoute = pathname?.includes('/recaudadores/registrar_compra') || pathname?.includes('/recaudadores/registrar_no_compra');
    const { types, fetchTypes } = useTypeDni();
    const { data: session } = useSession();
    const valueSesion: any = session;
    const { fetchTaxCollectors, isLoading: isLoadingTaxCollectors } = useGetTaxCollectors();
    const [, setPurchases] = useState<PurchaseData[]>([]);
    const [, setLocalValorTotal] = useState('0.00');
    const [hasFetchedTypes, setHasFetchedTypes] = useState(false);
    
    // Hook para obtener registros de no compras
    const token = valueSesion?.user?.tokens?.access || '';
    const itemsPerPage = 10;
    const { 
        data: registrosNoCompras, 
        isLoading: isLoadingRegistros, 
        error: errorRegistros, 
        fetchRegistroNoCompras,
        createRegistro,
        isCreating,
        createError,
        getRegistroById,
        selectedRecord,
        updateRegistro,
        isUpdating,
        updateError,
        currentPage: apiCurrentPage,
        totalPages: apiTotalPages,
    } = useRegistroNoCompras(token, itemsPerPage);
    
    // Hook para obtener el perfil del usuario
    const { profile } = useUserProfile(token);
    const [isInternalUser, setIsInternalUser] = useState<boolean | null>(null);
    const [editingPurchase, setEditingPurchase] = useState<PurchaseData | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isViewMode, setIsViewMode] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
    
    // Estados para el formulario del modal de registro
    const [registerFormData, setRegisterFormData] = useState({
        fecha_registro: '',
        descripcion: '',
        archivo_soporte: null as File | null
    });
    const registerFileInputRef = useRef<HTMLInputElement>(null);
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');


    const { fetchDepartments } = useGetDepartments();

    // notificaciones
    const [isSuccess, setIsSuccess] = useState(false);
    const [successText, setSuccessText] = useState<string | React.ReactNode>('');
    const [redirectOnSuccess, setRedirectOnSuccess] = useState(false);
    const [isError, setIsError] = useState(false);
    const [errorText, setErrorText] = useState('');
    const [isLoading, ] = useState(false);
    const [isLoadingText, ] = useState('');
    const [isAlertQuestion, setIsAlertQuestion] = useState(false);
    const [alertQuestionText, ] = useState('');
    
    // Estados para el AlertQuestion del modal de registro
    const [isRegisterAlertQuestion, setIsRegisterAlertQuestion] = useState(false);

    const [formData, setFormData] = useState<FormData>({
        fechaCompra: '',
        fechaRegistro: '',
        nitComprador: '',
        comprador: '',
        telefono: '',
        ciudad: '',
        tipoComprador: [],
        direccion: '',
        email: '',
        facturaUnica: '',
        nitProveedor: '',
        nombreProveedor: '',
        departamento: '',
        municipio: '',
        departamento_compra: '',
        municipio_compra: '',
        tipo_documento_recaudador: '',
        numero_documento_recaudador: '',
        tipo_documento_proveedor: '',
        numero_documento_proveedor: '',
        doc_soporte: null,
        id_persona_proveedor: 0,
        id_persona_recaudador: 0,
        nro_documento_soporte: '',
        nombre_comercial: '',
        nombre_finca: '',
        nombre_vereda: '',
    });

    // Agregar estado para la compra a eliminar
    const [purchaseToDelete, setPurchaseToDelete] = useState<string | null>(null);

    // Log para depuración: ver el estado de formData cuando cambia
    useEffect(() => {
        console.log('🔍 [formData] Estado actualizado:', {
            id_persona_recaudador: formData.id_persona_recaudador,
            tipo_usuario: valueSesion?.user?.tipo_usuario,
            isInternalUser
        });
    }, [formData.id_persona_recaudador, valueSesion?.user?.tipo_usuario, isInternalUser]);

    useEffect(() => {
        if (!valueSesion?.user?.tipo_usuario) return;

        if (valueSesion.user.tipo_usuario === 'I') {
            setIsInternalUser(true);
        } else if (valueSesion.user.tipo_usuario === 'E') {
            setIsInternalUser(false);
        }
    }, [valueSesion?.user?.tipo_usuario]);

    // Efecto separado para manejar el tipo de comprador cuando hay datos del recaudador
    useEffect(() => {
        if (invoiceData?.recaudador_info?.tipo_comprador) {
            const tiposComprador = invoiceData.recaudador_info.tipo_comprador.split('|');
            const tiposSeleccionados: string[] = [];

            if(tiposComprador){
                for (const tipo of tiposComprador) {
                    const tipoLimpio = tipo.trim();
                    switch (tipoLimpio) {
                        case 'T':
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
            }

            if(isInternalUser) return;

            setFormData(prev => ({
                ...prev,
                tipoComprador: tiposSeleccionados
            }));
        }
    }, [invoiceData]);

    useEffect(() => {
        if (isRegisterRoute) {
            if (valueSesion?.user?.tipo_usuario === 'E' && invoiceData?.recaudador_info) {
                const recaudadorData = invoiceData.recaudador_info;
                const telefonoEmpresa = (recaudadorData as any)?.celular_empresa || '';
                
                // Para usuarios externos, usar directamente nombre_completo_o_comercial que ya viene construido
                const compradorNombre = recaudadorData.nombre_completo_o_comercial || '';
                
                setFormData(prev => {
                    // 🔒 Si ya hay un id válido NO lo pises (el usuario ya buscó un recaudador)
                    console.log('🔍 [useEffect] Prev id_persona_recaudador:', prev.id_persona_recaudador);
                    const recaudadorInfo = {
                        nitComprador: recaudadorData.numero_documento || '',
                        comprador: compradorNombre,
                        telefono: recaudadorData.telefono || telefonoEmpresa,
                        ciudad: recaudadorData.municipio || '',
                        direccion: (recaudadorData as any).direccion_residencia || recaudadorData.direccion_notificaciones || '',
                        email: recaudadorData.email || '',
                        // Solo establecer id_persona_recaudador en 0 si no hay un valor válido
                        id_persona_recaudador: prev.id_persona_recaudador && prev.id_persona_recaudador > 0 ? prev.id_persona_recaudador : 0,
                        tipo_documento_recaudador: prev.tipo_documento_recaudador || '',
                        numero_documento_recaudador: prev.numero_documento_recaudador || '',
                        fechaRegistro: recaudadorData.fecha_registro || '',
                        facturaUnica: recaudadorData.nro_factura_unica || ''
                    };
                    console.log('🔍 [useEffect] Nuevo id_persona_recaudador:', recaudadorInfo.id_persona_recaudador);

                    return {
                        ...prev,
                        ...recaudadorInfo
                    };
                });
            } else if (valueSesion?.user?.tipo_usuario === 'I') {
                setFormData(prev => {
                  // 🔒 Si ya hay un id válido NO lo pises
                  if (prev.id_persona_recaudador) return prev;
            
                  return {
                    ...prev,
                    id_persona_recaudador: 0,
                    tipo_documento_recaudador: prev.tipo_documento_recaudador || '',
                    numero_documento_recaudador: prev.numero_documento_recaudador || ''
                  };
                });
            }
        }
    }, [valueSesion?.user?.tipo_usuario, isRegisterRoute, invoiceData]);

    useEffect(() => {
        if (invoiceData?.recaudador_info && !formData.nitComprador) {
            const recaudadorData = invoiceData.recaudador_info;
            setFormData(prev => ({
                ...prev,
                fechaRegistro: recaudadorData.fecha_registro,
                facturaUnica: recaudadorData.nro_factura_unica
            }));
        }
    }, [invoiceData]);

    useEffect(() => {
        if (valueSesion?.user?.tokens?.access && !hasFetchedTypes) {
            fetchTypes(valueSesion.user.tokens.access);
            setHasFetchedTypes(true);
        }
    }, [valueSesion, hasFetchedTypes, fetchTypes]);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Cargar registros de no compras cuando se monte el componente
    useEffect(() => {
        if (token && mounted) {
            fetchRegistroNoCompras(1);
        }
    }, [token, mounted, fetchRegistroNoCompras]);

    // Función helper para extraer la fecha sin problemas de zona horaria
    const extractDateOnly = useCallback((dateString: string): string => {
        if (!dateString) return '';
        // Si ya está en formato YYYY-MM-DD, retornarlo directamente
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }
        // Si viene en formato ISO con hora, extraer solo la parte de la fecha
        const dateMatch = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
            return dateMatch[1];
        }
        // Fallback: intentar parsear como Date y usar la fecha local
        try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch {
            return '';
        }
    }, []);

    // Actualizar formulario cuando se seleccione un registro para ver (solo cuando se carga inicialmente)
    useEffect(() => {
        if (selectedRecord && isViewMode && !isEditMode && editingRecordId) {
            setRegisterFormData({
                fecha_registro: extractDateOnly(selectedRecord.fecha_registro),
                descripcion: selectedRecord.descripcion || '',
                archivo_soporte: null
            });
        }
    }, [selectedRecord, editingRecordId, extractDateOnly]);


    // Función para obtener datos paginados del servidor
    const fetchAllData = async (page: number) => {
        // Si es usuario interno y hay un id_recaudador buscado, incluirlo en los parámetros
        const params: any = {};
        if (isInternalUser === true && formData.id_persona_recaudador && formData.id_persona_recaudador > 0) {
            params.id_recaudador = formData.id_persona_recaudador;
        }
        
        if (page === 0) {
            // Para descarga completa, usar sin_paginacion - NO actualiza el estado de la UI
            try {
                // Llamar directamente al adapter sin pasar por el hook para no actualizar el estado de la UI
                const result = await getRegistroNoCompras(token, { sin_paginacion: true, ...params });
                return {
                    data: result?.data || [],
                    total_pages: 1
                };
            } catch (error) {
                console.error('Error al obtener datos para Excel:', error);
                return {
                    data: [],
                    total_pages: 1
                };
            }
        }
        
        // Para paginación normal, obtener la página del servidor (usa el hook para actualizar la UI)
        try {
            const result = await fetchRegistroNoCompras(page, params);
            return {
                data: result?.data || [],
                total_pages: result?.total_pages || 1
            };
        } catch (error) {
            console.error('Error al obtener datos paginados:', error);
            return {
                data: [],
                total_pages: 1
            };
        }
    };

    // Función específica para Excel (sin paginación) - NO actualiza el estado de la UI
    const fetchDataForExcel = async (): Promise<{ data: any[]; total_pages: number }> => {
        if (!token) {
            console.error('❌ [EXCEL] No hay token de autenticación');
            return { data: [], total_pages: 1 };
        }

        try {
            // Si es usuario interno y hay un id_recaudador buscado, incluirlo en los parámetros
            const params: any = { sin_paginacion: true };
            if (isInternalUser === true && formData.id_persona_recaudador && formData.id_persona_recaudador > 0) {
                params.id_recaudador = formData.id_persona_recaudador;
            }
            
            // Llamar directamente al adapter sin pasar por el hook para no actualizar el estado de la UI
            const result = await getRegistroNoCompras(token, params);
            const dataArray = Array.isArray(result?.data) ? result.data : [];
            console.log(`📊 [EXCEL] Datos obtenidos: ${dataArray.length} filas`);
            return {
                data: dataArray,
                total_pages: 1
            };
        } catch (error) {
            console.error('❌ [EXCEL] Error al obtener datos:', error);
            return { data: [], total_pages: 1 };
        }
    };

    // Manejar cambio de página
    const handlePageChange = async (page: number) => {
        await fetchAllData(page);
    };

    const getFilteredDocumentTypes = () => {
        if (!types || types.length === 0) {
            return [];
        }

        return types.map(type => ({
            key: type.cod_tipo_documento || '',
            value: type.cod_tipo_documento || '',
            title: type.nombre || ''
        }));
    };

    const [isCreateProviderModalOpen, setIsCreateProviderModalOpen] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;

        const selectedValue = value || '';

        setFormData(prev => {
            const newState = {
                ...prev,
                [name]: selectedValue
            };
            return newState;
        });
    };

    const handleSearchRecaudador = async () => {
        if (!formData.tipo_documento_recaudador || !formData.numero_documento_recaudador) {
            setIsError(true);
            setErrorText('Por favor, ingrese el tipo y número de documento para buscar el recaudador');
            return;
        }

        // Limpiar campos del recaudador excepto factura única
        setFormData(prev => ({
            ...prev,
            nitComprador: '',
            comprador: '',
            telefono: '',
            ciudad: '',
            direccion: '',
            email: '',
            id_persona_recaudador: 0,
            tipoComprador: []
        }));

        try {
            const token = valueSesion?.user?.tokens?.access || '';
            const response = await fetchTaxCollectors(token, {
                tipo_documento: formData.tipo_documento_recaudador,
                numero_documento: formData.numero_documento_recaudador
            });

            if (response && response.data && response.data.length > 0) {
                const recaudador = response.data[0];

                // Procesar tipos de comprador
                const tiposComprador = recaudador.cod_tipo_comprador.split('|');
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

                const compradorNombre = `${recaudador.nombres || ''} ${recaudador.apellidos || ''}`.trim() || (recaudador as any).nombre_comercial || (recaudador as any).nombre_completo_o_comercial || '';

                console.log('🔍 [BUSCAR] Recaudador encontrado:', recaudador);
                console.log('🔍 [BUSCAR] id_persona del recaudador:', recaudador.id_persona);
                
                const idRecaudadorEncontrado = recaudador.id_persona || 0;
                
                setFormData(prev => {
                    const newData = {
                        ...prev,
                        nitComprador: recaudador.numero_documento || '',
                        comprador: compradorNombre,
                        telefono: recaudador.celular_persona || (recaudador as any).celular_empresa || '',
                        ciudad: recaudador.nombre_municipio_expedicion || '',
                        direccion: recaudador.direccion_residencia || recaudador.direccion_notificaciones ||  '',
                        email: recaudador.email || '',
                        id_persona_recaudador: idRecaudadorEncontrado,
                        tipo_documento_recaudador: formData.tipo_documento_recaudador || '',
                        numero_documento_recaudador: formData.numero_documento_recaudador || '',
                        tipoComprador: tiposSeleccionados,
                        nombre_comercial: (recaudador as any).nombre_comercial || (recaudador as any).nombre_completo_o_comercial || ''
                    };
                    console.log('🔍 [BUSCAR] Nuevo formData con id_persona_recaudador:', newData.id_persona_recaudador);
                    return newData;
                });

                // Si es usuario interno, actualizar la lista con el filtro id_recaudador
                if (isInternalUser === true && idRecaudadorEncontrado > 0) {
                    console.log('🔍 [BUSCAR] Usuario interno - actualizando lista con id_recaudador:', idRecaudadorEncontrado);
                    await fetchRegistroNoCompras(1, { id_recaudador: idRecaudadorEncontrado });
                }

                setIsSuccess(true);
                setSuccessText('Recaudador encontrado');
                return;
            }

            setIsError(true);
            setErrorText('No se encontró ningún recaudador con los datos proporcionados');

        } catch (error) {
            console.error('Error al buscar recaudador:', error);
            setIsError(true);
            setErrorText(error instanceof Error ? error.message : 'Ocurrió un error al buscar el recaudador');
        }
    };

    const handleClearFilter = async () => {
        // Limpiar todos los campos del recaudador
        setFormData(prev => ({
            ...prev,
            nitComprador: '',
            comprador: '',
            telefono: '',
            ciudad: '',
            direccion: '',
            email: '',
            id_persona_recaudador: 0,
            tipoComprador: [],
            tipo_documento_recaudador: '',
            numero_documento_recaudador: '',
            nombre_comercial: ''
        }));

        // Si es usuario interno, actualizar la lista sin filtros
        if (isInternalUser === true) {
            console.log('🔍 [LIMPIAR] Usuario interno - actualizando lista sin filtros');
            await fetchRegistroNoCompras(1);
        }

        setIsSuccess(true);
        setSuccessText('Filtro limpiado correctamente');
    };

    // Los datos ya vienen paginados del servidor, no necesitamos paginar localmente
    const getCurrentPageData = (data: any[]) => {
        // Asegurar que data sea un array
        return Array.isArray(data) ? data : [];
    };

    const handleTipoCompradorChange = (tipo: string) => {
        setFormData(prev => {
            const currentTypes = prev.tipoComprador || [];

            const newTypes = currentTypes.includes(tipo)
                ? currentTypes.filter(t => t !== tipo)
                : [...currentTypes, tipo];

            return {
                ...prev,
                tipoComprador: newTypes
            };
        });
    };

    // Agregar manejador para la confirmación de eliminación
    const handleDeleteConfirm = () => {
        if (!purchaseToDelete) return;

        const recaudadorData = {
            nitComprador: formData.nitComprador,
            comprador: formData.comprador,
            telefono: formData.telefono,
            ciudad: formData.ciudad,
            direccion: formData.direccion,
            email: formData.email,
            id_persona_recaudador: formData.id_persona_recaudador,
            tipo_documento_recaudador: formData.tipo_documento_recaudador,
            numero_documento_recaudador: formData.numero_documento_recaudador
        };

        setPurchases((prev) => {
            const filtered = prev.filter((p) => p.id !== purchaseToDelete);
            const total = filtered
                .reduce((acc, p) => acc + parseFloat(p.cuotaFomento), 0)
                .toFixed(2);

            setLocalValorTotal(total);
            return filtered;
        });

        setFormData((prev: any) => ({
            ...prev,
            ...recaudadorData
        }));

        setIsSuccess(true);
        setSuccessText('La compra ha sido eliminada correctamente');
        setPurchaseToDelete(null);
    };

    const tableColumns = [
        {
            key: 'fecha_registro',
            label: 'FECHA DE REGISTRO',
            render: (v: string) => {
                if (!v) return '';
                const fecha = new Date(v);
                return fecha.toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
            }
        },
        {
            key: 'descripcion',
            label: 'DESCRIPCION'
        },
        {
            key: 'actions',
            label: 'ACCIONES',
            render: (_: any, row: RegistroNoComprasData) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleEditRegistroNoCompra(row.id_no_compras)}
                        className="p-1 hover:bg-gray-100 rounded-full"
                        title="Editar registro"
                    >
                        <img src="/images/icons/update.png" className="w-5 h-5" alt="Editar" />
                    </button>
              
                    {(row.doc_soporte || row.doc_soporte_url) && (
                        <button
                            onClick={() => window.open(row.doc_soporte_url || row.doc_soporte || '', '_blank', 'noopener,noreferrer')}
                            className="p-1 hover:bg-gray-100 rounded-full"
                            title="Descargar documento soporte"
                        >
                            <img src="/images/icons/descarga.png" className="w-5 h-5" alt="Descargar" />
                        </button>
                    )}
                </div>
            )
        }
    ];

    const handleEditRegistroNoCompra = async (id: number) => {
        try {
            const result = await getRegistroById(id);
            // Si hay un registro seleccionado, llenar el formulario
            if (result?.data) {
                setRegisterFormData({
                    fecha_registro: extractDateOnly(result.data.fecha_registro),
                    descripcion: result.data.descripcion || '',
                    archivo_soporte: null
                });
            }
            setEditingRecordId(id);
            setIsViewMode(false);
            setIsEditMode(true);
            setIsRegisterModalOpen(true);
        } catch (error) {
            setIsError(true);
            setErrorText(error instanceof Error ? error.message : 'Error al cargar el registro');
        }
    };

    const handleUpdateRegistro = async () => {
        if (!editingRecordId) return;

        // Validar que haya descripción
        if (!registerFormData.descripcion.trim()) {
            setIsError(true);
            setErrorText('Por favor, ingrese una descripción');
            return;
        }

        // Obtener id_recaudador según el tipo de usuario
        let idRecaudador: number | undefined;
        
        // Verificar si el usuario es interno (true) o externo (false)
        // Si isInternalUser es null, asumimos que es externo por defecto
        if (isInternalUser === true) {
            // Usuario interno: usar el id_recaudador que viene en la respuesta del registro
            // No es necesario buscarlo, ya viene en selectedRecord
            idRecaudador = selectedRecord?.id_recaudador;
            
            if (!idRecaudador || idRecaudador === 0) {
                setIsError(true);
                setErrorText('No se pudo obtener el ID del recaudador del registro. Por favor, recargue la página.');
                return;
            }
        } else {
            // Usuario externo: usar el id del perfil del usuario (su propio ID)
            idRecaudador = profile?.persona?.id_persona;
            
            // Validar que el usuario externo tenga un ID de persona
            if (!idRecaudador || idRecaudador === 0) {
                setIsError(true);
                setErrorText('No se pudo obtener el ID del recaudador. Por favor, recargue la página.');
                return;
            }
        }

        try {
            await updateRegistro(editingRecordId, {
                descripcion: registerFormData.descripcion,
                id_recaudador: idRecaudador,
                doc_soporte: registerFormData.archivo_soporte
            });

            // Actualizar la lista manteniendo el filtro si es usuario interno
            const params: any = {};
            if (isInternalUser === true && formData.id_persona_recaudador && formData.id_persona_recaudador > 0) {
                params.id_recaudador = formData.id_persona_recaudador;
            }
            await fetchRegistroNoCompras(apiCurrentPage, params);

            // Mostrar mensaje de éxito
            setIsSuccess(true);
            setSuccessText('El registro de no compra se ha actualizado correctamente');
            
            // Cerrar el modal y limpiar el formulario
            setIsRegisterModalOpen(false);
            setIsViewMode(false);
            setIsEditMode(false);
            setEditingRecordId(null);
            setRegisterFormData({
                fecha_registro: '',
                descripcion: '',
                archivo_soporte: null
            });
            if (registerFileInputRef.current) {
                registerFileInputRef.current.value = '';
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el registro de no compra';
            setIsError(true);
            setErrorText(errorMessage);
        }
    };

    const handleEditChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        if (!editingPurchase) return;
        const { name, value } = e.target;

        setEditingPurchase((prev) => ({
            ...prev!,
            [name]: value
        }));

        if (name === 'cantidadKilos' || name === 'precioKilo') {
            const updatedPurchase = {
                ...editingPurchase,
                [name]: value
            };
            const cantidadKilos = parseFloat(updatedPurchase.cantidadKilos) || 0;
            const precioKilo = parseFloat(updatedPurchase.precioKilo) || 0;
            const valorBruto = (cantidadKilos * precioKilo).toFixed(4);

            setEditingPurchase((prev) => ({
                ...prev!,
                valorBruto,
            }));
        }
    };

    const handleEditSave = () => {
        if (!editingPurchase) return;

        try {
            setPurchases((prev) => {
                const updatedList = prev.map((item) =>
                    item.id === editingPurchase.id ? editingPurchase : item
                );
                const total = updatedList.reduce((acc, p) => acc + parseFloat(p.cuotaFomento), 0);
                setLocalValorTotal(total.toFixed(2));
                return updatedList;
            });

            setIsEditModalOpen(false);
            setEditingPurchase(null);

            setIsSuccess(true);
            setSuccessText('Los cambios se han guardado correctamente');

        } catch (error) {
            console.error('Error al guardar los cambios:', error);
            setIsError(true);
            setErrorText('Ocurrió un error al guardar los cambios');
        }
    };

    const handleErrorAlertClose = () => {
        setShowErrorAlert(false);
        setErrorMessage('');
    };

    const handleSavePurchases = useCallback((rows: PurchaseData[]) => {
        setPurchases((prev) => {
            const ids = new Set(prev.map((p) => p.id));
            const uniques = rows.filter((r) => !ids.has(r.id));
            const merged = [...prev, ...uniques];

            const total = merged
                .reduce((acc, p) => acc + parseFloat(p.cuotaFomento), 0)
                .toFixed(2);

            setLocalValorTotal(total);
            return merged;
        });
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    if (!mounted) {
        return null;
    }

    return (
        <div className="space-y-4 xl:space-y-6">

            <AlertSuccess
                isOpen={isSuccess}
                messageHtml={successText}
                onClose={() => {
                    setIsSuccess(false);
                    if (redirectOnSuccess) {
                        setRedirectOnSuccess(false);
                        router.push('/recaudadores/consultar_factura');
                    }
                }}
            />

            <AlertError
                isOpen={isError}
                message={errorText}
                onClose={() => setIsError(false)}
            />

            <AlertLoader
                isOpen={isLoading || isLoadingRegistros || isCreating || isUpdating}
                loadingText={
                    isUpdating
                        ? 'Actualizando registro de no compra...'
                        : isCreating 
                            ? 'Creando registro de no compra...' 
                            : isLoadingRegistros 
                                ? 'Cargando registros de no compras...' 
                                : isLoadingText
                }
            />

            {errorRegistros && (
                <AlertError
                    isOpen={!!errorRegistros}
                    message={errorRegistros}
                    onClose={() => {}}
                />
            )}

            {createError && (
                <AlertError
                    isOpen={!!createError}
                    message={createError}
                    onClose={() => {}}
                />
            )}

            {updateError && (
                <AlertError
                    isOpen={!!updateError}
                    message={updateError}
                    onClose={() => {}}
                />
            )}

            <AlertQuestion
                isOpen={isAlertQuestion}
                questionText={alertQuestionText}
                onClose={() => {
                    setIsAlertQuestion(false);
                    setPurchaseToDelete(null);
                }}
                onConfirm={() => {
                    setIsAlertQuestion(false);
                    handleDeleteConfirm();
                }}
            />

            <div className={`m-auto w-full rounded-3xl p-4 xl:p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                <div className={`relative ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'} rounded-3xl shadow-md p-4 xl:p-6 mb-4 xl:mb-6`}>
                <button
                                onClick={() => router.push('/')}
                                className={`absolute top-2 right-2 sm:right-4 text-xl sm:text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
                            >
                                &times;
                            </button>
                <h3
                          className={`mb-10 text-center  text-xl sm:text-2xl lg:text-3xl font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                        >REGISTRO NO COMPRAS DE CACAO
                    </h3>


                    <div className='flex flex-col xl:flex-row gap-4 xl:gap-6'>
                        <div className={`flex flex-col items-center xl:items-start justify-start ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'} space-y-4 xl:space-y-6`}>
                            <Image
                                src={isDarkMode ? "/images/corporate/logo-white.png" : "/images/corporate/logo.png"}
                                alt="Federación Nacional de Cacaoteros"
                                width={200}
                                height={200}
                                className="block w-40 xl:w-48 2xl:w-64 mx-auto xl:mx-0"
                            />

                            <div className="font-bold text-center text-sm xl:text-base">
                                <p>FACTURA UNICA NACIONAL</p>
                                <p>LEY 67 DE 1983</p>
                                <p>DECRETO 1000 DE 1984</p>
                                <p>DECRETO 502 DE 1998</p>
                            </div>
                        </div>

                        <div className='w-full mb-6'>
                            <h4 className={`${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'} text-md font-bold mb-6`}>Información de recaudador</h4>

                            {valueSesion?.user?.tipo_usuario === 'I' && (
                                <>
                                    <div className='flex flex-col md:flex-row justify-center mb-4 gap-4'>
                                        <AnimatedSelect
                                            label="TIPO DE DOCUMENTO"
                                            labelSize="sm"
                                            name="tipo_documento_recaudador"
                                            value={formData.tipo_documento_recaudador}
                                            onChange={handleSelectChange}
                                            options={getFilteredDocumentTypes()}
                                            darkMode={isDarkMode}
                                        />

                                        <AnimatedInput
                                            label="NÚMERO DE DOCUMENTO"
                                            labelSize="sm"
                                            name="numero_documento_recaudador"
                                            value={formData.numero_documento_recaudador}
                                            onChange={handleInputChange}
                                            type="text"
                                            darkMode={isDarkMode}
                                        />
                                    </div>

                                    <div className='flex justify-end mb-6 mt-4 gap-4'>
                                        <Button
                                            title={isLoadingTaxCollectors ? "Buscando..." : "Buscar recaudador"}
                                            onClick={handleSearchRecaudador}
                                            disabled={isLoadingTaxCollectors}
                                        />
                                        {formData.id_persona_recaudador > 0 && (
                                            <Button
                                                title="Limpiar"
                                                onClick={handleClearFilter}
                                                disabled={isLoadingRegistros}
                                            />
                                        )}
                                    </div>
                                </>
                            )}

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                       
                                <AnimatedInput
                                    disabled={true}
                                    label="FECHA DE REGISTRO"
                                    name="fechaRegistro"
                                    labelSize="sm"
                                    value={formData.fechaRegistro}
                                    onChange={handleInputChange}
                                    type="date"
                                    darkMode={isDarkMode}
                                />
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                                <AnimatedInput
                                    disabled={true}
                                    label="NIT O CC COMPRADOR"
                                    name="nitComprador"
                                    labelSize="sm"
                                    value={formData.nitComprador}
                                    onChange={handleInputChange}
                                    type="text"
                                    darkMode={isDarkMode}
                                />

                                <AnimatedInput
                                    disabled={true}
                                    label="COMPRADOR"
                                    name="comprador"
                                    labelSize="sm"
                                    value={formData.comprador || formData.nombre_comercial || ''}
                                    onChange={handleInputChange}
                                    type="text"
                                    darkMode={isDarkMode}
                                />
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4 ">
                                <AnimatedInput
                                    disabled={true}
                                    label="TELÉFONO"
                                    name="telefono"
                                    labelSize="sm"
                                    value={formData.telefono}
                                    onChange={handleInputChange}
                                    type="text"
                                    darkMode={isDarkMode}
                                />

                                <AnimatedInput
                                    disabled={true}
                                    label="CIUDAD"
                                    name="ciudad"
                                    labelSize="sm"
                                    value={formData.ciudad}
                                    onChange={handleInputChange}
                                    type="text"
                                    darkMode={isDarkMode}
                                />
                            </div>

                            <div className="flex flex-col-2 gap-2">
                                <div className={`text-sm sm:text-lg ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                    TIPO DE COMPRADOR
                                </div>
                                <div className="flex flex-col w-[70%] justify-center xl:flex-row gap-4 xl:gap-4 mb-6">
                                    <label className="text-sm sm:text-lg flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            name="tipoComprador"
                                            value="Procesador"
                                            checked={formData.tipoComprador.includes('Procesador')}
                                            onChange={() => handleTipoCompradorChange('Procesador')}
                                            disabled={true}
                                            className="form-checkbox text-[#4D750F] rounded"
                                        />
                                        <span className={`${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>PROCESADOR</span>
                                    </label>
                                    <label className="text-sm sm:text-lg flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            name="tipoComprador"
                                            value="Exportador"
                                            checked={formData.tipoComprador.includes('Exportador')}
                                            onChange={() => handleTipoCompradorChange('Exportador')}
                                            disabled={true}
                                            className="form-checkbox text-[#4D750F] rounded"
                                        />
                                        <span className={`${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>EXPORTADOR</span>
                                    </label>
                                    <label className="text-sm sm:text-lg flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            name="tipoComprador"
                                            value="Comerciante"
                                            checked={formData.tipoComprador.includes('Comerciante')}
                                            onChange={() => handleTipoCompradorChange('Comerciante')}
                                            disabled={true}
                                            className="form-checkbox text-[#4D750F] rounded"
                                        />
                                        <span className={`${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>COMERCIANTE</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex flex-col xl:flex-row justify-between gap-4">
                                <div className="flex-grow space-y-4">
                                    <div className="flex items-center gap-4">
                                        <AnimatedInput
                                            disabled={true}
                                            label="DIRECCION"
                                            name="direccion"
                                            labelSize="sm"
                                            value={formData.direccion}
                                            onChange={handleInputChange}
                                            type="text"
                                            darkMode={isDarkMode}
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <AnimatedInput
                                            label="E-MAIL"
                                            name="email"
                                            labelSize="sm"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            type="email"
                                            disabled={true}
                                            darkMode={isDarkMode}
                                        />
                                    </div>
                                </div>
                              
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'} p-4 xl:p-6 rounded-3xl`}>
                    <>

                        <div className="mb-6">
                            <h2 className={` text-xl sm:text-2xl lg:text-3xl mt-[39px] text-center font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'} mb-4`}>
                                REGISTROS NO COMPRAS DE CACAO
                            </h2>
                            <DynamicTable
                                columns={tableColumns}
                                data={getCurrentPageData(registrosNoCompras)}
                                currentPage={apiCurrentPage}
                                totalPages={apiTotalPages}
                                onPageChange={handlePageChange}
                                fetchAllData={fetchAllData}
                                fetchDataForExcel={fetchDataForExcel}
                                isLoading={isLoadingRegistros}
                            />
                        </div>

                        <div className="flex justify-between items-center flex-col md:flex-row">
                            <div className="w-full sm:w-64">
                     
                            </div>
                            <div className="flex gap-4 flex-col sm:flex-row mt-4 md:mt-0">
                                <Button title="Registrar" onClick={() => {
                                    // Establecer la fecha actual al abrir el modal de registro
                                    const today = new Date();
                                    const year = today.getFullYear();
                                    const month = String(today.getMonth() + 1).padStart(2, '0');
                                    const day = String(today.getDate()).padStart(2, '0');
                                    const fechaActual = `${year}-${month}-${day}`;
                                    
                                    setRegisterFormData({
                                        fecha_registro: fechaActual,
                                        descripcion: '',
                                        archivo_soporte: null
                                    });
                                    setIsViewMode(false);
                                    setIsEditMode(false);
                                    setEditingRecordId(null);
                                    setIsRegisterModalOpen(true);
                                }} />
                                <Button title="Salir" onClick={() => router.push('/')} />
                            </div>
                        </div>

                        <RegisterPurchase
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            onSavePurchases={handleSavePurchases}
                        />


                        {isEditModalOpen && editingPurchase && (
                            <ModalContainer
                                isOpen={isEditModalOpen}
                                onClose={() => {
                                    setIsEditModalOpen(false);
                                    setEditingPurchase(null);
                                }}
                                size="md"
                            >
                                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'} mb-6 text-center`}>EDITAR COMPRA</h2>
                                <div className="space-y-4">
          
                                    <AnimatedInput
                                        label="Cantidad de Kilos"
                                        name="cantidadKilos"
                                        value={editingPurchase.cantidadKilos}
                                        onChange={handleEditChange}
                                        type="text"
                                        darkMode={isDarkMode}
                                    />

                                    <AnimatedInput
                                        label="Precio por Kilo"
                                        name="precioKilo"
                                        value={editingPurchase.precioKilo}
                                        onChange={handleEditChange}
                                        type="text"
                                        darkMode={isDarkMode}
                                    />

                                    <AnimatedInput
                                        label="Valor Bruto"
                                        name="valorBruto"
                                        value={formatCurrency(editingPurchase.valorBruto)}
                                        onChange={handleEditChange}
                                        type="text"
                                        disabled
                                        darkMode={isDarkMode}
                                    />

                                    <AnimatedInput
                                        label="Cuota de Fomento"
                                        name="cuotaFomento"
                                        value={formatCurrency(editingPurchase.cuotaFomento)}
                                        onChange={handleEditChange}
                                        type="text"
                                        disabled
                                        darkMode={isDarkMode}
                                    />

                                    <AnimatedInput
                                        label="Valor Neto"
                                        name="valorNeto"
                                        value={formatCurrency(editingPurchase.valorNeto)}
                                        onChange={handleEditChange}
                                        type="text"
                                        disabled
                                        darkMode={isDarkMode}
                                    />
                                </div>

                                <div className="mt-6 flex justify-end space-x-4">
                                    <Button
                                        title="Cancelar"
                                        onClick={() => {
                                            setIsEditModalOpen(false);
                                            setEditingPurchase(null);
                                        }}
                                    />
                                    <Button title="Guardar" onClick={handleEditSave} />
                                </div>
                            </ModalContainer>
                        )}
                    </>
                </div>
            </div>
            <CreateProviderModal
                isOpen={isCreateProviderModalOpen}
                onClose={() => setIsCreateProviderModalOpen(false)}
            />
            <AlertNotification
                isOpen={showErrorAlert}
                onClose={handleErrorAlertClose}
                notificationText={errorMessage}
            />

            {/* Modal de Registro No Compra */}
            <ModalContainer
                isOpen={isRegisterModalOpen}
                onClose={() => {
                    setIsRegisterModalOpen(false);
                    setIsViewMode(false);
                    setRegisterFormData({
                        fecha_registro: '',
                        descripcion: '',
                        archivo_soporte: null
                    });
                    if (registerFileInputRef.current) {
                        registerFileInputRef.current.value = '';
                    }
                }}
                size="md"
            >
                <div className="space-y-6">
                    <h2 className={`text-2xl font-bold text-center mb-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                        {isEditMode ? 'EDITAR REGISTRO NO COMPRAS DE CACAO' : isViewMode ? 'VER REGISTRO NO COMPRAS DE CACAO' : 'REGISTRO NO COMPRAS DE CACAO'}
                    </h2>

                    <div className="space-y-6">
                        {/* FECHA DE REGISTRO */}
                        <div className="flex items-center gap-4">
                            <label className={`text-sm font-bold whitespace-nowrap w-48 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                                FECHA DE REGISTRO
                            </label>
                            <div className="flex-1">
                                <AnimatedInput
                                    type="date"
                                    name="fecha_registro"
                                    label=""
                                    value={registerFormData.fecha_registro}
                                    onChange={(e) => setRegisterFormData(prev => ({ ...prev, fecha_registro: e.target.value }))}
                                    disabled={true}
                                    darkMode={isDarkMode}
                                />
                            </div>
                        </div>

                        {/* DESCRIPCION */}
                        <div className="flex items-start gap-4">
                            <label className={`text-sm font-bold whitespace-nowrap w-48 pt-3 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                                DESCRIPCION
                            </label>
                            <div className="flex-1">
                                <AnimatedTextarea
                                    name="descripcion"
                                    label=""
                                    value={registerFormData.descripcion}
                                    onChange={(e) => setRegisterFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                                    disabled={isViewMode && !isEditMode}
                                    rows={4}
                                    darkMode={isDarkMode}
                                />
                            </div>
                        </div>

                        {/* ADJUNTAR SOPORTE */}
                        {(!isViewMode || isEditMode) && (
                            <div className="flex items-center gap-4">
                                <label className={`text-sm font-bold whitespace-nowrap w-48 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                                    ADJUNTAR SOPORTE
                                </label>
                                <div className="flex-1 flex flex-col items-center gap-2">
                                    <input
                                        ref={registerFileInputRef}
                                        type="file"
                                        id="register_file_input"
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.xlsx,.xls"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            setRegisterFormData(prev => ({ ...prev, archivo_soporte: file }));
                                        }}
                                    />
                                    <label
                                        htmlFor="register_file_input"
                                        className={`cursor-pointer px-4 py-2 rounded-xl font-semibold text-center flex items-center gap-2 w-full ${
                                            isDarkMode
                                                ? 'bg-[rgb(var(--gray-20))] text-white hover:bg-[rgb(var(--gray-40))]/90'
                                                : 'bg-[rgb(var(--gray-20))] text-[rgb(var(--brown))] hover:bg-[rgb(var(--gray-40))]/90'
                                        }`}
                                    >
                                        <img src="/images/icons/upload.png" alt="upload" className="w-5 h-5" />
                                        CARGA DOCUMENTO
                                    </label>

                                    {registerFormData.archivo_soporte && (
                                        <div className="flex items-center gap-2 w-full justify-center">
                                            <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                                                {registerFormData.archivo_soporte.name}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setRegisterFormData(prev => ({ ...prev, archivo_soporte: null }));
                                                    if (registerFileInputRef.current) {
                                                        registerFileInputRef.current.value = '';
                                                    }
                                                }}
                                                className="p-1 hover:bg-red-100 rounded-full transition-colors"
                                            >
                                                <img src="/images/icons/delete.png" alt="delete" className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mostrar documento soporte si está en modo ver */}
                    {isViewMode && selectedRecord?.doc_soporte && (
                        <div className="mt-4">
                            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                DOCUMENTO SOPORTE
                            </label>
                            <a
                                href={selectedRecord.doc_soporte}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-2"
                            >
                                <span>Ver documento</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        </div>
                    )}

                    {/* Botones */}
                    <div className="flex justify-center gap-4 mt-8">
                        {isViewMode && !isEditMode && (
                            <Button
                                title="Actualizar"
                                onClick={() => {
                                    setIsEditMode(true);
                                    setIsViewMode(false);
                                }}
                            />
                        )}
                        {isEditMode && (
                            <Button
                                title="Guardar Cambios"
                                onClick={() => {
                                    // Mostrar AlertQuestion antes de actualizar
                                    setIsRegisterAlertQuestion(true);
                                }}
                            />
                        )}
                        {!isViewMode && !isEditMode && (
                            <Button
                                title="Guardar"
                                onClick={() => {
                                    // Mostrar AlertQuestion antes de guardar
                                    setIsRegisterAlertQuestion(true);
                                }}
                            />
                        )}
                        <Button
                            title={isViewMode || isEditMode ? "Cerrar" : "Salir"}
                            onClick={() => {
                                setIsRegisterModalOpen(false);
                                setIsViewMode(false);
                                setIsEditMode(false);
                                setEditingRecordId(null);
                                setRegisterFormData({
                                    fecha_registro: '',
                                    descripcion: '',
                                    archivo_soporte: null
                                });
                                if (registerFileInputRef.current) {
                                    registerFileInputRef.current.value = '';
                                }
                            }}
                        />
                    </div>
                </div>
            </ModalContainer>

            {/* AlertQuestion para confirmar el registro */}
            <AlertQuestion
                isOpen={isRegisterAlertQuestion}
                questionText={isEditMode ? "Va a actualizar una accion de NO compra de cacao. Desea realizar la actualización ?" : "Va a registrar una accion de NO compra de cacao. Desea realizar el registro ?"}
                answerAfirmative="SI"
                answerNegative="SALIR"
                onClose={() => {
                    setIsRegisterAlertQuestion(false);
                }}
                onConfirm={async () => {
                    // Cerrar el AlertQuestion inmediatamente para que el loader sea visible
                    setIsRegisterAlertQuestion(false);
                    
                    // Si está en modo edición, actualizar
                    if (isEditMode && editingRecordId) {
                        // Pequeño delay para asegurar que el AlertQuestion se cierre antes del loader
                        await new Promise(resolve => setTimeout(resolve, 100));
                        await handleUpdateRegistro();
                        return;
                    }
                    
                    // Si no, crear nuevo registro
                    // Validar que haya descripción
                    if (!registerFormData.descripcion.trim()) {
                        setIsError(true);
                        setErrorText('Por favor, ingrese una descripción');
                        return;
                    }

                    // Obtener id_recaudador según el tipo de usuario
                    let idRecaudador: number | undefined;
                    
                    // Verificar si el usuario es interno (true) o externo (false)
                    // Si isInternalUser es null, asumimos que es externo por defecto
                    if (isInternalUser === true) {
                        // Usuario interno: intentar usar el id del perfil, si no está disponible usar el buscado
                        idRecaudador = profile?.persona?.id_persona;
                        
                        // Si no hay id del perfil, usar el id del recaudador buscado
                        if (!idRecaudador && formData.id_persona_recaudador && formData.id_persona_recaudador > 0) {
                            console.log('🔍 [CREAR] Usuario interno - usando id_persona_recaudador buscado:', formData.id_persona_recaudador);
                            idRecaudador = formData.id_persona_recaudador;
                        }
                        
                        if (!idRecaudador || idRecaudador === 0) {
                            console.error('❌ [CREAR] Usuario interno - no se pudo obtener id:', {
                                profile_id: profile?.persona?.id_persona,
                                formData_id: formData.id_persona_recaudador
                            });
                            setIsError(true);
                            setErrorText('No se pudo obtener el ID del recaudador. Por favor, busque un recaudador o recargue la página.');
                            return;
                        }
                        console.log('✅ [CREAR] Usuario interno - id válido:', idRecaudador);
                    } else {
                        // Usuario externo: usar el id del perfil del usuario (su propio ID)
                        idRecaudador = profile?.persona?.id_persona;
                        
                        console.log('🔍 [CREAR] Usuario externo - profile?.persona?.id_persona:', idRecaudador);
                        
                        // Validar que el usuario externo tenga un ID de persona
                        if (!idRecaudador || idRecaudador === 0) {
                            console.error('❌ [CREAR] Usuario externo - no se pudo obtener id_persona del perfil:', {
                                profile_id: profile?.persona?.id_persona,
                                profile: profile
                            });
                            setIsError(true);
                            setErrorText('No se pudo obtener el ID del recaudador. Por favor, recargue la página.');
                            return;
                        }
                        console.log('✅ [CREAR] Usuario externo - id válido:', idRecaudador);
                    }

                    try {
                        // Pequeño delay para asegurar que el AlertQuestion se cierre antes del loader
                        await new Promise(resolve => setTimeout(resolve, 100));
                        await createRegistro({
                            descripcion: registerFormData.descripcion,
                            id_recaudador: idRecaudador,
                            doc_soporte: registerFormData.archivo_soporte
                        });

                        // Actualizar la lista manteniendo el filtro si es usuario interno
                        const params: any = {};
                        if (isInternalUser === true && formData.id_persona_recaudador && formData.id_persona_recaudador > 0) {
                            params.id_recaudador = formData.id_persona_recaudador;
                        }
                        await fetchRegistroNoCompras(apiCurrentPage, params);

                        // Mostrar mensaje de éxito
                        setIsSuccess(true);
                        setSuccessText('El registro de no compra se ha creado correctamente');
                        
                        // Cerrar el modal y limpiar el formulario
                        setIsRegisterModalOpen(false);
                        setIsViewMode(false);
                        setIsEditMode(false);
                        setEditingRecordId(null);
                        setRegisterFormData({
                            fecha_registro: '',
                            descripcion: '',
                            archivo_soporte: null
                        });
                        if (registerFileInputRef.current) {
                            registerFileInputRef.current.value = '';
                        }
                    } catch (err) {
                        const errorMessage = err instanceof Error ? err.message : 'Error al crear el registro de no compra';
                        setIsError(true);
                        setErrorText(errorMessage);
                    }
                }}
            />
        </div>
    );
};

export default RegisterOnePurchase;
