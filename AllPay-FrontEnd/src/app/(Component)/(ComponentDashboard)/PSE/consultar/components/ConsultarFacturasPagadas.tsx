'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import useFacturasPagadas from '../hooks/useFacturasPagadas';
import { formatNumber, formatCurrency, formatNumberWithCommas } from '@/utils/formatters';

const ConsultarFacturasPagadas: React.FC = () => {
    const router = useRouter();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);
    
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
        fecha_hasta: ''
    });
    
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorMessage, ] = useState('');

    useEffect(() => {
        if (token && typeof token === 'string' && token.length > 0) {
            fetchFacturas(token);
        }
    }, [token]);

    /* useEffect(() => {
        if (error) {
            setErrorMessage(error);
            setShowErrorAlert(true);
        }
    }, [error]); */

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
            if (value && value.trim() !== '') {
                acc[key] = value.trim();
            }
            return acc;
        }, {} as any);

        await fetchFacturas(token, 1, filteredParams);
    };

    const handleClear = async () => {
        setSearchParams({
            nro_factura_unica: '',
            fecha_desde: '',
            fecha_hasta: ''
        });
        
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
            label: 'FECHA DE PAGO',
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

    // Determinar si está en modo oscuro
    const isDarkMode = mounted && theme === 'dark';

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
                        <div className={`rounded-xl p-4 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'} relative`}>
                            <button
                                onClick={() => router.push('/')}
                                className={`absolute top-2 right-4 text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
                            >
                                &times;
                            </button>

                            <div className="relative flex justify-center items-center mt-[39px]">
                                <h3
                                    className={`text-center  text-xl sm:text-2xl lg:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                                >
                                    CONSULTAR FACTURAS PAGADAS
                                </h3>
                            </div>

                            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <AnimatedInput
                                    label="Nº Factura Única"
                                    name="nro_factura_unica"
                                    value={searchParams.nro_factura_unica}
                                    onChange={handleInputChange}
                                    type="text"
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

                            <div className="mt-6 overflow-x-auto">
                                <DynamicTable
                                    columns={columns}
                                    data={facturas}
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={(page) => handlePageChange(page, token)}
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

export default ConsultarFacturasPagadas; 