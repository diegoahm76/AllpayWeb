'use client';

// facturas

import { useTypeDni } from '@/application/dni/useTypeDni';
import useGetDepartments from '@/application/address/useGetDepartmentsCacao';
import { useGetCities } from '@/application/address/useGetCities';
import useFacturasLiquidadas from '@/app/(Component)/(ComponentDashboard)/recaudadores/consultar_liquidacion/hooks/useFacturasLiquidadas';


// react
import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';

// utils
import { formatNumber, formatNumberWithCommas,  } from '@/utils/formatters';


// ui
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import DynamicTable from '@/presenters/components/ui/DynamicTable';


// services
import { FileDownload } from '@mui/icons-material';
import { IconButton } from '@mui/material';

// notificaciones
import AlertError from '@/presenters/components/recaudadores/AlertError';

import {ExternalUserInfo} from '@/presenters/components/recaudadores/ExternalUserInfo';

const SearchLiquidation = () => {

    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const [hasLoadedDepartments, setHasLoadedDepartments] = useState(false);
    const [hasFetchedTypes, setHasFetchedTypes] = useState(false);
    const [isInternalUser, setIsInternalUser] = useState<boolean | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
    // notificaciones
    const [isAlertError, setIsAlertError] = useState(false);
    const [alertErrorText, setAlertErrorText] = useState('');

    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const valueSesion: any = session;
    const router = useRouter();
    const token = valueSesion?.user?.tokens?.access || '';

    // Derivar isInternalUser directamente de session
    useEffect(() => {
        if (!valueSesion?.user?.tipo_usuario) return;
        if (valueSesion.user.tipo_usuario === 'I') {
            setIsInternalUser(true);
        } else if (valueSesion.user.tipo_usuario === 'E') {
            setIsInternalUser(false);
        }
    }, [valueSesion?.user?.tipo_usuario]);

    // obtener departamentos
    const {
        departments,
        fetchDepartments
    } = useGetDepartments();

    const { types, fetchTypes } = useTypeDni();

    // obtener municipios
    const { cities, loading: loadingCities, error: citiesError } = useGetCities({
        departamentoId: selectedDepartment || 0,
        token: valueSesion?.user?.tokens?.access || ''
    });

    // Hook para facturas liquidadas: se llama siempre, pasando el valor actual de isInternalUser
    const {
        invoices,
        isLoading,
        error: hookError,
        currentPage,
        totalPages,
        fetchInvoices,
        fetchAllData,
        clearInvoices
    } = useFacturasLiquidadas({ token, isInternalUser });

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

    // Cargar facturas liquidadas al cargar el componente
    useEffect(() => {
        if (isInternalUser !== null && token) {
            fetchInvoices({ page: 1, page_size: 10 });
        }
    }, [isInternalUser, token, fetchInvoices]);

    // Mostrar error del hook en el AlertError
    useEffect(() => {
        if (hookError) {
            setIsAlertError(true);
            setAlertErrorText(hookError);
        }
    }, [hookError]);

    // Manejo de selección de departamento
    const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (isInternalUser) {
            setBuyerFilters(prev => ({ 
                ...prev, 
                id_departamento_cacao: value,
                id_municipio_cacao: '' // Limpiar municipio cuando cambie departamento
            }));
        }
        setSelectedDepartment(value ? parseInt(value) : null);
    };


    // Opciones de departamento
    const getDepartmentOptions = () => {
        return departments
            .slice()
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
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
            .slice()
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
            .map(city => ({
                key: city.cod_municipio,
                value: city.cod_municipio,
                title: city.nombre
            }));
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
            render: (value: any) => '$' + formatNumber(value)
        },
        {
            key: 'cod_estado_liquidacion_display',
            label: 'ESTADO LIQUIDACIÓN',
            render: (value: any) => value
        }
    ];

    // Determinar si está en modo oscuro (debe estar antes de actions)
    const isDarkMode = mounted && theme === 'dark';

    const actions = [
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
                        color: isDarkMode ? '#fff' : '#4D750F',
                        '&:hover': {
                            backgroundColor: isDarkMode
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

    const [filters, setFilters] = useState({
        nro_factura_unica: '',
        fecha_desde: '',
        fecha_hasta: '',
        nro_documento_soporte: ''
    });

    // Filtros adicionales para usuarios internos (datos del comprador)
    const [buyerFilters, setBuyerFilters] = useState({
        recaudador_tipo_documento: '',
        recaudador_numero_documento: '',
        recaudador_razon_social: '',
        id_departamento_cacao: '',
        id_municipio_cacao: '',
        email_contacto_recaudador: '',
        direccion_contacto_recaudador: '',
        telefono_contacto_recaudador: ''
    });

    // Función para buscar con filtros
    const handleBuscar = () => {
        if (isInternalUser !== null && token) {
            const searchParams = {
                page: 1,
                page_size: 10,
                ...filters
            };

            // Si es usuario interno, agregar filtros de datos del comprador
            if (isInternalUser) {
                Object.assign(searchParams, buyerFilters);
            }

            fetchInvoices(searchParams);
        }
    };

    // Función para limpiar filtros y tabla
    const handleLimpiar = () => {
        setFilters({
            nro_factura_unica: '',
            fecha_desde: '',
            fecha_hasta: '',
            nro_documento_soporte: ''
        });
        setBuyerFilters({
            recaudador_tipo_documento: '',
            recaudador_numero_documento: '',
            recaudador_razon_social: '',
            id_departamento_cacao: '',
            id_municipio_cacao: '',
            email_contacto_recaudador: '',
            direccion_contacto_recaudador: '',
            telefono_contacto_recaudador: ''
        });
        clearInvoices();
        if (isInternalUser !== null && token) {
            fetchInvoices({ page: 1, page_size: 10 });
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

    const formatDataForExcel = (data: any[]) => {
        return data.map(row => ({
            ...row,
            // Exportar fechas en formato compatible con Excel
            fecha_creacion: formatDateForExcel(row.fecha_creacion),
            fecha_compra: formatDateForExcel(row.fecha_compra),
            // Exportar números como números PUROS (sin $ ni separadores)
            nro_factura_unica: Number(row.nro_factura_unica ?? 0),
            total_kilos: Number(row.total_kilos ?? 0),
            cuota_fomento: Number(row.cuota_fomento ?? 0),
            // Mantener otros campos tal cual
            cod_estado_liquidacion_display: row.cod_estado_liquidacion_display
        }));
    };

    // Función para obtener datos para Excel (sin actualizar la tabla)
    const fetchDataForExcel = async (): Promise<{ data: any[]; total_pages: number; }> => {
        if (isInternalUser === null || !token) {
            return { data: [], total_pages: 1 };
        }

        const searchParams: any = {
            sin_paginacion: true,
            liquidadas: true,
            ...filters
        };

        // Si es usuario interno, agregar filtros de datos del comprador
        if (isInternalUser) {
            Object.assign(searchParams, buyerFilters);
        }

        try {
            let response;
            // Llamada directa a los adapters sin actualizar el estado de la tabla
            if (isInternalUser) {
                const { consultarFacturasLiquidadasInterno } = await import('@/app/(Component)/(ComponentDashboard)/recaudadores/consultar_liquidacion/adapters/consultarFacturasLiquidadasInterno');
                response = await consultarFacturasLiquidadasInterno(token, searchParams);
            } else {
                const { consultarFacturasLiquidadasExterno } = await import('@/app/(Component)/(ComponentDashboard)/recaudadores/consultar_liquidacion/adapters/consultarFacturasLiquidadasExterno');
                response = await consultarFacturasLiquidadasExterno(token, searchParams);
            }

            // Formatear los datos antes de devolverlos
            return {
                data: formatDataForExcel(response.data),
                total_pages: response.total_pages
            };
        } catch (error) {
            console.error('Error al obtener datos para Excel:', error);
            return { data: [], total_pages: 1 };
        }
    };

    // Función wrapper para fetchAllData que incluye todos los filtros
    const handleFetchAllData = async (page: number): Promise<{ data: any[]; total_pages: number; }> => {
        const searchParams: any = {
            ...filters
        };

        // Si es usuario interno, agregar filtros de datos del comprador
        if (isInternalUser) {
            Object.assign(searchParams, buyerFilters);
        }

        return await fetchAllData(page, searchParams);
    };

    if (!mounted) {
        return null;
    }

    return (
        <div className="space-y-6">

            <AlertError
                isOpen={isAlertError}
                message={alertErrorText}
                onClose={() => setIsAlertError(false)}
            />

            <div
                className={`m-auto w-full rounded-3xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'
                    }`}
            >
                <div className={`rounded-xl p-4 sm:p-5 lg:p-6 relative ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>

                    <button
                        onClick={() => router.push('/')}
                        className={`absolute top-2 right-2 sm:right-4 text-xl sm:text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
                    >
                        &times; 
                    </button>
                    <h2
                        className={` text-xl sm:text-2xl lg:text-3xl font-bold text-center my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'
                            }`}
                    >
                        LIQUIDACIÓN DE FACTURAS ÚNICAS NACIONALES USUARIO RECAUDADOR
                    </h2>

                    <h3 className={`text-md font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                        Datos del comprador
                    </h3>

                    {!isInternalUser ?  <ExternalUserInfo /> : (<>

                    <div className="grid md:grid-cols-3 gap-6">

                        <AnimatedSelect
                            label="Tipo de Documento"
                            name="tipoDocumento"
                            value={isInternalUser ? buyerFilters.recaudador_tipo_documento : ''}
                            onChange={(e) => {
                                if (isInternalUser) {
                                    setBuyerFilters(prev => ({ ...prev, recaudador_tipo_documento: e.target.value }));
                                }
                            }}
                            options={types.map(type => ({
                                key: type.cod_tipo_documento,
                                value: type.cod_tipo_documento,
                                title: type.nombre
                            }))}
                            error={false}
                            disabled={!(isInternalUser === true)}
                            darkMode={isDarkMode}
                        />

                        <AnimatedInput
                            label="Número de Documento"
                            name="documentoIdentificacion"
                            value={isInternalUser ? buyerFilters.recaudador_numero_documento : ''}
                            onChange={(e) => {
                                if (isInternalUser) {
                                    setBuyerFilters(prev => ({ ...prev, recaudador_numero_documento: e.target.value }));
                                }
                            }}
                            type="text"
                            error={false}
                            disabled={!(isInternalUser === true)}
                            darkMode={isDarkMode}
                        />

                        <AnimatedInput
                            label="Razón Social"
                            name="razonSocial"
                            value={isInternalUser ? buyerFilters.recaudador_razon_social : ''}
                            onChange={(e) => {
                                if (isInternalUser) {
                                    setBuyerFilters(prev => ({ ...prev, recaudador_razon_social: e.target.value }));
                                }
                            }}
                            type="text"
                            disabled={!(isInternalUser === true)}
                            darkMode={isDarkMode}
                        />

                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mt-6">

                        <AnimatedSelect
                            label="Departamento"
                            name="departamento"
                            value={isInternalUser ? buyerFilters.id_departamento_cacao : ''}
                            onChange={handleDepartmentChange}
                            options={getDepartmentOptions()}
                            disabled={!(isInternalUser === true)}
                            darkMode={isDarkMode}
                        />

                        <AnimatedSelect
                            label="Municipio"
                            name="municipio"
                            value={isInternalUser ? buyerFilters.id_municipio_cacao : ''}
                            onChange={(e) => {
                                if (isInternalUser) {
                                    setBuyerFilters(prev => ({ ...prev, id_municipio_cacao: e.target.value }));
                                }
                            }}
                            options={getCityOptions()}
                            disabled={!(isInternalUser === true)}
                            darkMode={isDarkMode}
                        />

                        <AnimatedInput
                            label="Correo electrónico"
                            name="email_contacto_recaudador"
                            value={isInternalUser ? buyerFilters.email_contacto_recaudador : ''}
                            onChange={(e) => {
                                if (isInternalUser) {
                                    setBuyerFilters(prev => ({ ...prev, email_contacto_recaudador: e.target.value }));
                                }
                            }}
                            type="text"
                            disabled={!(isInternalUser === true)}
                            darkMode={isDarkMode}
                        />
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mt-6">
                        <AnimatedInput
                            label="Dirección"
                            name="direccion_contacto_recaudador"
                            value={isInternalUser ? buyerFilters.direccion_contacto_recaudador : ''}
                            onChange={(e) => {
                                if (isInternalUser) {
                                    setBuyerFilters(prev => ({ ...prev, direccion_contacto_recaudador: e.target.value }));
                                }
                            }}
                            type="text"
                            disabled={!(isInternalUser === true)}
                            darkMode={isDarkMode}
                        />

                        <AnimatedInput
                            label="Teléfono"
                            name="telefono_contacto_recaudador"
                            value={isInternalUser ? buyerFilters.telefono_contacto_recaudador : ''}
                            onChange={(e) => {
                                if (isInternalUser) {
                                    setBuyerFilters(prev => ({ ...prev, telefono_contacto_recaudador: e.target.value }));
                                }
                            }}
                            type="number"
                            disabled={!(isInternalUser === true)}
                            darkMode={isDarkMode}
                        />
                    </div>

                    </>)}

                </div>

                

                <div className={`rounded-3xl shadow-md p-6 mt-6 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>

                    <div className="grid md:grid-cols-2 gap-6">

                        <AnimatedInput
                            label="Factura única"
                            name="nro_factura_unica"
                            value={filters.nro_factura_unica}
                            onChange={e => setFilters(f => ({ ...f, nro_factura_unica: e.target.value }))}
                            type="number"
                            darkMode={isDarkMode}
                        />
                                  <AnimatedInput
                            label="Fecha de consulta"
                            name="fechaConsulta"
                            value={new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })).toISOString().split('T')[0]}
                            onChange={() => {}}
                            type="date"
                            disabled={true}
                            darkMode={isDarkMode}
                        />
                        <AnimatedInput
                            label="Fecha Inicio"
                            name="fecha_desde"
                            value={filters.fecha_desde}
                            onChange={e => setFilters(f => ({ ...f, fecha_desde: e.target.value }))}
                            type="date"
                            darkMode={isDarkMode}
                        />
                        <AnimatedInput
                            label="Fecha Fin"
                            name="fecha_hasta"
                            value={filters.fecha_hasta}
                            onChange={e => setFilters(f => ({ ...f, fecha_hasta: e.target.value }))}
                            type="date"
                            darkMode={isDarkMode}
                        />

              
                    </div>


                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
                        <Button title="Limpiar" onClick={handleLimpiar} />
                        <Button title="Buscar" onClick={handleBuscar} />
                        <Button title="Salir" onClick={() => router.push('/')} />
                    </div>
                </div>

                <div className={`rounded-3xl shadow-md p-6 mt-6 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>

                    <h2
                        className={` text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'
                            }`}
                    >
                        FACTURAS ÚNICAS NACIONALES REGISTRADAS
                    </h2>

                    
                        <DynamicTable
                            columns={columns}
                            data={invoices}
                            isLoading={isLoading}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page) => {
                                if (isInternalUser !== null && token) {
                                    const searchParams = {
                                        page,
                                        page_size: 10,
                                        ...filters
                                    };

                                    // Si es usuario interno, agregar filtros de datos del comprador
                                    if (isInternalUser) {
                                        Object.assign(searchParams, buyerFilters);
                                    }

                                    fetchInvoices(searchParams);
                                }
                            }}
                            fetchAllData={handleFetchAllData}
                            fetchDataForExcel={fetchDataForExcel}
                            actions={actions}
                        />
                    

                </div>


            </div>
    
        </div>
    );
};

export default SearchLiquidation;
