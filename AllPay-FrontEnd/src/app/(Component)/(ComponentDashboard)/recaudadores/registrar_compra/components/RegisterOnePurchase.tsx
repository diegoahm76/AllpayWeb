'use client';

// utils
import { formatNumber, formatCurrency } from '@/utils/formatters';
import { formatearFechaDMY, getFechaActualColombia } from '@/utils/dateUtils';
import { formatNumberWithCommas } from '@/utils/formatters';

// next
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import AlertForm from '@/presenters/components/recaudadores/AlertForm';
import AlertNotification from '@/presenters/components/recaudadores/AlertNotification';

// proveedor
import CreateProviderModal from '@/presenters/components/recaudadores/CreateProviderModal';
import { useGetProvider } from '@/application/user/useGetProvider';

// address
import useGetDepartments from '@/application/address/useGetDepartmentsCacao';
import { useMunicipiosCacaoteros } from '../hooks/useMunicipiosCacaoteros';

// dni
import { useTypeDni } from '@/application/dni/useTypeDni';

// facturas
import { useCreateInvoice } from '../hooks/useCreateInvoiceExternal';
import { useCreateInternalInvoice } from '../hooks/useCreateInvoiceInternal';
import RegisterPurchase from './RegisterPurchase';
import MassivePurchaseForm from './MassivePurchaseForm';
import { CreateMassiveInvoiceResponse, FacturaMasiva } from '../models/invoice.createMasive.model';
import { useGetTaxCollectors } from '@/application/user/useGetTaxCollectors';

// reutilizables
import { PorcentajeCobro } from '../models/collector.porcentage.model';
import { useTiposCacao } from '../hooks/useTypesCacaoActive';
import { usePorcentajesCobro } from '../hooks/usePorcentajesCobro';

// notificaciones
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
import AlertQuestion from '@/presenters/components/recaudadores/AlertQuestion';
import useFacturasPorCargue from '../hooks/useFacturasPorCargue';


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

interface TipoCacao {
    id_tipo_cacao: number;
    nombre: string;
    activo: boolean;
    item_ya_usado: boolean;
    fecha_creacion: string;
    id_persona_crea: number;
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
    const isRegisterRoute = pathname?.includes('/recaudadores/registrar_compra');
    const { types, fetchTypes } = useTypeDni();
    const { data: session } = useSession();
    const valueSesion: any = session;
    const { fetchProvider, isLoading: isLoadingProvider } = useGetProvider();
    const { fetchTaxCollectors, isLoading: isLoadingTaxCollectors } = useGetTaxCollectors();
    const [purchases, setPurchases] = useState<PurchaseData[]>([]);
    const [localValorTotal, setLocalValorTotal] = useState('0.00');
    const { tiposCacao, loading: loadingTipos, error: errorTipos } = useTiposCacao(valueSesion?.user?.tokens?.access || '');
    const { createNewInvoice } = useCreateInvoice();
    const { createNewInternalInvoice } = useCreateInternalInvoice();
    const [hasFetchedTypes, setHasFetchedTypes] = useState(false);
    const [isMassiveModalOpen, setIsMassiveModalOpen] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
    const [isInternalUser, setIsInternalUser] = useState<boolean | null>(null);
    const [editingPurchase, setEditingPurchase] = useState<PurchaseData | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const formattedValorTotal = formatCurrency(parseFloat(localValorTotal));
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [porcentajeCuotaFomento, setPorcentajeCuotaFomento] = useState<PorcentajeCobro | null>(null);
    const { porcentajes } = usePorcentajesCobro();
    const [showMassivePurchaseResultModal, setShowMassivePurchaseResultModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [currentMassivePage, setCurrentMassivePage] = useState(1);
    const itemsPerPage = 10;
    const [massivePurchaseResponse, setMassivePurchaseResponse] = useState<CreateMassiveInvoiceResponse | null>(null);
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [uuidCargue, setUuidCargue] = useState<string | null>(null);
    const {
        facturas: facturasPorCargue,
        isLoading: isLoadingFacturasPorCargue,
        error: errorFacturasPorCargue,
        currentPage: hookCurrentPage,
        totalPages: hookTotalPages,
        fetchFacturas: fetchFacturasPorCargue,
        fetchAllFacturas: fetchAllFacturasPorCargue
    } = useFacturasPorCargue();

    const { departments, fetchDepartments } = useGetDepartments();
    const { municipios: cities, loading: loadingCities } = useMunicipiosCacaoteros({
        departamentoId: selectedDepartment?.toString() || '',
        token: valueSesion?.user?.tokens?.access || ''
    });

    // notificaciones
    const [isSuccess, setIsSuccess] = useState(false);
    const [successText, setSuccessText] = useState<string | React.ReactNode>('');
    const [redirectOnSuccess, setRedirectOnSuccess] = useState(false);
    const [isError, setIsError] = useState(false);
    const [errorText, setErrorText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingText, setIsLoadingText] = useState('');
    const [isAlertQuestion, setIsAlertQuestion] = useState(false);
    const [alertQuestionText, setAlertQuestionText] = useState('');

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
                
                const recaudadorInfo = {
                    nitComprador: recaudadorData.numero_documento,
                    comprador: compradorNombre,
                    telefono: recaudadorData.telefono || telefonoEmpresa,
                    ciudad: recaudadorData.municipio,
                    direccion: (recaudadorData as any).direccion_residencia || recaudadorData.direccion_notificaciones || '',
                    email: recaudadorData.email,
                    id_persona_recaudador: 0,
                    tipo_documento_recaudador: formData.tipo_documento_recaudador || '',
                    numero_documento_recaudador: formData.numero_documento_recaudador || ''
                };

                setFormData(prev => ({
                    ...prev,
                    ...recaudadorInfo,
                    fechaRegistro: recaudadorData.fecha_registro,
                    facturaUnica: recaudadorData.nro_factura_unica
                }));
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
        if (porcentajes && porcentajes.length > 0) {
            const porcentajeCF = porcentajes.find(p => p.cod_tipo_cobro === 'CF');
            if (porcentajeCF) {
                setPorcentajeCuotaFomento(porcentajeCF);
            } else {
                console.log("No se encontró el porcentaje CF");
            }
        }
    }, [porcentajes]);

    useEffect(() => {
        setMounted(true);
    }, []);


    const purchasesForTable = useMemo(() => {
        return purchases.map(p => ({
            ...p,
            cantidadKilos_display: formatNumber(+p.cantidadKilos, 4),
            precioKilo_display: formatCurrency(+p.precioKilo),
            valorBruto_display: formatCurrency(+p.valorBruto),
            cuotaFomento_display: formatCurrency(+p.cuotaFomento),
            valorNeto_display: formatCurrency(+p.valorNeto)
        }));
    }, [purchases]);

    const fetchAllData = async (page: number) => {
        if (page === 0) {
            // Para descarga completa
            return {
                data: purchasesForTable,
                total_pages: 1
            };
        }
        
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = purchasesForTable.slice(startIndex, endIndex);
        
        return {
            data: pageData,
            total_pages: Math.ceil(purchasesForTable.length / itemsPerPage)
        };
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

    const handleRemoveFile = () => {
        setFormData(prev => ({ ...prev, doc_soporte: null }));
        const fileInput = document.getElementById('doc_soporte') as HTMLInputElement | null;
        if (fileInput) fileInput.value = '';
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

                setFormData(prev => ({
                    ...prev,
                    nitComprador: recaudador.numero_documento || '',
                    comprador: compradorNombre,
                    telefono: recaudador.celular_persona || (recaudador as any).celular_empresa || '',
                    ciudad: recaudador.nombre_municipio_expedicion || '',
                    direccion: recaudador.direccion_residencia || recaudador.direccion_notificaciones ||  '',
                    email: recaudador.email || '',
                    id_persona_recaudador: recaudador.id_persona || 0,
                    tipo_documento_recaudador: formData.tipo_documento_recaudador || '',
                    numero_documento_recaudador: formData.numero_documento_recaudador || '',
                    tipoComprador: tiposSeleccionados,
                    nombre_comercial: (recaudador as any).nombre_comercial || (recaudador as any).nombre_completo_o_comercial || ''
                }));

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

    const handleSearchProvider = async () => {
        if (!formData.tipo_documento_proveedor || !formData.numero_documento_proveedor) {
            setIsError(true);
            setErrorText('Por favor, ingrese el tipo y número de documento para buscar el proveedor');
            return;
        }

        try {
            const token = valueSesion?.user?.tokens?.access || '';
            const response = await fetchProvider(
                {
                    tipo_documento: formData.tipo_documento_proveedor,
                    numero_documento: formData.numero_documento_proveedor
                },
                token
            );

            if (response && response.data && response.data.length > 0) {
                const provider = response.data[0];
                setFormData(prev => ({
                    ...prev,
                    nitProveedor: provider.numero_documento,
                    nombreProveedor: provider.tipo_persona === 'N'
                        ? `${provider.nombres} ${provider.apellidos}`
                        : provider.razon_social || '',
                    departamento: provider.nombre_departamento_expedicion || '',
                    municipio: provider.nombre_municipio_expedicion || '',
                    id_persona_proveedor: provider.id_persona
                }));

                setIsSuccess(true);
                setSuccessText(
                    <>Se ha encontrado exitosamente el <b>Proveedor</b> de Cacao</>
                );
                return;
            }

            setIsError(true);
            setErrorText('No se encontró ningún proveedor con los datos proporcionados');
        } catch (error: any) {
        
            const rawMessage = typeof error === 'string' ? error : error?.message || '';
            const friendlyMessage = rawMessage.includes('No se encontraron proveedores con los filtros especificados')
                ? 'No se encontraron proveedores con los filtros especificados'
                : 'Ocurrió un error al obtener el proveedor';
        
            setIsError(true);
            setErrorText(friendlyMessage);
        }
    };

    const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setFormData(prev => ({
            ...prev,
            departamento_compra: value
        }));
        setSelectedDepartment(value ? parseInt(value) : null);
    };

    const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name === 'municipio' ? 'municipio_compra' : name]: value
        }));
    };


    const getDepartmentOptions = () => {
        return departments
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
            .map((dept: { cod_departamento: string; nombre: string }) => ({
                key: dept.cod_departamento,
                value: dept.cod_departamento,
                title: dept.nombre
            }));
    };

    const expandedRowRender = (record: FacturaMasiva) => {
        if (!record.detalles || record.detalles.length === 0) return null;

        // Calcular totales
        const totalKilos = record.detalles.reduce((acc, d) => acc + (parseFloat(Number(d.nro_kilos).toFixed(2)) || 0), 0);
        const totalValorBruto = record.detalles.reduce((acc, d) => acc + (parseFloat(Number(d.valor_bruto).toFixed(2)) || 0), 0);
        const totalCuotaFomento = record.detalles.reduce((acc, d) => acc + (parseFloat(Number(d.cuota_fomento).toFixed(2)) || 0), 0);
        const totalValorNeto = record.detalles.reduce((acc, d) => acc + (parseFloat(Number(d.valor_neto).toFixed(2)) || 0), 0);

        // Calcular promedio del precio por kilo
        const sumaPrecioKilo = record.detalles.reduce((acc, d) => acc + (parseFloat(Number(d.valor_kilo).toFixed(2)) || 0), 0);
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
                                {record.detalles.map((detalle, idx) => (
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

    const getCurrentPageData = (data: any[], page: number) => {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return data.slice(startIndex, endIndex);
    };

    const renderMassivePurchaseResultModal = () => {
        if (!showMassivePurchaseResultModal || !massivePurchaseResponse) return null;

        const { detail, facturas_creadas, success } = massivePurchaseResponse;
        if (!success) return null;

        const enrichedFacturas = facturas_creadas?.map(factura => {
            const totalPrecioKilo = factura.detalles?.reduce((acc, det) => acc + parseFloat(det.valor_kilo), 0) || 0;
            const date = new Date(factura.fecha_compra);
            return {
                ...factura,
                id_persona_recaudador: factura.detalles?.[0]?.recaudador_info?.numero_documento || '',
                mes_compra: date.getMonth() + 1,
                anio_compra: date.getFullYear(),
                valor_kilo: totalPrecioKilo
            };
        }) || [];

        const totalPages = Math.ceil(enrichedFacturas.length / itemsPerPage);

        const fetchAllDataForExcel = async () => {
            if (!uuidCargue || !valueSesion?.user?.tokens?.access) {
                throw new Error('No hay datos disponibles para exportar');
            }

            try {
                // Obtener todas las facturas sin paginación
                const allFacturas = await fetchAllFacturasPorCargue(valueSesion.user.tokens.access, uuidCargue);
                
                const formatDate = (dateString: string) => {
                    const date = new Date(dateString);
                    return {
                        formattedDate: date.toISOString().split('T')[0],
                        month: date.getMonth() + 1,
                        year: date.getFullYear()
                    };
                };

                const flattenedData = allFacturas?.flatMap(factura => {
                const { formattedDate, month, year } = formatDate(factura.fecha_compra);
                if (!factura.detalles || factura.detalles.length === 0) {
                    return [{
                        ...factura,
                        nombre_tipo_cacao: '-',
                        nro_kilos: '0',
                        valor_kilo: '0',
                        precio_kilo: '0',
                        valor_bruto: '0',
                        cuota_fomento: '0',
                        valor_neto: '0',
                        id_persona_recaudador: factura.id_persona_recaudador,
                        id_persona_proveedor: factura.id_persona_proveedor,
                        nro_factura_unica: factura.nro_factura_unica,
                        total_kilos: factura.total_kilos,
                        fecha_compra: formattedDate,
                        mes_compra: month,
                        anio_compra: year
                    }];
                }

                return factura.detalles.map(detalle => {
                    const valorKilo = formatCurrency(detalle.valor_kilo);
                    return {
                        nro_factura_unica: factura.nro_factura_unica,
                        nombre_persona_recaudador: factura.nombre_persona_recaudador,
                        nombre_persona_proveedor: factura.nombre_persona_proveedor,
                        nro_documento_proveedor: factura.nro_documento_proveedor,
                        tipo_documento_proveedor: factura.tipo_documento_proveedor,
                        fecha_compra: formattedDate,
                        mes_compra: month,
                        anio_compra: year,
                        nro_documento_soporte: factura.nro_documento_soporte,
                        nombre_municipio_cacao: factura.nombre_municipio_cacao,
                        nombre_departamento_cacao: factura.nombre_departamento_cacao,
                        id_persona_recaudador: detalle.recaudador_info?.numero_documento || factura.id_persona_recaudador,
                        id_persona_proveedor: detalle.proveedor_info?.numero_documento || factura.id_persona_proveedor,
                        total_kilos: factura.total_kilos,
                        nombre_tipo_cacao: detalle.nombre_tipo_cacao,
                        nro_kilos: formatNumber(detalle.nro_kilos, 2),
                        valor_kilo: valorKilo,
                        precio_kilo: valorKilo,
                        valor_bruto: formatCurrency(detalle.valor_bruto),
                        cuota_fomento: formatCurrency(detalle.cuota_fomento),
                        valor_neto: formatCurrency(detalle.valor_neto)
                    };
                });
            }) || [];

                return {
                    data: flattenedData,
                    total_pages: 1
                };
            } catch (error) {
                console.error('Error al obtener datos para Excel:', error);
                throw new Error('No hay datos disponibles para exportar');
            }
        };

        const columns = [
            {
                key: 'nro_documento_recaudador',
                label: 'NIT RECAUDADOR',
                render: (value: any) => value
            },
            {
                key: 'nombre_persona_recaudador',
                label: 'NOMBRE RECAUDADOR'
            },
            {
                key: 'fecha_compra',
                label: 'FECHA DE COMPRA',
                render: (value: any) => formatearFechaDMY(new Date(value)) 
            },
            {
                key: 'nro_factura_unica',
                label: 'No. FACTURA UNICA',
                render: (value: any) => formatNumber(value)
            },
            {
                key: 'nro_documento_soporte',
                label: 'DOCUMENTO SOPORTE'
            },
            {
                key: 'nro_documento_proveedor',
                label: 'NIT PROVEEDOR',
                render: (value: any) => value
            },
            {
                key: 'nombre_persona_proveedor',
                label: 'NOMBRE PROVEEDOR'
            },
            {
                key: 'nombre_municipio_cacao',
                label: 'MUNICIPIO'
            },
            {
                key: 'nombre_departamento_cacao',
                label: 'DEPARTAMENTO'
            },
            {
                key: 'total_kilos',
                label: 'TOTAL KILOS',
                render: (value: number) => formatNumberWithCommas(value.toString())
            },
            {
                key: 'valor_bruto',
                label: 'VALOR BRUTO',
                render: (value: any) => formatCurrency(value)
            },
            {
                key: 'cuota_fomento',
                label: 'CUOTA FOMENTO',
                render: (value: any) => formatCurrency(value)
            },
            {
                key: 'valor_neto',
                label: 'VALOR NETO',
                render: (value: any) => formatCurrency(value)
            }
        ];

        return (
            <ModalContainer
                isOpen={showMassivePurchaseResultModal}
                onClose={() => {
                    setShowMassivePurchaseResultModal(false);
                    setCurrentMassivePage(1);
                    router.push('/recaudadores/consultar_factura');
                }}
                size="6xl"
            >
                <div className="p-4">
                    <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'} mb-6 text-center`}>
                        Facturas cargadas
                    </h2>
                    <div className="space-y-4">
                        <p className={`text-center ${isDarkMode ? 'text-white/80' : 'text-gray-600'}`}>{detail}</p>
                        {uuidCargue ? (
                            <div className="mt-4">
                                {isLoadingFacturasPorCargue && (
                                    <p className="text-center text-sm text-gray-600">Cargando facturas...</p>
                                )}
                                {errorFacturasPorCargue && (
                                    <p className="text-center text-sm text-red-600">{errorFacturasPorCargue}</p>
                                )}
                                {!isLoadingFacturasPorCargue && !errorFacturasPorCargue && (
                                    <DynamicTable
                                        columns={columns}
                                        data={facturasPorCargue}
                                        currentPage={hookCurrentPage}
                                        totalPages={hookTotalPages}
                                        onPageChange={(page) => {
                                            const accessToken = valueSesion?.user?.tokens?.access;
                                            if (uuidCargue && accessToken) {
                                                fetchFacturasPorCargue(accessToken, uuidCargue, page);
                                            }
                                        }}
                                        expandable={{
                                            expandedRowRender,
                                            rowExpandable: (record) =>
                                                record.detalles && record.detalles.length > 0
                                        }}
                                        fetchAllData={fetchAllDataForExcel}
                                        downloadButtonPosition="top"
                                    />
                                )}
                            </div>
                        ) : (
                            facturas_creadas && facturas_creadas.length > 0 && (
                                <div className="mt-4">
                                    <DynamicTable
                                        columns={columns}
                                        data={getCurrentPageData(enrichedFacturas, currentMassivePage)}
                                        currentPage={currentMassivePage}
                                        totalPages={totalPages}
                                        onPageChange={setCurrentMassivePage}
                                        expandable={{
                                            expandedRowRender,
                                            rowExpandable: (record) =>
                                                record.detalles && record.detalles.length > 0
                                        }}
                                        fetchAllData={fetchAllDataForExcel}
                                        downloadButtonPosition="top"
                                    />
                                </div>
                            )
                        )}
                        <div className="mt-6 flex justify-center">
                            <Button
                                title="Cerrar"
                                onClick={() => {
                                    setShowMassivePurchaseResultModal(false);
                                    setCurrentMassivePage(1);
                                    router.push('/recaudadores/consultar_factura');
                                }}
                            />
                        </div>
                    </div>
                </div>
            </ModalContainer>
        );
    };

    const getCityOptions = () => {
        if (loadingCities) {
            return [{ key: '', value: '', title: 'Cargando...' }];
        }
        return cities
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
            .map(city => ({
                key: city.cod_municipio,
                value: city.cod_municipio,
                title: city.nombre
            }));
    };


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                doc_soporte: file
            }));
        }
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

    const handleDeletePurchase = (purchaseId: string) => {

        setAlertQuestionText('¿Está seguro que desea eliminar esta compra?');
        setIsAlertQuestion(true);
        setPurchaseToDelete(purchaseId);
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
        { key: 'tipoCacao', label: 'TIPO DE CACAO' },
        {
            key: 'cantidadKilos',
            label: 'CANTIDAD KILOS',
            render: (v: string) => formatNumberWithCommas(v)
        },
        {
            key: 'precioKilo',
            label: 'PRECIO DE KILO',
            render: (v: string) => formatCurrency(parseFloat(v))
        },
        {
            key: 'valorBruto',
            label: 'VALOR BRUTO',
            render: (v: string) => formatCurrency(parseFloat(v))
        },
        {
            key: 'cuotaFomento',
            label: 'CUOTA FOMENTO',
            render: (v: string) => formatCurrency(parseFloat(v))
        },
        {
            key: 'valorNeto',
            label: 'VALOR NETO',
            render: (v: string) => formatCurrency(parseFloat(v))
        },
        {
            key: 'actions',
            label: 'ACCIONES',
            render: (_: any, row: PurchaseData) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleEditClick(row)}
                        className="p-1 hover:bg-gray-100 rounded-full"
                    >
                        <img src="/images/icons/update.png" className="w-5 h-5" alt="Editar" />
                    </button>
                    <button
                        onClick={() => handleDeletePurchase(row.id)}
                        className="p-1 hover:bg-gray-100 rounded-full"
                    >
                        <img src="/images/icons/delete.png" className="w-5 h-5" alt="Eliminar" />
                    </button>
                </div>
            )
        }
    ];

    const handleEditClick = (purchase: PurchaseData) => {
        setEditingPurchase({ ...purchase });
        setIsEditModalOpen(true);
    };

    const handleEditChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        if (!editingPurchase) return;
        const { name, value } = e.target;

        if (name === 'tipoCacao') {
            const selectedOption = tiposCacao.find((tipo: TipoCacao) => tipo.id_tipo_cacao.toString() === value);
            if (selectedOption) {
                setEditingPurchase((prev) => ({
                    ...prev!,
                    tipoCacao: selectedOption.nombre
                }));
            }
            return;
        }

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
            const cuotaFomento = calcularCuotaFomento(parseFloat(valorBruto));
            const valorNeto = (parseFloat(valorBruto) - parseFloat(cuotaFomento)).toFixed(4);

            setEditingPurchase((prev) => ({
                ...prev!,
                valorBruto,
                cuotaFomento,
                valorNeto
            }));
        }
    };

    const handleDownloadTemplate = () => {
        const link = document.createElement('a');
        if (isInternalUser) {
            link.href = '/documents/plantilla/registro_masivo_interno.xlsx';
            link.download = 'registro_masivo_interno.xlsx';
        } else {
            link.href = '/documents/plantilla/registro_masivo_externo.xlsx';
            link.download = 'registro_masivo_externo.xlsx';
        }
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

    const handleSave = async () => {

        if (!valueSesion?.user?.tokens?.access) {
            return;
        }

        const validations = [];

        if (!formData.id_persona_proveedor) {
            validations.push('Debe seleccionar un proveedor');
        }
        if (!formData.departamento_compra) {
            validations.push('Debe seleccionar un departamento');
        }
        if (!formData.municipio_compra) {
            validations.push('Debe seleccionar un municipio');
        }
        if (!purchases || purchases.length === 0) {
            validations.push('Debe agregar al menos un detalle de compra');
        }
        if (!formData.fechaCompra) {
            validations.push('Debe seleccionar una fecha de compra');
        }

        if (validations.length > 0) {
            setIsError(true);
            setErrorText(validations.join('\n'));
            return;
        }

        setIsLoading(true);
        setIsLoadingText('Guardando factura...');

        try {
            const formDataToSend = new FormData();
            
            if (formData.doc_soporte) {
                formDataToSend.append('doc_soporte', formData.doc_soporte);
            }

            formDataToSend.append(
                'id_persona_proveedor',
                formData.id_persona_proveedor.toString()
            );
            formDataToSend.append('id_departamento_cacao', formData.departamento_compra);
            formDataToSend.append('id_municipio_cacao', formData.municipio_compra);
            formDataToSend.append('id_porcentaje_cobro', '2');
            formDataToSend.append('fecha_compra', formData.fechaCompra);
            formDataToSend.append('fecha_doc_soporte', formData.fechaCompra);
            formDataToSend.append('nro_documento_soporte', formData.nro_documento_soporte);
            formDataToSend.append('nombre_finca', formData.nombre_finca);
            formDataToSend.append('nombre_vereda', formData.nombre_vereda);

            const detalles_factura = purchases.map((purchase) => {
                const tipoCacaoSeleccionado = tiposCacao.find((tipo: TipoCacao) => tipo.nombre === purchase.tipoCacao);
                if (!tipoCacaoSeleccionado) {
                    throw new Error(`No se encontró el tipo de cacao: ${purchase.tipoCacao}`);
                }
                return {
                    id_tipo_cacao: tipoCacaoSeleccionado.id_tipo_cacao,
                    nro_kilos: parseFloat(purchase.cantidadKilos),
                    valor_kilo: parseFloat(purchase.precioKilo),
                    valor_bruto: parseFloat(purchase.valorBruto),
                    cuota_fomento: parseFloat(purchase.cuotaFomento),
                    valor_neto: parseFloat(purchase.valorNeto)
                };
            });
            formDataToSend.append('detalles_factura', JSON.stringify(detalles_factura));

            let responseCreateInvoice;

            if (isInternalUser) {
                const idRecaudador = formData.id_persona_recaudador;
                if (!idRecaudador) {
                    setIsLoading(false);
                    setIsError(true);
                    setErrorText('No se ha seleccionado un recaudador');
                    return;
                }

                responseCreateInvoice = await createNewInternalInvoice(formDataToSend, valueSesion.user.tokens.access, idRecaudador);
                if (!responseCreateInvoice) {
                    setIsLoading(false);
                    throw new Error('No se recibió respuesta de la creación de factura interna');
                }
            } else {
                responseCreateInvoice = await createNewInvoice(formDataToSend, valueSesion.user.tokens.access);
                if (!responseCreateInvoice) {
                    setIsLoading(false);
                    throw new Error('No se recibió respuesta de la creación de factura externa');
                }
            }

            setPurchases([]);
            setLocalValorTotal('0.00');

            const nroFactura = responseCreateInvoice.data?.nro_factura_unica;

            if (!nroFactura) {
                setIsLoading(false);
                throw new Error('No se recibió el número de factura en la respuesta');
            }

            setIsLoading(false);
            setIsSuccess(true);

            setSuccessText(
                <>Ha generado la <b>Factura Única Nacional</b> exitosamente con el número {nroFactura}</>
            );
            setRedirectOnSuccess(true);

        } catch (error: any) {
            setIsLoading(false);
            setIsError(true);
            setErrorText(error.data?.detail || 'Ocurrió un error al guardar la factura');
        }
    };

    const handleMassivePurchaseSave = async (data: CreateMassiveInvoiceResponse) => {
        setMassivePurchaseResponse(data);

        if (!data.success) {
            let errorMsg = 'El archivo cargado presenta una estructura de columnas inválidas. Verifique los datos y el orden de los campos.';
            if (data.errores && data.errores.length > 0) {
                const erroresList = data.errores
                    .map(e => `• ${e.error}`)
                    .join('<br/>');
                errorMsg += '<br/><br/>' + erroresList;
            }
            setErrorMessage(errorMsg);
            setShowErrorAlert(true);
            return;
        }

        // Si ahora la API retorna uuid_cargue, consultamos primera página del hook
        const accessToken = valueSesion?.user?.tokens?.access;
        const uuid = (data as any)?.uuid_cargue as string | undefined;
        if (uuid && accessToken) {
            try {
                setUuidCargue(uuid);
                await fetchFacturasPorCargue(accessToken, uuid, 1);
            } catch (e) {
                // el hook maneja error
            }
        }

        setShowMassivePurchaseResultModal(true);
    };

    const handleErrorAlertClose = () => {
        setShowErrorAlert(false);
        setErrorMessage('');
    };

    const handleMassivePurchaseClear = () => {
        console.log('Limpiar formulario masivo');
    };

    const calcularCuotaFomento = (valorBruto: number) => {
        if (!porcentajeCuotaFomento) {
            return '0.00';
        }

        const valor = parseFloat(porcentajeCuotaFomento.valor);
        const resultado = (valorBruto * valor);
        return resultado.toFixed(4);
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
                isOpen={isLoading}
                loadingText={isLoadingText}
            />

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
                        >REGISTRO COMPRAS DE CACAO
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

                            <div className="font-bold text-center xl:text-left text-sm xl:text-base">
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
                                    </div>
                                </>
                            )}

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                                <AnimatedInput
                                    label="FECHA DE COMPRA"
                                    name="fechaCompra"
                                    labelSize="sm"
                                    value={formData.fechaCompra}
                                    onChange={handleInputChange}
                                    type="date"
                                    maxDate={getFechaActualColombia()}
                                    darkMode={isDarkMode}
                                />
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
                                <div className="flex flex-col items-center min-w-[200px] mt-4 xl:mt-0">
                                    <div className="text-center mb-4">
                                        <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>FACTURA ÚNICA</p>
                                        <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>NACIONAL</p>
                                    </div>
                                    <div className={`border-2 ${isDarkMode ? 'border-white/20' : 'border-[#562707]'} rounded px-4 py-2`}>
                                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>{formData.facturaUnica}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'} p-4 xl:p-6 rounded-3xl mb-4 xl:mb-6`}>
                    <h4 className={`${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'} text-md font-bold mb-4`}>Información de proveedor</h4>

                    <div className='flex flex-col md:flex-row justify-center mb-4 gap-4'>
                        <AnimatedSelect
                            label="TIPO DE DOCUMENTO"
                            labelSize="sm"
                            name="tipo_documento_proveedor"
                    
                            value={formData.tipo_documento_proveedor}
                            onChange={handleSelectChange}
                            options={getFilteredDocumentTypes()}
                            darkMode={isDarkMode}
                        />

                        <AnimatedInput
                            label="NÚMERO DE DOCUMENTO"
                            labelSize="sm"
                            name="numero_documento_proveedor"
                        
                            value={formData.numero_documento_proveedor}
                            onChange={handleInputChange}
                            type="number"
                            darkMode={isDarkMode}
                        />
                    </div>

                    <div className='flex flex-col md:flex-row justify-end mb-6 mt-4 gap-4'>
                        <Button
                            title={isLoadingProvider ? "Buscando..." : "Buscar proveedor"}
                            onClick={handleSearchProvider}
                            disabled={isLoadingProvider}
                        />

                        <Button
                            title="Crear proveedor"
                            onClick={() => setIsCreateProviderModalOpen(true)}
                        />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-6 mb-4 xl:mb-4">
                        <div className={isRegisterRoute ? "xl:col-span-2" : ""}>
                            <AnimatedInput
                                label="NOMBRE"
                                disabled={true}
                                name="nombreProveedor"
                                value={formData.nombreProveedor}
                                onChange={handleInputChange}
                                labelSize="sm"
                                type="text"
                                darkMode={isDarkMode}
                            />
                        </div>
                    </div>

                </div>

                <div className={`${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'} rounded-3xl my-4 p-6`}>
                    <h4 className={`${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'} text-md font-bold mb-4`}>Lugar de procedencia del cacao</h4>

                    <div className='flex flex-col gap-4'>
                        <div className='flex flex-col md:flex-row gap-4 xl:gap-6'>
                            <AnimatedSelect
                                label="DEPARTAMENTO"
                                labelSize="sm"
                                name="departamento_compra"
                                value={formData.departamento_compra}
                                onChange={handleDepartmentChange}
                                options={getDepartmentOptions()}
                                darkMode={isDarkMode}
                            />

                            <AnimatedSelect
                                label="MUNICIPIO"
                                labelSize="sm"
                                name="municipio_compra"
                                value={formData.municipio_compra}
                                onChange={handleLocationChange}
                                options={getCityOptions()}
                                disabled={!selectedDepartment}
                                darkMode={isDarkMode}
                            />
                        </div>

                        <div className='flex flex-col md:flex-row gap-4 xl:gap-6'>
                            <AnimatedInput
                                label="NOMBRE FINCA"
                                labelSize="sm"
                                name="nombre_finca"
                                value={formData.nombre_finca}
                                onChange={handleInputChange}
                                type="text"
                                darkMode={isDarkMode}
                            />

                            <AnimatedInput
                                label="NOMBRE VEREDA"
                                labelSize="sm"
                                name="nombre_vereda"
                                value={formData.nombre_vereda}
                                onChange={handleInputChange}
                                type="text"
                                darkMode={isDarkMode}
                            />
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <div className="flex-1 w-full">
                                <AnimatedInput
                                    label="NUMERO DOCUMENTO"
                                    labelSize="sm"
                                    name="nro_documento_soporte"
                                    value={formData.nro_documento_soporte}
                                    onChange={handleInputChange}
                                    type="text"
                                    darkMode={isDarkMode}
                                />
                            </div>
                            
                            <div className="flex flex-col items-center gap-2 w-full md:w-auto">
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    accept=".pdf,.doc,.docx"
                                    className="hidden"
                                    id="doc_soporte"
                                />
                                <label
                                    htmlFor="doc_soporte"
                                    className={`cursor-pointer px-4 py-2 rounded-xl font-semibold text-center flex items-center gap-2 w-full ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20 hover:bg-[#3a1a00]' : 'bg-[rgb(var(--gray-20))] hover:bg-[rgb(var(--gray-40))]/90 text-[rgb(var(--brown))]'}`}
                                >
                                    <img src="/images/icons/upload.png" alt="upload" className="w-5 h-5" />
                                    Seleccionar archivo
                                </label>

                                {formData.doc_soporte && (
                                    <div className="flex items-center gap-2">
                                        <span className={`${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'} text-sm`}>
                                            {formData.doc_soporte.name}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleRemoveFile}
                                            className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-[rgb(var(--gray-40))]/90'}`}
                                        >
                                            <img src="/images/icons/delete.png" alt="delete" className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                  
                </div>

                <div className={`${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'} p-4 xl:p-6 rounded-3xl`}>
                    <>
                        <div className="flex justify-end gap-4 mb-6 flex-col md:flex-row">
                            <button
                                className={`px-4 py-1.5 rounded-xl text-sm font-semibold text-center flex items-center gap-1 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20 hover:bg-[#3a1a00]' : 'bg-[rgb(var(--gray-20))] hover:bg-[rgb(var(--gray-40))]/90 text-[rgb(var(--brown))]'}`}
                                onClick={handleDownloadTemplate}
                            >
                                <span className="mr-1">
                                    <img src="/images/icons/more.png" alt="icon-masivo" className="w-4 h-4" />
                                </span>
                                DESCARGAR PLANTILLA
                            </button>

                            <button
                                className={`px-4 py-1.5 rounded-xl text-sm font-semibold text-center flex items-center gap-1 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20 hover:bg-[#3a1a00]' : 'bg-[rgb(var(--gray-20))] hover:bg-[rgb(var(--gray-40))]/90 text-[rgb(var(--brown))]'}`}
                                onClick={() => setIsMassiveModalOpen(true)}
                            >
                                <span className="mr-1">
                                    <img src="/images/icons/more.png" alt="icon-masivo" className="w-4 h-4" />
                                </span>
                                REGISTRO MASIVO DE COMPRAS
                            </button>

                            <button
                                onClick={() => setIsModalOpen(true)}
                                className={`px-4 py-1.5 rounded-xl text-sm font-semibold text-center flex items-center gap-1 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20 hover:bg-[#3a1a00]' : 'bg-[rgb(var(--gray-20))] hover:bg-[rgb(var(--gray-40))]/90 text-[rgb(var(--brown))]'}`}
                            >
                                <span className="mr-1">
                                    <img src="/images/icons/more.png" alt="icon-masivo" className="w-4 h-4" />
                                </span>
                                REGISTRO COMPRA(S)
                            </button>
                        </div>

                        <div className="mb-6">
                            <h2 className={` text-xl sm:text-2xl lg:text-3xl mt-[39px] text-center font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'} mb-4`}>
                                DETALLE DE COMPRA
                            </h2>
                            <DynamicTable
                                columns={tableColumns}
                                data={getCurrentPageData(purchasesForTable, currentPage)}
                                currentPage={currentPage}
                                totalPages={Math.ceil(purchasesForTable.length / itemsPerPage)}
                                onPageChange={(page) => setCurrentPage(page)}
                                fetchAllData={fetchAllData}
                            />
                        </div>

                        <div className="flex justify-between items-center flex-col md:flex-row">
                            <div className="w-full sm:w-64">
                                <AnimatedInput
                                    label="VALOR A PAGAR"
                                    name="valorTotal"
                                    value={formattedValorTotal}
                                    onChange={() => { }}
                                    type="text"
                                    disabled
                                    darkMode={isDarkMode}
                                />
                            </div>
                            <div className="flex gap-4 flex-col sm:flex-row mt-4 md:mt-0">
                                <Button title="Regresar" onClick={() => router.push('/recaudadores/consultar_factura')} />
                                <Button title="Guardar" onClick={handleSave} />
                                <Button title="Salir" onClick={() => router.push('/')} />
                            </div>
                        </div>

                        <RegisterPurchase
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            onSavePurchases={handleSavePurchases}
                        />

                        <AlertForm
                            isOpen={isMassiveModalOpen}
                            onClose={() => setIsMassiveModalOpen(false)}
                            onSave={() => {
                                const massiveForm = document.querySelector('#massivePurchaseForm');
                                if (massiveForm) {
                                    const saveButton = massiveForm.querySelector('button[type="submit"]') as HTMLButtonElement;
                                    if (saveButton) {
                                        saveButton.click();
                                    }
                                }
                            }}
                            onClear={() => {
                                const massiveForm = document.querySelector('#massivePurchaseForm');
                                if (massiveForm) {
                                    const clearButton = massiveForm.querySelector('button[type="reset"]') as HTMLButtonElement;
                                    if (clearButton) {
                                        clearButton.click();
                                    }
                                }
                            }}
                            title="REGISTRO MASIVO DE COMPRAS"
                            size="md"
                        >
                            <MassivePurchaseForm
                                onSave={handleMassivePurchaseSave}
                                onClear={handleMassivePurchaseClear}
                            />
                        </AlertForm>

                        {renderMassivePurchaseResultModal()}

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
                                    <AnimatedSelect
                                        label="TIPO DE CACAO"
                                        name="tipoCacao"
                                        value={tiposCacao.find((tipo: TipoCacao) => tipo.nombre === editingPurchase.tipoCacao)?.id_tipo_cacao.toString() || ''}
                                        onChange={handleEditChange}
                                        options={tiposCacao.map((tipo: TipoCacao) => ({
                                            key: tipo.id_tipo_cacao.toString(),
                                            value: tipo.id_tipo_cacao.toString(),
                                            title: tipo.nombre
                                        }))}
                                        darkMode={isDarkMode}
                                    />
                                    {loadingTipos && (
                                        <p className="text-gray-500 text-sm mt-1">Cargando tipos de cacao...</p>
                                    )}
                                    {errorTipos && <p className="text-red-500 text-sm mt-1">{errorTipos.message}</p>}

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
        </div>
    );
};

export default RegisterOnePurchase;
