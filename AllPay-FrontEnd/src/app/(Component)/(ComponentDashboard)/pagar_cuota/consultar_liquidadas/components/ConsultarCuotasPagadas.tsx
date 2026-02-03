'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import { formatNumber } from '@/utils/formatters';
import useCuotasPagadas from '../hooks/useCuotasPagadas';
import LogoPSE from '@/presenters/components/shared/logo/LogoPSE';
import Logo from '@/presenters/components/shared/logo/Logo';
import{ ExternalUserInfo }from '@/presenters/components/recaudadores/ExternalUserInfo';
import { IconButton } from '@mui/material';
import LogoPSESmall from '@/presenters/components/shared/logo/LogoPSESmall';
import { FileDownload } from '@mui/icons-material';

const ConsultarCuotasPagadas: React.FC = () => {
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
        isLoading,
        error,
        currentPage,
        totalPages,
        cuotas,
        fetchFacturas,
        handlePageChange,
        getAllCuotasPagadas,
        transformPlanesToCuotas
    } = useCuotasPagadas();
    
    const [searchParams, setSearchParams] = useState({
        nro_solicitud: '',
        nro_plan_pago: '',
        fecha_desde: '',
        fecha_hasta: ''
    });
    
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (token && typeof token === 'string' && token.length > 0) {
            fetchFacturas(token);
        }
    }, [token]);

    useEffect(() => {
        if (error) {
            setErrorMessage(error);
            setShowErrorAlert(true);
        }
    }, [error]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSearchParams(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSearch = async () => {
        if (!token) return;
        
        const filteredParams = Object.entries(searchParams).reduce((acc, [key, value]) => {
            // Convertir a string y verificar si no está vacío
            const stringValue = String(value || '');
            if (stringValue.trim() !== '') {
                acc[key] = stringValue.trim();
            }
            return acc;
        }, {} as any);

        await fetchFacturas(token, 1, filteredParams);
    };

    const handleClear = async () => {
        setSearchParams({
            nro_solicitud: '',
            nro_plan_pago: '',
            fecha_desde: '',
            fecha_hasta: ''
        });
        
        if (token) {
            await fetchFacturas(token, 1);
        }
    };

    const columns = [
        {
            key: 'nro_solicitud',
            label: 'N° SOLICITUD',
            render: (value: number) => value
        },
        { 
            key: 'nro_plan_pago', 
            label: 'N° PLAN PAGO', 
            render: (value: number) => value
        },
        {
            key: 'nro_cuota',
            label: 'N° CUOTA',
            render: (value: number) => value
        },
        { 
            key: 'valor_cuota', 
            label: 'VALOR CUOTA',
            render: (value: number) => formatNumber(value)
        },
        { 
            key: 'pagada', 
            label: 'PAGADA',
            render: (value: boolean) => (
                value ? 'Si' : 'No'
            )
        },
        {
            key: 'estado_plan_pago_display',
            label: 'ESTADO PLAN PAGO',
            render: (value: string) => value
        },
        {
            key: 'nombre_recaudador',
            label: 'RECAUDADOR',
            render: (value: string) => value
        },
        {
            key: 'facturas_asociadas',
            label: 'FACTURAS ASOCIADAS',
            render: (value: string) => value
        }
    ];


    const handlePagarPSE = async (idCuota: number, nroCuotas: number) => {
        router.push('/pagar_cuota/integracion?id_pp=' + idCuota + '&nro_cuotas=' + nroCuotas);
    };

    const handleDescargarDocumento = async (docLiquidacionUrl: string | null) => {
        console.log(docLiquidacionUrl);
        if (docLiquidacionUrl) {
            window.open(docLiquidacionUrl, '_blank');
        } else {
            setErrorMessage('No se encontró el documento de liquidación para esta cuota.');
            setShowErrorAlert(true);
        }
    };

    const fetchAllData = async () => {
        try {
            if (!token) return { data: [], total_pages: 0 };
            const allDataResponse = await getAllCuotasPagadas(token, searchParams);
            // Transformar los planes a cuotas liquidadas
            const allCuotasTransformadas = transformPlanesToCuotas(allDataResponse);
            return {
                data: allCuotasTransformadas,
                total_pages: Math.ceil(allCuotasTransformadas.length / 10)
            };
        } catch (error) {
            console.error('Error en fetchAllData:', error);
            return {
                data: [],
                total_pages: 0
            };
        }
    };

    const isDarkMode = mounted && theme === 'dark';

    const actions = useMemo(() => [
        {
            label: 'Pagar PSE',
            render: (_: any) => (
                <IconButton
                    onClick={() => handlePagarPSE(_.id_plan_pago, _.nro_cuota)}
                    sx={{
                        color: isDarkMode ? '#fff' : '#0A4971',
                        '&:hover': {
                            backgroundColor: isDarkMode
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
            label: 'Descargar documento',
            render: (_: any) => (
                <IconButton
                    onClick={() => handleDescargarDocumento(_.doc_liquidacion_url)}
                    sx={{
                        color: isDarkMode ? '#fff' : 'rgba(var(--green))',
                        '&:hover': {
                            backgroundColor: 'rgba(var(--green-20))'
                        },
                        marginLeft: '8px'
                    }}
                    title="Descargar documento"
                >
                    <FileDownload />
                </IconButton>
            )
        }
    ], [isDarkMode]);

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
                                className={`absolute top-2 right-2 sm:right-4 text-xl sm:text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
                            >
                                &times;
                            </button>   

                            <div className="relative flex justify-center items-center mt-[19px]">
                                 <h2
                                    className={` text-xl sm:text-2xl lg:text-3xl font-bold text-center my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'
                                        }`}
                                >
                                    PAGO EN LÍNEA ACUERDOS DE PAGO
                                </h2>
                            </div>

                            {/* Logos */}
<div className={`mb-10 px-6 py-6 rounded-lg
  ${isDarkMode ? 'bg-opacity-10 bg-transparent border border-white/20' : 'bg-white border border-gray-200 shadow-sm'}`}>

  <div className="flex flex-col md:flex-row items-center md:justify-between gap-6">
    {/* Logo AllPay */}
    <div className="w-full md:w-2/5 flex justify-center">
      {/* si Logo acepta className, pásale tamaños responsivos */}
      <Logo className="w-44 md:w-56 h-auto" />
    </div>

    {/* Divisor: horizontal en móvil, vertical en md+ */}
    <div className="md:flex-grow flex justify-center">
      {/* horizontal (móvil) */}
      <div className={`w-24 h-0.5 md:hidden rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
      {/* vertical (md+) */}
      <div className={`hidden md:block w-0.5 h-16 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
    </div>

    {/* Logo PSE */}
    <div className="w-full md:w-2/5 flex justify-center">
      {/* OJO: el truco real es dentro de LogoPSE (paso 2) */}
      <LogoPSE className="w-36 md:w-48 h-auto" />
    </div>
  </div>
</div>


                            <h3 className={`text-md font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                Datos del recaudador
                            </h3>

                            <ExternalUserInfo/>


                        </div>

                        <div className={`rounded-xl p-4 relative mt-6 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>
                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <AnimatedInput
                                    label="Nº Solicitud"
                                    name="nro_solicitud"
                                    value={searchParams.nro_solicitud}
                                    onChange={handleInputChange}
                                    type="number"
                                    darkMode={isDarkMode}
                                />
                                <AnimatedInput
                                    label="Nº Plan Pago"
                                    name="nro_plan_pago"
                                    value={searchParams.nro_plan_pago}
                                    onChange={handleInputChange}
                                    type="number"
                                    darkMode={isDarkMode}
                                />

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
                        </div>

                        <div className={`rounded-xl p-4 relative mt-6 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>
                            
                            <h3 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'
                                        }`}>
                                CUOTAS LIQUIDADAS DE PLANES DE PAGO
                            </h3>
                            
                            <div className="mt-6 overflow-x-auto">
                                <DynamicTable
                                    columns={columns}
                                    data={cuotas}
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={(page) => handlePageChange(page, token)}
                                    isLoading={isLoading}
                                    fetchAllData={fetchAllData}
                                    downloadButtonPosition="top"
                                    actions={actions}
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

export default ConsultarCuotasPagadas; 