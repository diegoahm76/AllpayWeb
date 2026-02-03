'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import useFacturasPagadas from '../hooks/useFacturasPagadas';
import { formatCurrency, formatNumber, formatNumberWithCommas, } from '@/utils/formatters';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { InternalUserInfo, InternalUserInfoRef } from '@/presenters/components/recaudadores/InternalUserInfo';
import useGetDepartmentsCacao from '@/application/address/useGetDepartmentsCacao';
import { useMunicipiosCacaoteros } from '@/app/(Component)/(ComponentDashboard)/recaudadores/registrar_compra/hooks/useMunicipiosCacaoteros';

const ConsultarFacturasPagadasInterno: React.FC = () => {
    const router = useRouter();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });
    const token = (session as any)?.user?.tokens?.access;
    
    const {
        facturas,
        isLoading,
        //error,
        currentPage,
        totalPages,
        fetchFacturas,
        handlePageChange
    } = useFacturasPagadas();
    
    const [searchParams, setSearchParams] = useState({
        nro_factura_unica: '',
        fecha_desde: '',
        fecha_hasta: '',
        id_departamento_cacao: '',
        id_municipio_cacao: '',
        recaudador_numero_documento: ''
    });
    
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    
    // Referencia para el componente InternalUserInfo
    const internalUserInfoRef = useRef<InternalUserInfoRef>(null);

    // Hook para obtener departamentos cacaoteros
    const {
        departments,
        error: departmentsError,
        fetchDepartments
    } = useGetDepartmentsCacao();

    // Hook para obtener municipios cacaoteros
    const {
        municipios,
        error: municipiosError
    } = useMunicipiosCacaoteros({
        departamentoId: searchParams.id_departamento_cacao,
        token: token || ''
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (token && typeof token === 'string' && token.length > 0) {
            fetchFacturas(token);
        }
    }, [token]);

    // Cargar departamentos al montar el componente
    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    /* useEffect(() => {
        if (error) {
            setErrorMessage(error);
            setShowErrorAlert(true);
        }
    }, [error]); */

    // Manejar errores de departamentos y municipios
    useEffect(() => {
        if (departmentsError) {
            setErrorMessage(`Error al cargar departamentos: ${departmentsError}`);
            setShowErrorAlert(true);
        }
    }, [departmentsError]);

    useEffect(() => {
        if (municipiosError) {
            setErrorMessage(`Error al cargar municipios: ${municipiosError}`);
            setShowErrorAlert(true);
        }
    }, [municipiosError]);

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSearchParams(prev => {
            // Si se cambia el departamento, limpiar el municipio
            if (name === 'id_departamento_cacao') {
                return {
                    ...prev,
                    [name]: value,
                    id_municipio_cacao: '' // Limpiar municipio cuando cambie departamento
                };
            }
            return {
                ...prev,
                [name]: value
            };
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSearchParams(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Función para manejar cuando se encuentra un recaudador
    const handleRecaudadorFound = (numeroDocumento: string) => {
        setSearchParams(prev => ({
            ...prev,
            recaudador_numero_documento: numeroDocumento
        }));
    };

    // Construye los parámetros filtrados según el estado actual de búsqueda
    const buildFilteredParams = () => {
        const filteredParams: any = {};
        if (searchParams.nro_factura_unica && searchParams.nro_factura_unica.trim() !== '') {
            filteredParams.nro_factura_unica = parseInt(searchParams.nro_factura_unica);
        }
        if (searchParams.fecha_desde && searchParams.fecha_desde.trim() !== '') {
            filteredParams.fecha_desde = searchParams.fecha_desde.trim();
        }
        if (searchParams.fecha_hasta && searchParams.fecha_hasta.trim() !== '') {
            filteredParams.fecha_hasta = searchParams.fecha_hasta.trim();
        }
        if (searchParams.id_departamento_cacao && searchParams.id_departamento_cacao.trim() !== '') {
            filteredParams.id_departamento_cacao = parseInt(searchParams.id_departamento_cacao);
        }
        if (searchParams.id_municipio_cacao && searchParams.id_municipio_cacao.trim() !== '') {
            filteredParams.id_municipio_cacao = parseInt(searchParams.id_municipio_cacao);
        }
        if (searchParams.recaudador_numero_documento && searchParams.recaudador_numero_documento.trim() !== '') {
            filteredParams.recaudador_numero_documento = searchParams.recaudador_numero_documento.trim();
        }
        return filteredParams;
    };

    const handleSearch = async () => {
        if (!token) return;
        
        // Convertir los parámetros al tipo correcto según la interfaz SearchParams
        const filteredParams = buildFilteredParams();

        await fetchFacturas(token, 1, filteredParams);
    };

    const handleClear = async () => {
        // Limpiar todos los parámetros de búsqueda
        setSearchParams({
            nro_factura_unica: '',
            fecha_desde: '',
            fecha_hasta: '',
            id_departamento_cacao: '',
            id_municipio_cacao: '',
            recaudador_numero_documento: ''
        });
        
        // Limpiar el formulario del componente InternalUserInfo
        if (internalUserInfoRef.current) {
            internalUserInfoRef.current.clearForm();
        }
        
        if (token) {
            await fetchFacturas(token, 1);
        }
    };

    const formatDate = (value: string | null) => {
        if (!value) return 'No registrado';
        
        try {
            const fecha = new Date(value);
            
            if (isNaN(fecha.getTime())) {
                return 'Formato inválido';
            }
            
            return fecha.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return 'Error en formato';
        }
    };

    // Removed unused formatCurrency function

    // Removed local formatNumber function - using imported one from utils

    const columns = [
        {
            key: 'fecha_creacion',
            label: 'FECHA DE REGISTRO FACTURA',
            render: (value: string) => formatDate(value)
        },
        { 
            key: 'nro_factura_unica', 
            label: 'N° FACTURA ÚNICA', 
            render: (value: number) => formatNumber(value)
        },
        {
            key: 'fecha_compra',
            label: 'FECHA DE COMPRA',
            render: (value: string) => formatDate(value)
        },
        { 
            key: 'nro_documento_proveedor', 
            label: 'DOCUMENTO PROVEEDOR' 
        },
        { 
            key: 'nombre_persona_proveedor', 
            label: 'NOMBRE PROVEEDOR' 
        },
        { 
            key: 'nombre_departamento_cacao', 
            label: 'DEPARTAMENTO' 
        },
        { 
            key: 'nombre_municipio_cacao', 
            label: 'MUNICIPIO' 
        },
        {
            key: 'total_kilos',
            label: 'TOTAL KILOS',
            render: (value: number) => formatNumberWithCommas(value.toString())
        },
        {
            key: 'cuota_fomento',
            label: 'CUOTA DE FOMENTO',
            render: (value: number) => formatCurrency(value)
        },
        {
            key: 'cod_estado_liquidacion_display',
            label: 'ESTADO LIQUIDACIÓN',
            render: (value: string) => value
        },
        {
            key: 'fecha_pago_liquidacion',
            label: 'FECHA PAGO LIQUIDACIÓN',
            render: (value: string | null) => formatDate(value)
        }
    ];

    const fetchAllData = async () => {
        try {
            return {
                data: facturas,
                total_pages: totalPages
            };
        } catch (error) {
            console.error('Error en fetchAllData:', error);
            return {
                data: [],
                total_pages: 0
            };
        }
    };

    // Función para obtener las opciones de departamentos
    const getDepartmentOptions = () => {
        const defaultOption = { key: '', value: '', title: 'Seleccione un departamento' };
        
        if (!departments || departments.length === 0) {
            return [defaultOption];
        }
        
        // Ordenar alfabéticamente por nombre
        const sortedDepartments = [...departments].sort((a, b) => 
            a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
        );
        
        const departmentOptions = sortedDepartments.map(dept => ({
            key: dept.cod_departamento,
            value: dept.cod_departamento,
            title: dept.nombre
        }));
        
        return [defaultOption, ...departmentOptions];
    };

    // Función para obtener las opciones de municipios
    const getCityOptions = () => {
        const defaultOption = { key: '', value: '', title: 'Seleccione un municipio' };
        
        if (!searchParams.id_departamento_cacao) {
            return [{ key: '', value: '', title: 'Primero seleccione un departamento' }];
        }
        
        if (!municipios || municipios.length === 0) {
            return [defaultOption];
        }
        
        // Ordenar alfabéticamente por nombre
        const sortedMunicipios = [...municipios].sort((a, b) => 
            a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
        );
        
        const cityOptions = sortedMunicipios.map(municipio => ({
            key: municipio.cod_municipio,
            value: municipio.cod_municipio,
            title: municipio.nombre
        }));
        
        return [defaultOption, ...cityOptions];
    };

    const isDarkMode = mounted && theme === 'dark';
    const headingTextClass = isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]';

    if (!mounted) {
        return null;
    }

    return (
        <div className="w-full">
            <AlertError 
                isOpen={showErrorAlert} 
                onClose={() => setShowErrorAlert(false)} 
                message={errorMessage} 
            />
            
            <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
                <div className="w-full p-1">
                    <div className={`m-auto w-full rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                        <div className={`rounded-xl p-4 relative ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>
                            <button
                                onClick={() => router.push('/')}
                                className={`absolute top-2 right-4 text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
                            >
                                &times;
                            </button>

                            <div className="relative flex justify-center items-center mt-[39px] mb-6">
                                <h3
                                    className={`text-center  text-xl sm:text-2xl lg:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                                >
                                    CONSULTAR FACTURAS PAGADAS
                                </h3>
                            </div>

                            <h3 className={`text-md font-bold ${headingTextClass}`}>Consultar por recaudador:</h3>

                            <InternalUserInfo 
                                ref={internalUserInfoRef}
                                onFoundCollector={handleRecaudadorFound}
                            />

                            <h3 className={`text-md font-bold mt-4 ${headingTextClass}`}>Consultar por Fecha:</h3>


                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            
                                <AnimatedInput
                                    label="Fecha Desde"
                                    name="fecha_desde"
                                    value={searchParams.fecha_desde}
                                    onChange={handleInputChange}
                                    type="date"
                                    darkMode={isDarkMode}
                                />
                                
                                <AnimatedInput
                                    label="Fecha Hasta"
                                    name="fecha_hasta"
                                    value={searchParams.fecha_hasta}
                                    onChange={handleInputChange}
                                    type="date"
                                    darkMode={isDarkMode}
                                />
                                   
                            </div>

                            <h3 className={`text-md font-bold mt-4 ${headingTextClass}`}>Consultar por Ubicación:</h3>

                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                           
                                <AnimatedSelect
                                    label="Departamento"
                                    name="id_departamento_cacao"
                                    value={searchParams.id_departamento_cacao}
                                    onChange={handleSelectChange}
                                    options={getDepartmentOptions()}
                                    darkMode={isDarkMode}
                                />

                                <AnimatedSelect
                                    label="Municipio"
                                    name="id_municipio_cacao"
                                    value={searchParams.id_municipio_cacao}
                                    onChange={handleSelectChange}
                                    options={getCityOptions()}
                                    darkMode={isDarkMode}
                                />

                                <AnimatedInput
                                    label="Nº Factura Única"
                                    name="nro_factura_unica"
                                    value={searchParams.nro_factura_unica}
                                    onChange={handleInputChange}
                                    type="text"
                                    darkMode={isDarkMode}
                                />
                            </div>

                            <div className="flex flex-wrap justify-center gap-4 mt-6">
                                <Button 
                                    onClick={handleSearch} 
                                    title="Buscar"
                                    disabled={isLoading}
                                />
                                <Button 
                                    onClick={handleClear} 
                                    title="Limpiar"
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="mt-6 overflow-x-auto">
                                <DynamicTable
                                    columns={columns}
                                    data={facturas}
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={(page) => handlePageChange(page, token, buildFilteredParams())}
                                    isLoading={isLoading}
                                    fetchAllData={fetchAllData}
                                    downloadButtonPosition="top"
                                />
                            </div>

                            <div className="flex justify-center mt-6">
                                <Button onClick={() => router.push('/')} title="Salir" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConsultarFacturasPagadasInterno; 