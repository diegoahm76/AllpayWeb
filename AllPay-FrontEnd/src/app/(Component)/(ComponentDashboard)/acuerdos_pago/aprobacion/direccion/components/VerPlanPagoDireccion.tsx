'use client'

// react
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback, useRef } from 'react';

// utils
import { formatCurrency } from '@/utils/formatters'
import { formatearFechaDMY } from '@/utils/dateUtils'

// ui
import AnimatedInput from "@/presenters/components/ui/AnimatedInput";
import DynamicTable from "@/presenters/components/ui/DynamicTable";
import { Button } from "@/presenters/components/ui/AnimatedButton";
import { IconButton } from "@mui/material";
import { FileDownload, Visibility } from "@mui/icons-material";
import ModalContainer from "@/presenters/components/ui/ModalContainer";

// notifications
import AlertQuestion from "@/presenters/components/recaudadores/AlertQuestion";
import AlertError from "@/presenters/components/recaudadores/AlertError";
import AlertLoader from "@/presenters/components/recaudadores/AlertLoader";
import AlertSuccess from "@/presenters/components/recaudadores/AlertSuccess";
import { InternalUserInfo, RecaudadorData, InternalUserInfoRef } from "@/presenters/components/recaudadores/InternalUserInfo";

// components
import AprobarPlanPagoDireccion from "@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/direccion/components/AprobarPlanPagoDireccion";

// hooks
import { useObtenerPPDireccion } from "@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/direccion/hooks/useObtenerPPDireccion";
import { useGenerarYDescargarDocumento } from "@/application/documento/useGenerar&DescargarDocumento";
import { useConsultarDatosDocumentoPlanesPago } from "@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/direccion/hooks/useConsultarDatosDocumentoPlanesPagoAprobacionDireccion";

export default function VerPlanPagoDireccion() {
    
    const { theme } = useTheme();
    const router = useRouter();
    const { data: session } = useSession();
    const valueSesion: any = session;
    const token = (session as any)?.user?.tokens?.access;
    const [mounted, setMounted] = useState(false);
    const [isInternalUser, setIsInternalUser] = useState<boolean | null>(null);
    const [isAlertQuestion, setIsAlertQuestion] = useState(false);
    const [alertQuestionText, ] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [idRecaudador, setIdRecaudador] = useState<number | null>(null);
    const [, setNumeroDocumentoRecaudador] = useState<string | null>(null);
    const [, setShowAccessError] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedSolicitud, setSelectedSolicitud] = useState<string | null>(null);
    const [selectedNroSolicitud, setSelectedNroSolicitud] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    // Referencia para el componente InternalUserInfo
    const internalUserInfoRef = useRef<InternalUserInfoRef>(null);

    const {
        loading,
        error,
        data,
        page,
        totalPages,
        setPage,
        //filters,
        setFilters,
        refetch,
        fetchAllData,
        fetchData
    } = useObtenerPPDireccion(token, 1, 10, true); // shouldFetch = true para hacer petición automática

    const [variables, setVariables] = useState<any>({});

    useEffect(() => {
        if (!valueSesion?.user?.tipo_usuario) return;
        if (valueSesion.user.tipo_usuario === 'I') {
            setIsInternalUser(true);
        } else if (valueSesion.user.tipo_usuario === 'E') {
            setIsInternalUser(false);
            setShowAccessError(true);
        }
    }, [valueSesion?.user?.tipo_usuario]);

    const handleFilter = useCallback(() => {
        setPage(1);
        const newFilters = {
            fecha_desde: fechaInicio || undefined,
            fecha_hasta: fechaFin || undefined,
            nro_solicitud: undefined,
            estado: undefined,
            id_persona_solicita: idRecaudador?.toString() || undefined // Incluir recaudador solo si existe
        };
        setFilters(newFilters);
        fetchData(1, newFilters); // Hacer la petición manualmente con los filtros
    }, [fechaInicio, fechaFin, idRecaudador, setPage, setFilters, fetchData]);

    const {
        error: errorDocPlanesPago,
        fetchDatosDocumento,
        clearError: clearErrorDocPlanesPago
    } = useConsultarDatosDocumentoPlanesPago(token, isInternalUser);

    const {
        loadingDoc: loadingDocAcuerdoPago,
        success: successAcuerdoPago,
        successText: successTextAcuerdoPago,
        isAlertError: isAlertErrorAcuerdoPago,
        alertErrorText: alertErrorTextAcuerdoPago,
        setSuccess: setSuccessAcuerdoPago,
        setIsAlertError: setIsAlertErrorAcuerdoPago,
        triggerGenerarDocumento,
        idPlantilla
    } = useGenerarYDescargarDocumento({
        token: token || '',
        nombrePlantilla: 'Consulta Acuerdo Pago',
        variables: variables
    });

    const handleClear = useCallback(() => {
        setFechaInicio('');
        setFechaFin('');
        setIdRecaudador(null);
        setNumeroDocumentoRecaudador(null);
        setFilters({});
        fetchData(1, {}); // Recargar con filtros vacíos
        
        // Limpiar también los campos del componente InternalUserInfo
        internalUserInfoRef.current?.clearForm();
    }, [setFilters, fetchData]);

    const handleFoundCollector = useCallback((numero_documento: string) => {
        setNumeroDocumentoRecaudador(numero_documento);
        // No hacer petición automática aquí, esperar a que se haga búsqueda manual
    }, []);

    const handleRecaudadorData = useCallback((recaudadorData: RecaudadorData) => {
        if (recaudadorData.id_persona) {
            setIdRecaudador(recaudadorData.id_persona);
            // Hacer petición automática cuando se encuentra un recaudador
            const newFilters = {
                fecha_desde: fechaInicio || undefined,
                fecha_hasta: fechaFin || undefined,
                id_persona_solicita: recaudadorData.id_persona.toString()
            };
            setFilters(newFilters);
            fetchData(1, newFilters);
        }
    }, [fechaInicio, fechaFin, setFilters, fetchData]);

    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage);
    }, [setPage]);

    const tableData = React.useMemo(() => {
        if (!data || data.length === 0) {
            return [];
        }
        return data.map((item: any) => ({
            id_plan_pago: item.id_plan_pago,
            id_solicitud: item.id_solicitud,
            numero_solicitud: item.nro_solicitud,
            fecha_solicitud: formatearFechaDMY(new Date(item.fecha_solicitud)),
            estado: item.estado_display || item.estado,
            estado_plan_pago: item.estado_plan_pago_display || 'Pendiente',
            nit_recaudador: item.numero_documento,
            total_pagar: formatCurrency(item.valor_a_pagar),
            observaciones: item.observaciones
        }));
    }, [data, isDarkMode, router]);

    const columns = [
        {
            key: 'numero_solicitud',
            label: 'NUMERO SOLICITUD',
            render: (value: any) => value
        },
        {
            key: 'fecha_solicitud',
            label: 'FECHA DE SOLICITUD',
            render: (value: any) => value
        },
        {
            key: 'estado',
            label: 'ESTADO SOLICITUD',
            render: (value: any) => value
        },
        {
            key: 'estado_plan_pago',
            label: 'ESTADO PLAN DE PAGO',
            render: (value: any) => value
        },
        {
            key: 'nit_recaudador',
            label: 'NIT RECAUDADOR',
            render: (value: any) => value
        },
        {
            key: 'total_pagar',
            label: 'TOTAL A PAGAR',
            render: (value: any) => value
        },
        {
            key: 'observaciones',
            label: 'OBSERVACIONES',
            render: (value: any) => value
        },

    ];

    const showGlobalLoader = isInternalUser === null || (loading && data.length === 0);

    const handleOpenModal = (id: string, nroSolicitud: string) => {
        setSelectedSolicitud(id);
        setSelectedNroSolicitud(nroSolicitud);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedSolicitud(null);
        setSelectedNroSolicitud(null);
    };

    const handleSuccess = () => {
        refetch(); // Actualizar la tabla después de aprobar
    };

    const handleGenerarDocumento = useCallback(async (id: number | string) => {
        try {
            const responseDatosDocumentoAcuerdoPago = await fetchDatosDocumento(id);

            const variables = {
                Ndocumento: responseDatosDocumentoAcuerdoPago?.recaudador.numero_documento_recaudador,
                valortotalap: formatCurrency(responseDatosDocumentoAcuerdoPago?.valor_total.valor_a_pagar),
                telrecuadador: responseDatosDocumentoAcuerdoPago?.recaudador.telefono_recaudador,
                DIRECCIONRECAUDADOR: responseDatosDocumentoAcuerdoPago?.recaudador.direccion_recaudador,
                NOMBRERECAUDADOR: responseDatosDocumentoAcuerdoPago?.recaudador.nombre_recaudador,
                nsolicitudap: responseDatosDocumentoAcuerdoPago?.detalle_plan_pago[0].nro_solicitud,
                items: responseDatosDocumentoAcuerdoPago?.detalle_plan_pago.map((item: any) => ({
                    nfechasol: formatearFechaDMY(new Date(item.fecha_solicitud)),
                    estadosol: item.estado,
                    nplan: item.numero_plan_pago,
                    ncuotas: item.numero_cuota,
                    fpago: formatearFechaDMY(new Date(item.fecha_pago)) || '',
                    nfactura : item.Nro_factura,
                    valfacturaunica : formatCurrency(item.valor_factura)
                }))
            };

            setVariables(variables);
            triggerGenerarDocumento();

        } catch (error) {
            console.error('Error al consultar datos del documento:', error);
            setIsAlertErrorAcuerdoPago(true);
        }
    }, [fetchDatosDocumento, setIsAlertErrorAcuerdoPago, triggerGenerarDocumento]);

    if (!mounted) {
        return null;
    }

    return (
        showGlobalLoader ? (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[rgb(var(--green))]" />
            </div>
        ) : (
            <div>
                <AlertSuccess
                    isOpen={successAcuerdoPago}
                    message={successTextAcuerdoPago}
                    onClose={() => setSuccessAcuerdoPago(false)}
                />

                <AlertError
                    isOpen={isAlertErrorAcuerdoPago || Boolean(errorDocPlanesPago)}
                    message={alertErrorTextAcuerdoPago || errorDocPlanesPago || ""}
                    onClose={() => {
                        setIsAlertErrorAcuerdoPago(false);
                        clearErrorDocPlanesPago();
                    }}
                />

                <AlertQuestion
                    isOpen={isAlertQuestion}
                    questionText={alertQuestionText}
                    onClose={() => setIsAlertQuestion(false)}
                    onConfirm={() => setIsAlertQuestion(true)}
                />

                <AlertLoader
                    isOpen={loadingDocAcuerdoPago}                               
                    loadingText="Generando documento, por favor espere…"
                />

                {showModal && selectedSolicitud && (
                    <ModalContainer 
                        isOpen={showModal} 
                        onClose={handleCloseModal}
                        size="3xl"
                    >
                        <AprobarPlanPagoDireccion 
                            idSolicitud={selectedSolicitud}
                            nroSolicitud={selectedNroSolicitud || ''}
                            onClose={handleCloseModal}
                            onSuccess={handleSuccess}
                        />
                    </ModalContainer>
                )}

                <div className="w-full max-w-full mx-auto">
                    <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                        
                        <div className={`rounded-xl p-6 relative ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>

                            <button
                                onClick={() => router.push('/')}
                                className={`absolute top-2 right-4 text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
                            >
                                &times;
                            </button>

                            <h1 className={`text-xl sm:text-2xl lg:text-3xl mt-6 font-bold text-center ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>APROBACIÓN DE ACUERDOS DE PAGO - ÁREA DE RECAUDO GERENCIA</h1>

                            <h3 className={`text-lg mt-6 font-bold ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                Búsqueda por Recaudador
                            </h3>
                            
                            <InternalUserInfo 
                                ref={internalUserInfoRef}
                                onFoundCollector={handleFoundCollector} 
                                onRecaudadorFound={handleRecaudadorData} 
                            />

                        </div>

                        <div className={`rounded-xl p-6 mt-6 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>

                            <h3 className={`text-lg mt-2 font-bold ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                Búsqueda por Fecha
                            </h3>

                            <div className="flex flex-col md:flex-row items-start md:items-end space-y-4 md:space-y-0 md:space-x-4 mt-4">
                                <div className="flex flex-col space-y-4 md:w-1/2  w-full">
                                    <AnimatedInput
                                        label="Fecha de Inicio"
                                        name="fecha_desde"
                                        value={fechaInicio}
                                        type="date"
                                        onChange={(e) => setFechaInicio(e.target.value)}
                                        darkMode={isDarkMode}
                                    />
                                </div>
                                <div className="flex flex-col space-y-4 md:w-1/2  w-full">
                                    <AnimatedInput
                                        label="Fecha de Fin"
                                        name="fecha_hasta"
                                        value={fechaFin}
                                        type="date"
                                        onChange={(e) => setFechaFin(e.target.value)}
                                        darkMode={isDarkMode}
                                    />
                                        </div>        

                            </div>

                            
                            <div className="flex justify-center items-center self-center mt-4 space-x-4 ">
                                    <Button
                                        title="Buscar"
                                        onClick={handleFilter}
                                    />
                                    <Button
                                        title="Limpiar"
                                        onClick={handleClear}
                                    />
                                </div>
                        </div>

                        <div className={`rounded-xl p-6 mt-6 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>

                            <h3 className={`text-xl sm:text-2xl lg:text-3xl my-6 text-center font-bold ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                APROBAR PLAN DE PAGOS - ACUERDOS DE PAGO 
                            </h3>

                            {loading && data.length === 0 && (
                                <div className={`text-center py-4 ${isDarkMode ? 'text-white' : ''}`}>Cargando registros…</div>
                            )}

                            {error && (
                                <div className={`text-center py-8 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{error}</div>
                            )}

                            {!loading && !error && data.length === 0 && (
                                <div className={`text-center py-8 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                                    <p>No se encontraron solicitudes de aprobación</p>
                                    {idRecaudador && (
                                        <p className="text-sm mt-2">Intente ajustar los filtros de fecha o seleccione otro recaudador</p>
                                    )}
                                </div>
                            )}

                            {!loading && !error && data.length > 0 && (
                                <DynamicTable
                                    columns={columns}
                                    data={tableData}
                                    actions={[
                                        {
                                            label: 'Acciones',
                                            render: (row) => (
                                                <div className="flex gap-2">
                                                    <IconButton
                                                        onClick={() => {
                                                            router.push(`/acuerdos_pago/aprobacion/direccion/detalles?id=${row.id_solicitud}`);
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
                                                        <Visibility />
                                                    </IconButton>

                                                    <IconButton
                                                        onClick={() => handleOpenModal(row.id_plan_pago, row.numero_solicitud)}
                                                        sx={{
                                                            color: isDarkMode ? '#fff' : '#4D750F',
                                                            '&:hover': {
                                                                backgroundColor: isDarkMode
                                                                    ? 'rgba(255, 255, 255, 0.1)'
                                                                    : 'rgba(77, 117, 15, 0.1)'
                                                            }
                                                        }}
                                                    >
                                                        <img
                                                            src="/images/icons/accept.png"
                                                            alt="Aprobar"
                                                            className="h-5 w-5 cursor-pointer"
                                                        />
                                                    </IconButton>
                                                    
                                                    <IconButton
                                                        onClick={() => {
                                                            handleGenerarDocumento(row.id_solicitud);
                                                        }}
                                                        disabled={!idPlantilla}
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
                                                   
                                                </div>
                                                
                                            )
                                        }
                                    ]}
                                    currentPage={page}
                                    totalPages={totalPages}
                                    onPageChange={handlePageChange}
                                    fetchAllData={fetchAllData}
                                    isLoading={loading}
                                />
                            )}

                            <div className="flex justify-end mt-4 space-x-4 ">
                                <Button
                                    title="Salir"
                                    onClick={() => router.push('/')}
                                />
                            </div>
                        </div>
              
                    </div>
                </div>   
            </div>
        )
    );
}
