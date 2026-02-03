'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import { useLiquidacionesPagadas } from '../hooks/useLiquidacionesPagadas';
import { LiquidacionPagada } from '../models/liquidaciones.pagadas.model';
import { IconButton } from '@mui/material';
import { FileDownload } from '@mui/icons-material';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { useTypeDni } from '@/application/dni/useTypeDni';

const ConsultaLiquidacionesPagadas: React.FC = () => {
    const router = useRouter();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    
    // Obtener sesión y token
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });
    const token = (session as any)?.user?.tokens?.access;
    const tipoUsuario = (session as any)?.user?.tipo_usuario; // 'I' = Interno, 'E' = Externo
    const esUsuarioInterno = tipoUsuario === 'I';
    
    // Hook personalizado para liquidaciones pagadas
    const {
        liquidaciones,
        isLoading,
        //error,
        currentPage,
        totalPages,
        obtenerLiquidaciones,
        cambiarPagina,
        refetch
    } = useLiquidacionesPagadas(token);
    
    // Cambio de estado para manejar múltiples selecciones
    const [selectedLiquidaciones, setSelectedLiquidaciones] = useState<Set<string>>(new Set());
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Estados para filtros
    const [filters, setFilters] = useState({
        fecha_inicio: '',
        fecha_fin: '',
        tipo_documento: '',
        numero_documento: ''
    });

    // Hook para tipos de documento
    const { types, fetchTypes } = useTypeDni();
    const [hasFetchedTypes, setHasFetchedTypes] = useState(false);

    // Cargar tipos de documento
    useEffect(() => {
        if (token && !hasFetchedTypes) {
            fetchTypes(token);
            setHasFetchedTypes(true);
        }
    }, [token, hasFetchedTypes, fetchTypes]);

    // Cargar liquidaciones automáticamente cuando el token esté disponible
    useEffect(() => {
        if (token && typeof token === 'string' && token.length > 0) {
            obtenerLiquidaciones();
        }
    }, [token, obtenerLiquidaciones]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleBuscar = () => {
        const filtersToSend: any = {};
        
        if (filters.fecha_inicio) filtersToSend.fecha_inicio = filters.fecha_inicio;
        if (filters.fecha_fin) filtersToSend.fecha_fin = filters.fecha_fin;
        if (filters.tipo_documento) filtersToSend.tipo_documento = filters.tipo_documento;
        if (filters.numero_documento) filtersToSend.numero_documento = filters.numero_documento;
        
        obtenerLiquidaciones(filtersToSend);
    };

    const handleLimpiar = () => {
        setFilters({
            fecha_inicio: '',
            fecha_fin: '',
            tipo_documento: '',
            numero_documento: ''
        });
        obtenerLiquidaciones();
    };

    const handleRefrescar = async () => {
        try {
            const filtersToSend: any = {};
            
            if (filters.fecha_inicio) filtersToSend.fecha_inicio = filters.fecha_inicio;
            if (filters.fecha_fin) filtersToSend.fecha_fin = filters.fecha_fin;
            if (filters.tipo_documento) filtersToSend.tipo_documento = filters.tipo_documento;
            if (filters.numero_documento) filtersToSend.numero_documento = filters.numero_documento;
            
            await refetch(filtersToSend);
        } catch (error) {
            console.error('Error al refrescar:', error);
        }
    };

    const getFilteredDocumentTypes = () => {
        if (!types || types.length === 0) {
            return [];
        }
        return types.map((type: any) => ({
            key: type.cod_tipo_documento || '',
            value: type.cod_tipo_documento || '',
            title: type.nombre || ''
        }));
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

    const formatCurrency = (value: number | string) => {
        const numericValue = typeof value === 'string' ? parseFloat(value) : value;
        
        if (isNaN(numericValue)) {
            return '$ 0';
        }
        
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(numericValue);
    };

    const getEstadoDisplay = (codEstado: string) => {
        switch (codEstado) {
            case 'P':
                return 'Pago';
            case 'L':
                return 'Liquidado';
            case 'PE':
                return 'Pendiente';
            default:
                return codEstado || 'Sin estado';
        }
    };

    const columns = [
        {
            key: 'nro_doc_pago',
            label: 'Nº Documento de Pago',
            render: (value: string) => value || '-'
        },
        {
            key: 'cod_estado',
            label: 'Estado',
           render: (value: string) => getEstadoDisplay(value)
        },
        {
            key: 'fecha_liquidacion',
            label: 'Fecha de Liquidación',
            render: (value: string) => formatDate(value)
        },
        {
            key: 'fecha_pago',
            label: 'Fecha de Pago',
            render: (value: string | null) => formatDate(value)
        },
        {
            key: 'valor_pagar',
            label: 'Valor a Pagar',
            render: (value: string) => formatCurrency(value)
        },
        {
            key: 'valor_intereses',
            label: 'Valor Intereses',
            render: (value: string) => formatCurrency(value)
        },
        {
            key: 'id_persona_liquida',
            label: 'ID Persona Liquida',
            render: (value: number) => value === 0 ? 'No asignado' : value.toString()
        },
        {
            key: 'doc_pago',
            label: 'Doc. Pago',
            render: (value: number | string) => value?.toString() || '-'
        }
    ];

    // Nueva función para manejar checkboxes
    const handleCheckboxChange = (row: LiquidacionPagada) => {
        const liquidacionId = row.id_liq_factura_unica.toString();
        const newSelectedLiquidaciones = new Set(selectedLiquidaciones);
        
        if (newSelectedLiquidaciones.has(liquidacionId)) {
            newSelectedLiquidaciones.delete(liquidacionId);
        } else {
            newSelectedLiquidaciones.add(liquidacionId);
        }
        
        setSelectedLiquidaciones(newSelectedLiquidaciones);
    };

    // Función para seleccionar/deseleccionar todos eliminada - no se usaba

    const handleSeleccionar = () => {
        if (selectedLiquidaciones.size === 0) {
            setErrorMessage('Debe seleccionar al menos una liquidación');
            setShowErrorAlert(true);
            return;
        }
        
        const liquidacionesArray = Array.from(selectedLiquidaciones);
        
        // Si solo hay una seleccionada, usar liquidacionId
        if (liquidacionesArray.length === 1) {
            router.push(`/recaudadores/consultar_cuotas_pagadas?liquidacionId=${liquidacionesArray[0]}`);
        } else {
            // Para múltiples selecciones, usar liquidacionIds
            const liquidacionesParam = liquidacionesArray.join(',');
            router.push(`/recaudadores/consultar_cuotas_pagadas?liquidacionIds=${liquidacionesParam}`);
        }
    };

    const handleDescargarPdf = (liquidacion: LiquidacionPagada) => {
        try {
            if (!liquidacion.archivo) {
                setErrorMessage('No hay archivo PDF disponible para esta liquidación');
                setShowErrorAlert(true);
                return;
            }

            // Abrir el PDF en una nueva pestaña
            window.open(liquidacion.archivo, '_blank');
            
            console.log('Abriendo PDF:', liquidacion.archivo);
        } catch (error) {
            console.error('Error al abrir el PDF:', error);
            setErrorMessage('Error al abrir el archivo PDF. Por favor, intente nuevamente.');
            setShowErrorAlert(true);
        }
    };


    const handlePageChange = (newPage: number) => {
        const filtersToSend: any = {};
        
        if (filters.fecha_inicio) filtersToSend.fecha_inicio = filters.fecha_inicio;
        if (filters.fecha_fin) filtersToSend.fecha_fin = filters.fecha_fin;
        if (filters.tipo_documento) filtersToSend.tipo_documento = filters.tipo_documento;
        if (filters.numero_documento) filtersToSend.numero_documento = filters.numero_documento;
        
        cambiarPagina(newPage, filtersToSend);
    };

    const fetchAllData = async (page: number) => {
        try {
            if (page === 0) {
                return {
                    data: liquidaciones,
                    total_pages: totalPages
                };
            }
            
            return {
                data: liquidaciones,
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

    const isDarkMode = mounted && theme === 'dark';

    const actions = useMemo(() => [
        {
            label: 'Acciones',
            render: (row: LiquidacionPagada) => (
                <div className="flex items-center justify-center gap-3">
                    <input
                        type="checkbox"
                        checked={selectedLiquidaciones.has(row.id_liq_factura_unica.toString())}
                        onChange={() => handleCheckboxChange(row)}
                        className="h-4 w-4 text-[#78390e] border-gray-300 cursor-pointer focus:ring-[#78390e] rounded"
                    />
                    <IconButton
                        onClick={() => handleDescargarPdf(row)}
                        sx={{
                            color: isDarkMode ? '#fff' : '#4D750F',
                            '&:hover': {
                                backgroundColor: isDarkMode
                                    ? 'rgba(255, 255, 255, 0.1)'
                                    : 'rgba(77, 117, 15, 0.1)'
                            }
                        }}
                        title="Descargar PDF"
                        size="small"
                    >
                        <FileDownload />
                    </IconButton>
                </div>
            )
        }
    ], [selectedLiquidaciones, isDarkMode]);

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

                            <div className="relative flex justify-center items-center mt-[39px]">
                                <h3
                                    className={`text-center text-xl sm:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                                >
                                    GENERAR PAZ Y SALVO
                                </h3>
                            </div>

                            {/* Filtros */}
                            <div className="mt-6 mb-4">
                                <div className={`grid gap-4 mb-4 ${esUsuarioInterno ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                                    <AnimatedInput
                                        label="Fecha Inicio"
                                        name="fecha_inicio"
                                        type="date"
                                        value={filters.fecha_inicio}
                                        onChange={handleInputChange}
                                        darkMode={isDarkMode}
                                    />
                                    <AnimatedInput
                                        label="Fecha Fin"
                                        name="fecha_fin"
                                        type="date"
                                        value={filters.fecha_fin}
                                        onChange={handleInputChange}
                                        darkMode={isDarkMode}
                                    />
                                    {esUsuarioInterno && (
                                        <>
                                            <AnimatedSelect
                                                label="Tipo Documento"
                                                name="tipo_documento"
                                                value={filters.tipo_documento}
                                                onChange={handleSelectChange}
                                                options={getFilteredDocumentTypes()}
                                                darkMode={isDarkMode}
                                            />
                                            <AnimatedInput
                                                label="Número Documento"
                                                name="numero_documento"
                                                type="text"
                                                value={filters.numero_documento}
                                                onChange={handleInputChange}
                                                darkMode={isDarkMode}
                                            />
                                        </>
                                    )}
                                </div>
                                <div className="flex justify-center gap-3">
                                    <Button 
                                        onClick={handleBuscar} 
                                        title="Buscar"
                                        disabled={isLoading}
                                    />
                                    <Button 
                                        onClick={handleLimpiar} 
                                        title="Limpiar"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div className="mt-6 overflow-x-auto">
                                <DynamicTable
                                    columns={columns}
                                    data={liquidaciones}
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={handlePageChange}
                                    actions={actions}
                                    isLoading={isLoading}
                                    fetchAllData={fetchAllData}
                                    downloadButtonPosition="top"
                                />
                            </div>

                            <div className="flex flex-wrap justify-center gap-4 mt-6">
                                <Button 
                                    onClick={handleRefrescar} 
                                    title="Refrescar"
                                    disabled={isLoading}
                                />
                                <Button 
                                    onClick={handleSeleccionar} 
                                    title={`Ver Cuotas Pagadas${selectedLiquidaciones.size > 0 ? ` (${selectedLiquidaciones.size})` : ''}`}
                                    disabled={selectedLiquidaciones.size === 0 || isLoading}
                                />
                                <Button onClick={() => router.push('/')} title="Salir" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConsultaLiquidacionesPagadas; 