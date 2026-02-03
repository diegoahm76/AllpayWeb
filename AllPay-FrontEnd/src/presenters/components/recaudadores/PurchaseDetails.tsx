'use client';

import React, { useState, useEffect } from 'react';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import CreateProviderModal from '@/presenters/components/recaudadores/CreateProviderModal';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { useTypeDni } from '@/application/dni/useTypeDni';
import { useGetProvider } from '@/application/user/useGetProvider';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Swal from 'sweetalert2';
import useGetDepartments from '@/application/address/useGetDepartmentsCacao';
import { useGetCities } from '@/application/address/useGetCities';
import { useGetTaxCollectors } from '@/application/user/useGetTaxCollectors';

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
    nombre_finca: string;
    nombre_vereda: string;
}

interface DetalleCompra {
    tipoCacao: string;
    cantidadKilos: number;
    precioKilo: number;
    valorBruto: number;
    cuotaFomento: number;
    valorNeto: number;
}

interface PurchaseDetailsProps {
    ContentComponent: React.ComponentType<any>;
    contentProps?: any;
    invoiceData?: any;
}

const PurchaseDetails: React.FC<PurchaseDetailsProps> = ({ ContentComponent, contentProps, invoiceData }) => {

    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();
    const isDetailView = pathname?.includes('/recaudadores/detalle_compra');
    const isRegisterRoute = pathname?.includes('/recaudadores/registrar_compra');
    const isEditView = pathname?.includes('/recaudadores/editar_factura');
    const { types, fetchTypes } = useTypeDni();
    const { data: session } = useSession();
    const valueSesion: any = session;
    const { fetchProvider, isLoading: isLoadingProvider } = useGetProvider();
    const { fetchTaxCollectors, isLoading: isLoadingTaxCollectors } = useGetTaxCollectors();
    const [hasFetchedTypes, setHasFetchedTypes] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
    const { departments, fetchDepartments } = useGetDepartments();
    const { cities, loading: loadingCities } = useGetCities({
        departamentoId: selectedDepartment || 0,
        token: valueSesion?.user?.tokens?.access || ''
    });

    const saveFormDataToStorage = (data: FormData) => {
        if (isRegisterRoute) {
            try {
                const dataToSave = {
                    ...data,
                    // Preservar siempre estos campos críticos
                    nitComprador: data.nitComprador || formData.nitComprador,
                    comprador: data.comprador || formData.comprador,
                    telefono: data.telefono || formData.telefono,
                    ciudad: data.ciudad || formData.ciudad,
                    direccion: data.direccion || formData.direccion,
                    email: data.email || formData.email,
                    id_persona_recaudador: data.id_persona_recaudador || formData.id_persona_recaudador,
                    // Mantener datos de búsqueda del recaudador
                    tipo_documento_recaudador: data.tipo_documento_recaudador || formData.tipo_documento_recaudador,
                    numero_documento_recaudador: data.numero_documento_recaudador || formData.numero_documento_recaudador
                };

                // Eliminar campos que no se pueden serializar
                const { doc_soporte, ...dataWithoutFile } = dataToSave;

                localStorage.setItem('tempPurchaseFormData', JSON.stringify(dataWithoutFile));
            } catch (error) {
                console.error('Error al guardar datos del formulario:', error);
            }
        }
    };

    const initialFormData: FormData = {
        fechaCompra: invoiceData?.recaudador_info.fecha_compra || '',
        fechaRegistro: invoiceData?.recaudador_info.fecha_registro || '',
        nitComprador: invoiceData?.recaudador_info.numero_documento || '',
        comprador: invoiceData?.recaudador_info.nombre_completo_o_comercial || '',
        telefono: invoiceData?.recaudador_info.telefono || '',
        ciudad: invoiceData?.recaudador_info.municipio || '',
        tipoComprador: invoiceData?.recaudador_info.cod_tipo_comprador ? 
            invoiceData.recaudador_info.cod_tipo_comprador.split('|').map((tipo: string) => {
                switch(tipo.trim()) {
                    case 'P': return 'Procesador';
                    case 'E': return 'Exportador';
                    case 'C': return 'Comerciante';
                    default: return tipo.trim();
                }
            }) : [],
        direccion: invoiceData?.recaudador_info.direccion_notificaciones || '',
        email: invoiceData?.recaudador_info.email || '',
        facturaUnica: invoiceData?.recaudador_info.nro_factura_unica || '',
        nitProveedor: invoiceData?.proveedor_info.numero_documento || '',
        nombreProveedor: invoiceData?.proveedor_info.nombre_completo_o_comercial || '',
        departamento: invoiceData?.proveedor_info.departamento || '',
        municipio: invoiceData?.proveedor_info.municipio || '',
        departamento_compra: invoiceData?.nombre_departamento_cacao || '',
        municipio_compra: invoiceData?.nombre_municipio_cacao || '',
        tipo_documento_recaudador: '',
        numero_documento_recaudador: '',
        tipo_documento_proveedor: '',
        numero_documento_proveedor: '',
        doc_soporte: null,
        id_persona_proveedor: 0,
        id_persona_recaudador: 0,
        nro_documento_soporte: invoiceData?.nro_documento_soporte || '',
        doc_soporte_url: invoiceData?.doc_soporte_url || '',
        nombre_finca: invoiceData?.nombre_finca || '',
        nombre_vereda: invoiceData?.nombre_vereda || '',
    };


    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [hasInitialized, setHasInitialized] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';
    const cardClass = isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white';
    const headingTextClass = isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]';
    const accentTextClass = isDarkMode ? 'text-white' : 'text-[#562707]';

    // Efecto para manejar los datos del recaudador según el tipo de usuario
    useEffect(() => {
        if (isRegisterRoute && !hasInitialized) {
            // Cargar datos guardados o usar los iniciales
            const savedData = localStorage.getItem('tempPurchaseFormData');
            const initialData = savedData ? JSON.parse(savedData) : initialFormData;

            // Para usuarios externos, mantener sus datos aunque haya info guardada
            if (valueSesion?.user?.tipo_usuario === 'E') {
                setFormData(prev => ({
                    ...initialData,
                    nitComprador: prev.nitComprador || initialData.nitComprador,
                    comprador: prev.comprador || initialData.comprador,
                    telefono: prev.telefono || initialData.telefono,
                    ciudad: prev.ciudad || initialData.ciudad,
                    direccion: prev.direccion || initialData.direccion,
                    email: prev.email || initialData.email,
                    
                    id_persona_recaudador: prev.id_persona_recaudador || initialData.id_persona_recaudador,
                    // Mantener datos específicos de la compra
                    fechaCompra: initialData.fechaCompra,
                    fechaRegistro: initialData.fechaRegistro,
                    facturaUnica: initialData.facturaUnica
                }));
            } else {
                // Para usuarios internos, usar datos guardados o iniciales
                setFormData(initialData);
            }

            setHasInitialized(true);
        }
    }, [isRegisterRoute, valueSesion?.user?.tipo_usuario]);

    useEffect(() => {
        if ((isDetailView || isEditView) && invoiceData) {

            // Mapeo de tipos de comprador
            let tiposSeleccionados: string[] = [];
            const tiposString = invoiceData.recaudador_info?.tipo_comprador || invoiceData.recaudador_info?.cod_tipo_comprador;
    
            if (tiposString) {
                tiposSeleccionados = tiposString.split('|').map((tipo: string) => {
                    const tipoLimpio = tipo.trim();
                    switch (tipoLimpio) {
                        case 'T': return 'Procesador';
                        case 'E': return 'Exportador';
                        case 'C': return 'Comerciante';
                        default: return tipoLimpio;
                    }
                });
            }
    
            setFormData(prev => ({
                ...prev,
                fechaCompra: invoiceData.recaudador_info.fecha_compra || '',
                fechaRegistro: invoiceData.recaudador_info.fecha_registro || '',
                tipoComprador: tiposSeleccionados,
                nitComprador: invoiceData.recaudador_info.numero_documento || '',
                comprador: invoiceData.recaudador_info.nombre_completo_o_comercial || '',
                telefono: invoiceData.recaudador_info.telefono || '',
                ciudad: invoiceData.recaudador_info.municipio || '',
                direccion: invoiceData.recaudador_info.direccion_notificaciones || '',
                email: invoiceData.recaudador_info.email || '',
                id_persona_recaudador: invoiceData.recaudador_info.id_recaudador || 0,
                doc_soporte_url: invoiceData.doc_soporte_url || '',
                nitProveedor: invoiceData.proveedor_info?.numero_documento || '',
                nombreProveedor: invoiceData.proveedor_info?.nombre_completo_o_comercial || '',
                departamento_compra: invoiceData.nombre_departamento_cacao || '',
                municipio_compra: invoiceData.nombre_municipio_cacao || '',
                cod_estado_liquidacion: invoiceData.cod_estado_liquidacion_display || '',
                facturaUnica: invoiceData.recaudador_info.nro_factura_unica || '',
                doc_soporte: invoiceData.doc_soporte_url || '',
                nro_documento_soporte: invoiceData.nro_documento_soporte || '',
                nombre_finca: invoiceData.nombre_finca || '',
                nombre_vereda: invoiceData.nombre_vereda || '',
            }));
        }
    }, [isDetailView, isEditView, invoiceData]);

    const [] = useState<DetalleCompra[]>(
        invoiceData ? [
            {
                tipoCacao: 'Cacao',
                cantidadKilos: invoiceData.total_kilos || 0,
                precioKilo: 0,
                valorBruto: 0,
                cuotaFomento: invoiceData.cuota_fomento || 0,
                valorNeto: 0
            }
        ] : []
    );

    useEffect(() => {
        if (valueSesion?.user?.tokens?.access && !hasFetchedTypes) {
            fetchTypes(valueSesion.user.tokens.access);
            setHasFetchedTypes(true);
        }
    }, [valueSesion, hasFetchedTypes, fetchTypes]);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

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

    // Guardar en localStorage cuando cambia el formData
    useEffect(() => {
        if (isRegisterRoute) {
            saveFormDataToStorage(formData);
        }
    }, [formData, isRegisterRoute]);

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
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Por favor, ingrese el tipo y número de documento para buscar el recaudador',
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar'
            });
            return;
        }

        try {
            const token = valueSesion?.user?.tokens?.access || '';
            const response = await fetchTaxCollectors(token, {
                tipo_documento: formData.tipo_documento_recaudador,
                numero_documento: formData.numero_documento_recaudador
            });

            if (response && response.data && response.data.length > 0) {
                const recaudador = response.data[0];
                setFormData(prev => ({
                    ...prev,
                    nitComprador: recaudador.numero_documento || '',
                    comprador: `${recaudador.nombres} ${recaudador.apellidos}` || '',
                    telefono: recaudador.celular_persona || '',
                    ciudad: recaudador.municipio_residencia || '',
                    direccion: recaudador.direccion_notificaciones || '',
                    email: recaudador.email || '',
                    id_persona_recaudador: recaudador.id_persona || 0
                }));

                Swal.fire({
                    icon: 'success',
                    title: 'Recaudador encontrado',
                    text: 'Los datos del recaudador han sido cargados correctamente',
                    confirmButtonColor: 'rgb(var(--green))',
                    confirmButtonText: 'Aceptar'
                });
                return;
            }

            Swal.fire({
                icon: 'info',
                title: 'Recaudador no encontrado',
                text: 'No se encontró ningún recaudador con los datos proporcionados',
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar'
            });
        } catch (error) {
            console.error('Error al buscar recaudador:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Ocurrió un error al buscar el recaudador',
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar'
            });
        }
    };

    const handleSearchProvider = async () => {
        if (!formData.tipo_documento_proveedor || !formData.numero_documento_proveedor) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Por favor, ingrese el tipo y número de documento para buscar el proveedor',
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar'
            });
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

                Swal.fire({
                    icon: 'success',
                    title: 'Proveedor encontrado',
                    text: 'Los datos del proveedor han sido cargados correctamente',
                    confirmButtonColor: 'rgb(var(--green))',
                    confirmButtonText: 'Aceptar'
                });
                return;
            }

            Swal.fire({
                icon: 'info',
                title: 'Proveedor no encontrado',
                text: 'No se encontró ningún proveedor con los datos proporcionados'
            });
        } catch (error: any) {

            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Ocurrió un error al buscar el proveedor',
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar'
            });
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
        return departments.map((dept: { cod_departamento: string; nombre: string }) => ({
            key: dept.cod_departamento,
            value: dept.cod_departamento,
            title: dept.nombre
        }));
    };

    const getCityOptions = () => {
        if (loadingCities) {
            return [{ key: '', value: '', title: 'Cargando...' }];
        }
        return cities.map(city => ({
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

    const handleRemoveFile = () => {
        setFormData(prev => ({ ...prev, doc_soporte: null }));
        const fileInput = document.getElementById('doc_soporte') as HTMLInputElement | null;
        if (fileInput) fileInput.value = '';
    };

    const handleTipoCompradorChange = (value: string) => {

        setFormData(prev => {
            const currentTypes = prev.tipoComprador || [];

            const newTypes = currentTypes.includes(value)
                ? currentTypes.filter(t => t !== value)
                : [...currentTypes, value];

            return {
                ...prev,
                tipoComprador: newTypes
            };
        });
    };

    const handleVerDocumento = () => {

        if (formData.doc_soporte_url) {
            window.open(formData.doc_soporte_url as string, '_blank');
        } else {
            Swal.fire({
                icon: 'info',
                title: 'Sin documento',
                text: 'No hay ningún documento disponible para visualizar',
                confirmButtonColor: 'rgb(var(--green))',
                confirmButtonText: 'Aceptar'
            });
        }
    };

    if (!mounted) {
        return null;
    }

    return (
        <div className={`p-4 xl:p-6 space-y-4 xl:space-y-6 ${isDarkMode ? 'text-white' : ''}`}>
            <div className={`m-auto w-full rounded-3xl p-4 xl:p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                <div className={`${cardClass} rounded-3xl shadow-md p-4 xl:p-6 mb-4 xl:mb-6`}>
                    {/* Encabezado con logo */}
                    <div className='flex flex-col xl:flex-row gap-4 xl:gap-6'>
                        <div className={`flex flex-col items-center justify-center space-y-4 xl:space-y-6 ${headingTextClass}`}>
                            <Image
                                src={isDarkMode ? '/images/corporate/logo-white.png' : '/images/corporate/logo.png'}
                                alt="Federación Nacional de Cacaoteros"
                                width={200}
                                height={200}
                                className="w-40 xl:w-48 2xl:w-64"
                            />

                            <div className={`font-bold text-center text-sm xl:text-base ${headingTextClass}`}>
                                <p>FACTURA UNICA NACIONAL</p>
                                <p>LEY 67 DE 1983</p>
                                <p>DECRETO 1000 DE 1984</p>
                                <p>DECRETO 502 DE 1998</p>
                            </div>
                        </div>

                        <div className='w-full mb-6'>
                            {/* Primera sección de datos */}

                            <h4 className={`${headingTextClass} text-md font-bold mb-6`}>Información de recaudador</h4>

                            {!isDetailView && valueSesion?.user?.tipo_usuario === 'I' && !isEditView && (
                                <>
                                    <div className='flex justify-center mb-4 gap-4'>
                                        <AnimatedSelect
                                            label="TIPO DE DOCUMENTO RECAUDADOR"
                                            name="tipo_documento_recaudador"
                                            value={formData.tipo_documento_recaudador}
                                            onChange={handleSelectChange}
                                            options={getFilteredDocumentTypes()}
                                    darkMode={isDarkMode}
                                        />

                                        <AnimatedInput
                                            label="NÚMERO DE DOCUMENTO RECAUDADOR"
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
                                    disabled={isDetailView || isEditView}
                                    label="FECHA DE COMPRA"
                                    name="fechaCompra"
                                    value={formData.fechaCompra}
                                    onChange={handleInputChange}
                                    type="date"
                                    darkMode={isDarkMode}
                                />
                                <AnimatedInput
                                    disabled={isDetailView || isEditView}
                                    label="FECHA DE REGISTRO"
                                    name="fechaRegistro"
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
                                    value={formData.nitComprador}
                                    onChange={handleInputChange}
                                    type="text"
                                    darkMode={isDarkMode}
                                />

                                <AnimatedInput
                                    disabled={true}
                                    label="COMPRADOR"
                                    name="comprador"
                                    value={formData.comprador}
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
                                    value={formData.telefono}
                                    onChange={handleInputChange}
                                    type="text"
                                    darkMode={isDarkMode}
                                />

                                <AnimatedInput
                                    disabled={true}
                                    label="CIUDAD"
                                    name="ciudad"
                                    value={formData.ciudad}
                                    onChange={handleInputChange}
                                    type="text"
                                    darkMode={isDarkMode}
                                />
                            </div>

                            {/* Tipo de comprador */}
                            <div className="mb-6">
                                <h5 className={`${headingTextClass} font-semibold mb-3 text-sm lg:text-base`}>
                                    TIPO DE COMPRADOR
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="tipoComprador"
                                            value="Procesador"
                                            checked={formData.tipoComprador.includes('Procesador')}
                                            onChange={() => handleTipoCompradorChange('Procesador')}
                                            disabled={true}
                                            className="w-4 h-4 text-[#4D750F] bg-gray-100 border-gray-300 rounded focus:ring-[#4D750F] focus:ring-2"
                                        />
                                        <span className={`${accentTextClass} text-sm lg:text-base font-medium`}>PROCESADOR</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="tipoComprador"
                                            value="Exportador"
                                            checked={formData.tipoComprador.includes('Exportador')}
                                            onChange={() => handleTipoCompradorChange('Exportador')}
                                            disabled={true}
                                            className="w-4 h-4 text-[#4D750F] bg-gray-100 border-gray-300 rounded focus:ring-[#4D750F] focus:ring-2"
                                        />
                                        <span className={`${accentTextClass} text-sm lg:text-base font-medium`}>EXPORTADOR</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer sm:col-span-2 lg:col-span-1">
                                        <input
                                            type="checkbox"
                                            name="tipoComprador"
                                            value="Comerciante"
                                            checked={formData.tipoComprador.includes('Comerciante')}
                                            onChange={() => handleTipoCompradorChange('Comerciante')}
                                            disabled={true}
                                            className="w-4 h-4 text-[#4D750F] bg-gray-100 border-gray-300 rounded focus:ring-[#4D750F] focus:ring-2"
                                        />
                                        <span className={`${accentTextClass} text-sm lg:text-base font-medium`}>COMERCIANTE</span>
                                    </label>
                                </div>
                            </div>

                            {/* Columna de Dirección y Email */}
                            <div className="flex flex-col xl:flex-row justify-between gap-4">
                                <div className="flex-grow space-y-4">
                                    <div className="flex items-center gap-4">
                                        <AnimatedInput
                                            disabled={true}
                                            label="DIRECCION"
                                            name="direccion"
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
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            type="email"
                                            disabled={true}
                                            darkMode={isDarkMode}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col items-center min-w-[200px] mt-4 xl:mt-0">
                                    <div className={`text-center mb-4 ${accentTextClass} font-bold`}>
                                        <p className="text-sm">FACTURA ÚNICA</p>
                                        <p className="text-sm">NACIONAL</p>
                                    </div>
                                    <div className={`border-2 rounded px-4 py-2 ${isDarkMode ? 'border-white/40' : 'border-[#562707]'}`}>
                                        <p className={`text-2xl font-bold ${accentTextClass}`}>{formData.facturaUnica}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Datos del proveedor */}
                <div className={`${cardClass} p-4 xl:p-6 rounded-3xl mb-4 xl:mb-6`}>
                    {/* Sección de búsqueda de proveedor */}
                    <h4 className={`${headingTextClass} text-md font-bold mb-4`}>Información de proveedor</h4>
                    {!isDetailView && !isEditView && (
                        <>
                            <div className='flex justify-center mb-4 gap-4'>
                                <AnimatedSelect
                                    label="TIPO DE DOCUMENTO"
                                    name="tipo_documento_proveedor"
                                    value={formData.tipo_documento_proveedor}
                                    onChange={handleSelectChange}
                                    options={getFilteredDocumentTypes()}
                                    darkMode={isDarkMode}
                                />

                                <AnimatedInput
                                    label="NÚMERO DE DOCUMENTO"
                                    name="numero_documento_proveedor"
                                    value={formData.numero_documento_proveedor}
                                    onChange={handleInputChange}
                                    type="text"
                                    darkMode={isDarkMode}
                                />
                            </div>

                            <div className='flex justify-end mb-6 mt-4 gap-4'>
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
                        </>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-6 mb-4 xl:mb-4">
                        {!isRegisterRoute && (
                            <AnimatedInput
                                label="DOCUMENTO"
                                disabled={true}
                                name="nitProveedor"
                                value={formData.nitProveedor}
                                onChange={handleInputChange}
                                type="text"
                                darkMode={isDarkMode}
                            />
                        )}
                        <div className={isRegisterRoute ? "xl:col-span-2" : ""}>
                            <AnimatedInput
                                label="NOMBRE"
                                disabled={true}
                                name="nombreProveedor"
                                value={formData.nombreProveedor}
                                onChange={handleInputChange}
                                type="text"
                                darkMode={isDarkMode}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-6">

                    </div>
                </div>

                <div className={`${cardClass} rounded-3xl my-4 p-4 sm:p-6`}>
                    <h4 className={`${headingTextClass} text-md font-bold mb-4 text-center sm:text-left`}>Lugar de procedencia del cacao</h4>

                    <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6'>

                        {isDetailView || isEditView ? (
                            <AnimatedInput
                                label="DEPARTAMENTO"
                                name="departamento"
                                value={formData.departamento_compra}
                                disabled={true}
                                type="text"
                                darkMode={isDarkMode}
                            />
                        ) : (
                            <AnimatedSelect
                                label="DEPARTAMENTO"
                                name="departamento_compra"
                                value={formData.departamento_compra}
                                onChange={handleDepartmentChange}
                                options={getDepartmentOptions()}
                                disabled={isDetailView}
                                darkMode={isDarkMode}
                            />
                        )}

                        {isDetailView || isEditView ? (
                            <AnimatedInput
                                label="MUNICIPIO"
                                name="municipio"
                                value={formData.municipio_compra}
                                disabled={true}
                                type="text"
                                darkMode={isDarkMode}
                            />
                        ) : (
                            <AnimatedSelect
                                label="MUNICIPIO"
                                name="municipio_compra"
                                value={formData.municipio_compra}
                                onChange={handleLocationChange}
                                options={getCityOptions()}
                                disabled={!selectedDepartment}
                                darkMode={isDarkMode}
                            />
                        )}

                        <AnimatedInput
                            label="NOMBRE FINCA"
                            name="nombre_finca"
                            value={formData.nombre_finca}
                            onChange={handleInputChange}
                            type="text"
                            darkMode={isDarkMode}
                        />

                        <AnimatedInput
                            label="NOMBRE VEREDA"
                            name="nombre_vereda"
                            value={formData.nombre_vereda}
                            onChange={handleInputChange}
                            type="text"
                            darkMode={isDarkMode}
                        />

                        <div className="flex flex-col md:flex-row items-center gap-4 rounded-lg">
                            <div className="w-full md:w-2/3">
                                <AnimatedInput
                                    label="NUMERO DOCUMENTO SOPORTE"
                                    name="nro_documento_soporte"
                                    value={formData.nro_documento_soporte}
                                    onChange={handleInputChange}
                                    type="text"
                                    disabled={isDetailView}
                                    darkMode={isDarkMode}
                                />
                            </div>
                            
                            <div className="w-full md:w-1/3 flex flex-col items-center gap-2">
                                {isDetailView ? (
                                    <Button
                                        title="Ver documento"
                                        onClick={handleVerDocumento}
                                    />
                                ) : (
                                    <>
                                        <input
                                            type="file"
                                            onChange={handleFileChange}
                                            accept=".pdf,.doc,.docx"
                                            className="hidden"
                                            id="doc_soporte"
                                        />
                                        <label
                                            htmlFor="doc_soporte"
                                            className={`cursor-pointer px-4 py-2 rounded-xl font-semibold text-center flex items-center gap-2 w-full ${
                                                isDarkMode
                                                    ? 'bg-[#78390e] text-white hover:bg-[#925126]'
                                                    : 'bg-[rgb(var(--gray-20))] text-[rgb(var(--brown))] hover:bg-[rgb(var(--gray-40))]/90'
                                            }`}
                                        >
                                            <img src="/images/icons/upload.png" alt="upload" className="w-5 h-5" />
                                            Seleccionar archivo
                                        </label>

                                        {formData.doc_soporte && (
                                            <div className="flex items-center gap-2">
                                                <span className={`${headingTextClass} text-sm`}>
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
                                    </>
                                )}
                            </div>
                        </div>

                        
                    </div>

                  
                </div>

                {/* Componente de contenido dinámico */}
                <div className={`${cardClass} p-4 xl:p-6 rounded-3xl`}>
                    <ContentComponent
                        {...contentProps}
                        departamento_compra={formData.departamento_compra}
                        municipio_compra={formData.municipio_compra}
                        tipo_comprador={formData.tipoComprador}
                        doc_soporte={formData.doc_soporte}
                        formData={formData}
                    />
                </div>


            </div>
            {/* Modal de creación de proveedor */}
            <CreateProviderModal
                isOpen={isCreateProviderModalOpen}
                onClose={() => setIsCreateProviderModalOpen(false)}
            />

        </div>
    );
};

export default PurchaseDetails;
