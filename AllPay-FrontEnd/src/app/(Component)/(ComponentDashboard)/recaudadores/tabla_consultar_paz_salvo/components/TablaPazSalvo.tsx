'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { usePazSalvos } from '@/app/(Component)/(ComponentDashboard)/recaudadores/consultar_paz_salvo/hooks/usePazSalvos';
import { PazSalvo } from '@/app/(Component)/(ComponentDashboard)/recaudadores/consultar_paz_salvo/models/types';
import Swal from 'sweetalert2';
import { formatNumberWithCommas } from '@/utils/formatters';

const TablaPazSalvo: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { theme } = useTheme();
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const token = (session as any)?.user?.tokens?.access;
    const [currentPage, setCurrentPage] = React.useState(1);
    const [itemsPerPage] = React.useState(10);
    const [retryCount, setRetryCount] = useState(0);
    const [showDebugInfo, setShowDebugInfo] = useState(false);
    const [noResultsFound, setNoResultsFound] = useState(false);

    const { pazSalvos, isLoading, error, noRecordsMessage, fechasConsulta, fetchPazSalvos } = usePazSalvos();

    useEffect(() => {
        if (!token) {
            console.log('No hay token disponible, redirigiendo...');
            router.push('/recaudadores/consultar_paz_salvo');
            return;
        }

        setNoResultsFound(false);

        const fechaInicio = searchParams.get('fechaInicio');
        const fechaFin = searchParams.get('fechaFin');

        console.log('Parámetros recibidos:', { fechaInicio, fechaFin });

        // Si ambas fechas están vacías, traer todos los paz y salvos
        if (!fechaInicio && !fechaFin) {
            console.log('Consultando todos los paz y salvos');
            fetchPazSalvos(token).then(() => {
                if (pazSalvos.length === 0 && !error && !noRecordsMessage) {
                    setNoResultsFound(true);
                }
            });
        } else {
            // Si al menos una fecha está presente, usar los parámetros
            fetchPazSalvos(token, {
                fecha_inicio: fechaInicio || '',
                fecha_fin: fechaFin || ''
            }).then(() => {
                if (pazSalvos.length === 0 && !error && !noRecordsMessage) {
                    setNoResultsFound(true);
                }
            });
        }
    }, [searchParams, token, retryCount]);

    useEffect(() => {
        if (!isLoading && pazSalvos.length === 0 && !error && !noRecordsMessage) {
            setNoResultsFound(true);
        } else {
            setNoResultsFound(false);
        }
    }, [pazSalvos, isLoading, error, noRecordsMessage]);

    // Mostrar SweetAlert para mensajes de no registros
    useEffect(() => {
        if (noRecordsMessage) {
            Swal.fire({
                title: "Sin resultados",
                text: noRecordsMessage,
                icon: "info",
                confirmButtonColor: '#4D750F',
                timer: 5000,
                timerProgressBar: true
            });
        }
    }, [noRecordsMessage]);

    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
    };

    const formatDate = (value: string) => {
        const fecha = new Date(value);
        return fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const columns = [
        {
            key: 'nro_paz_y_salvo',
            label: 'Nº Paz y Salvo',
            render: (value: string) => value
        },
        {
            key: 'fecha_generacion',
            label: 'Fecha de Generación',
            render: (value: string) => formatDate(value)
        },
        {
            key: 'tipo_paz_y_salvo',
            label: 'Tipo',
            render: (value: string) => value
        },
        {
            key: 'total_kilos_paz_y_salvo',
            label: 'Total Kilos',
            render: (value: number) => formatNumberWithCommas(value.toString())
        },
        {
            key: 'razon_social',
            label: 'Razón Social',
            render: (value: string) => value
        },
        {
            key: 'nro_doc_id',
            label: 'Documento ID',
            render: (value: number) => value.toString()
        }
    ];

    const actions = [
        {
            label: 'Ver Documento',
            render: (row: PazSalvo) => (
                <a
                    href={typeof row.doc_paz_y_salvo === 'number' ? String(row.doc_paz_y_salvo) : row.doc_paz_y_salvo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                >
                    Ver PDF
                </a>
            )
        }
    ];

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const getCurrentPageData = () => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return pazSalvos.slice(startIndex, endIndex);
    };
    
    const renderFechasConsulta = () => {
        if (!fechasConsulta) return null;
        
        let mensaje = '';
        if (fechasConsulta.inicio && fechasConsulta.fin) {
            mensaje = `del ${fechasConsulta.inicio} al ${fechasConsulta.fin}`;
        } else if (fechasConsulta.inicio) {
            mensaje = `desde ${fechasConsulta.inicio}`;
        } else if (fechasConsulta.fin) {
            mensaje = `hasta ${fechasConsulta.fin}`;
        } else {
            mensaje = "todos los registros";
        }
        
        return (
            <div className="mt-2 text-center text-sm">
                <span>Mostrando paz y salvos {mensaje}</span>
            </div>
        );
    };

    const toggleDebugInfo = () => {
        setShowDebugInfo(!showDebugInfo);
    };

    const renderDebugInfo = () => {
        if (!showDebugInfo) return null;

        // Construir la URL completa exactamente como en Postman
        const baseUrl = process.env.BASE_API_URL || 'http://15.228.164.46/api/';
        const endpoint = 'cartera/paz-salvo-lista/';
        const queryParams = new URLSearchParams();
        queryParams.append('fecha_inicio', fechasConsulta?.inicio || '');
        queryParams.append('fecha_fin', fechasConsulta?.fin || '');
        const completeUrl = `${baseUrl}${endpoint}?${queryParams.toString()}`;

        const copyToClipboard = (text: string) => {
            navigator.clipboard.writeText(text)
                .then(() => alert('URL copiada al portapapeles'))
                .catch(err => console.error('Error al copiar:', err));
        };

        return (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md text-sm font-mono overflow-auto max-h-60">
                <p className="font-bold mb-2">Información de diagnóstico:</p>
                <div className="flex items-center space-x-2">
                    <p className="truncate">URL completa: {completeUrl}</p>
                    <button 
                        onClick={() => copyToClipboard(completeUrl)}
                        className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                    >
                        Copiar
                    </button>
                </div>
                <p>URL base API: {process.env.BASE_API_URL || 'http://15.228.164.46/api/'}</p>
                <p>NODE_ENV: {process.env.NODE_ENV}</p>
                <p>Token presente: {token ? 'Sí' : 'No'}</p>
                {token && <p>Token (primeros 10 caracteres): {token.substring(0, 10)}...</p>}
                <p>Fecha inicio: {fechasConsulta?.inicio || 'No especificada'}</p>
                <p>Fecha fin: {fechasConsulta?.fin || 'No especificada'}</p>
                <p>Número de intentos: {retryCount}</p>
                <p>Error: {error || 'Ninguno'}</p>
                <p>Mensaje no registros: {noRecordsMessage || 'Ninguno'}</p>
            </div>
        );
    };

    const renderError = () => {
        // Solo mostrar el componente de error si hay un error real (no un mensaje de "no hay registros")
        if (!error) return null;
        
        // Construir la URL completa para diagnóstico con formato idéntico a Postman
        const baseUrl = process.env.BASE_API_URL || 'http://15.228.164.46/api/';
        const endpoint = 'cartera/paz-salvo-lista/';
        const queryParams = new URLSearchParams();
        queryParams.append('fecha_inicio', fechasConsulta?.inicio || '');
        queryParams.append('fecha_fin', fechasConsulta?.fin || '');
        const completeUrl = `${baseUrl}${endpoint}?${queryParams.toString()}`;
        
        // Permitir probar la URL directamente
        const testUrlDirectly = () => {
            window.open(completeUrl, '_blank');
        };
        
        return (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md text-center">
                <p className="font-semibold">{error}</p>
                <div className="mt-2">
                    <p className="text-sm">
                        {error.includes('Error 404') || error.includes('no existe') ? 
                            'Esto puede deberse a un problema con la dirección del endpoint. El servidor podría no tener habilitado este recurso.' : 
                            error.includes('conexión') ? 
                                'Compruebe su conexión a internet y que el servidor esté funcionando correctamente.' : 
                                'Se ha producido un error al intentar obtener los datos.'}
                    </p>
                    <div className="mt-4 flex justify-center space-x-4">
                        <button 
                            onClick={handleRetry}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                            Reintentar conexión
                        </button>
                        <button 
                            onClick={testUrlDirectly}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                            Probar URL directamente
                        </button>
                        <button 
                            onClick={toggleDebugInfo}
                            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                        >
                            {showDebugInfo ? 'Ocultar diagnóstico' : 'Mostrar diagnóstico'}
                        </button>
                    </div>
                </div>
                {renderDebugInfo()}
            </div>
        );
    };

    return (
        <div className="w-full">
            <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
                <div className="w-full p-1">
                    <div className={`m-auto w-full rounded-xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                        <div className={`rounded-xl p-4 ${theme === 'dark' ? 'dark' : 'bg-white'} relative`}>
                            <button
                                onClick={() => router.push('/recaudadores/consultar_paz_salvo')}
                                className="absolute top-2 right-4 text-2xl hover:text-red-700 text-[rgb(var(--brown))]"
                            >
                                &times;
                            </button>

                            <div className="relative flex flex-col justify-center items-center mt-[39px]">
                                <h3 className={`text-center text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                                    Resultados de Paz y Salvos
                                </h3>
                                {renderFechasConsulta()}
                            </div>

                            {/* Solo renderizar el componente de error si hay un error y no es por falta de datos */}
                            {error && renderError()}

                            <div className="mt-6">
                                {isLoading ? (
                                    <div className="flex justify-center items-center p-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#78390e]"></div>
                                        <span className="ml-2 text-[#78390e]">Cargando...</span>
                                    </div>
                                ) : pazSalvos.length > 0 ? (
                                    <DynamicTable
                                        columns={columns}
                                        data={getCurrentPageData()}
                                        currentPage={currentPage}
                                        totalPages={Math.ceil(pazSalvos.length / itemsPerPage)}
                                        onPageChange={handlePageChange}
                                        actions={actions}
                                        isLoading={isLoading}
                                    />
                                ) : noRecordsMessage || noResultsFound ? (
                                    <div className="flex justify-center items-center p-8 flex-col">
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4 text-center">
                                            <p className="text-lg text-yellow-700">
                                                {noRecordsMessage || "No se encontraron registros que coincidan con los criterios de búsqueda."}
                                            </p>
                                            <p className="text-sm text-yellow-600 mt-2">
                                                Intente modificando los filtros de fecha o consulte sin especificar fechas para ver todos los registros disponibles.
                                            </p>
                                        </div>
                                        <div className="mt-2 flex space-x-4">
                                            <button 
                                                onClick={() => router.push('/recaudadores/consultar_paz_salvo')}
                                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                                            >
                                                Volver a la consulta
                                            </button>
                                            <button
                                                onClick={toggleDebugInfo}
                                                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
                                            >
                                                {showDebugInfo ? 'Ocultar diagnóstico' : 'Mostrar diagnóstico'}
                                            </button>
                                        </div>
                                        {showDebugInfo && renderDebugInfo()}
                                    </div>
                                ) : null}
                            </div>

                            <div className="flex justify-center gap-4 mt-6">
                                <Button
                                    onClick={() => router.push('/recaudadores/consultar_paz_salvo')}
                                    title="Volver"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TablaPazSalvo; 