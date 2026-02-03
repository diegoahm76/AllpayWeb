'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import { useLiquidacionesPagadas } from '../hooks/useLiquidacionesPagadas';
import { LiquidacionPagada } from '../models/liquidaciones.pagadas.model';
import { LiquidacionesPagadasFilters, getLiquidacionesPagadas } from '../adapters/liquidaciones.pagadas.adapter';
import { IconButton } from '@mui/material';
import { FileDownload } from '@mui/icons-material';

const ConsultaLiquidacionesPagadas: React.FC = () => {
    const router = useRouter();
    const { theme } = useTheme();
    
    // Obtener sesión y token
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });
    const token = (session as any)?.user?.tokens?.access;
    
    // Hook personalizado para liquidaciones pagadas
    const {
        liquidaciones,
        isLoading,
        //error,
        currentPage,
        totalPages,
        obtenerLiquidaciones,
        cambiarPagina,
    } = useLiquidacionesPagadas(token);
    
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFin, setFechaFin] = useState<string>('');
    const [currentFilters, setCurrentFilters] = useState<LiquidacionesPagadasFilters | null>(null);

    // Cargar liquidaciones automáticamente cuando el token esté disponible
    useEffect(() => {
        if (token && typeof token === 'string' && token.length > 0) {
            obtenerLiquidaciones();
        }
    }, [token, obtenerLiquidaciones]);

    // Función para formatear fecha antes de enviar a la API
    const formatDateForApi = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    // Función para manejar la consulta con filtros
    const handleConsultar = () => {
        const filters: LiquidacionesPagadasFilters = {
            page: 1
        };
        
        if (fechaInicio) {
            filters.fecha_inicio = formatDateForApi(fechaInicio);
        }
        
        if (fechaFin) {
            filters.fecha_fin = formatDateForApi(fechaFin);
        }
        
        setCurrentFilters(filters);
        obtenerLiquidaciones(filters);
    };

    // Función para limpiar filtros y hacer petición sin filtros
    const handleLimpiar = () => {
        setFechaInicio('');
        setFechaFin('');
        setCurrentFilters(null);
        obtenerLiquidaciones(); // Sin filtros, carga la página 1
    };

    // Función para manejar el cambio de página manteniendo los filtros
    const handlePageChange = (newPage: number) => {
        if (currentFilters) {
            // Si hay filtros activos, mantenerlos al cambiar de página
            const filtersWithPage: LiquidacionesPagadasFilters = {
                ...currentFilters,
                page: newPage
            };
            obtenerLiquidaciones(filtersWithPage);
        } else {
            // Si no hay filtros, usar la función normal de cambio de página
            cambiarPagina(newPage);
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

    const actions = [
        {
            label: 'Acciones',
            render: (row: LiquidacionPagada) => (
                <div className="flex items-center justify-center gap-3">
               
                    <IconButton
                        onClick={() => handleDescargarPdf(row)}
                        sx={{
                            color: theme === 'dark' ? '#fff' : '#4D750F',
                            '&:hover': {
                                backgroundColor: theme === 'dark'
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
    ];


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

    // Función para obtener todos los datos sin paginación para Excel
    const fetchDataForExcel = async () => {
        try {
            if (!token || typeof token !== 'string' || token.length === 0) {
                throw new Error('No se encontró el token de acceso');
            }

            // Construir filtros con sin_paginacion = true y los filtros actuales (fechas)
            const filters: LiquidacionesPagadasFilters = {
                sin_paginacion: true
            };

            // Priorizar currentFilters si existe (filtros aplicados), sino usar los valores del estado
            if (currentFilters) {
                if (currentFilters.fecha_inicio) {
                    filters.fecha_inicio = currentFilters.fecha_inicio;
                }
                if (currentFilters.fecha_fin) {
                    filters.fecha_fin = currentFilters.fecha_fin;
                }
            } else {
                // Si no hay filtros aplicados, usar los valores de los inputs
                if (fechaInicio) {
                    filters.fecha_inicio = formatDateForApi(fechaInicio);
                }
                
                if (fechaFin) {
                    filters.fecha_fin = formatDateForApi(fechaFin);
                }
            }

            const response = await getLiquidacionesPagadas(token, filters);

            return {
                data: response.data || [],
                total_pages: response.total_pages || 1
            };
        } catch (error) {
            console.error('Error en fetchDataForExcel:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Error al obtener datos para Excel');
            setShowErrorAlert(true);
            return {
                data: [],
                total_pages: 0
            };
        }
    };

    // Comentado: No mostrar error del hook automáticamente
    // React.useEffect(() => {
    //     if (error) {
    //         setErrorMessage(error);
    //         setShowErrorAlert(true);
    //     }
    // }, [error]);

    return (
        <div className="w-full">
            <AlertError 
                isOpen={showErrorAlert} 
                onClose={() => setShowErrorAlert(false)} 
                message={errorMessage} 
            />
            
            <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
                <div className="w-full p-1">
                    <div className={`m-auto w-full rounded-xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                        <div className={`rounded-xl p-4 ${theme === 'dark' ? 'dark' : 'bg-white'} relative`}>
                            <button
                                onClick={() => router.push('/')}
                                className="absolute top-2 right-4 text-2xl hover:text-red-700 text-[rgb(var(--brown))]"
                            >
                                &times;
                            </button>

                            <div className="relative flex justify-center items-center mt-[39px]">
                                <h3
                                    className={`text-center text-xl sm:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                                >
                                    CONSULTA DE DOCUMENTOS PAGOS
                                </h3>
                            </div>

                            {/* Filtros de fecha */}
                            <div className="grid md:grid-cols-2 gap-6 mt-6">
                                <AnimatedInput
                                    label="Fecha de Inicio"
                                    name="fechaInicio"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                    type="date"
                                    darkMode={theme === 'dark'}
                                />
                                <AnimatedInput
                                    label="Fecha Final"
                                    name="fechaFin"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                    type="date"
                                    darkMode={theme === 'dark'}
                                />
                            </div>

                            {/* Botones de consultar y limpiar */}
                            <div className="flex justify-center gap-4 mt-6">
                                <Button 
                                    title="Consultar" 
                                    onClick={handleConsultar}
                                    disabled={isLoading}
                                />
                                <Button 
                                    title="Limpiar" 
                                    onClick={handleLimpiar}
                                    disabled={isLoading}
                                />
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
                                    fetchDataForExcel={fetchDataForExcel}
                                    downloadButtonPosition="top"
                                />
                            </div>

                            <div className="flex flex-wrap justify-center gap-4 mt-6">
                          
                     
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