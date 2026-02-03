'use client'

// react
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback } from 'react';

// utils
import { formatCurrency } from '@/utils/formatters'
import { formatearFechaDMY } from '@/utils/dateUtils'

// ui
import AnimatedInput from "@/presenters/components/ui/AnimatedInput";
import DynamicTable from "@/presenters/components/ui/DynamicTable";
import { Button } from "@/presenters/components/ui/AnimatedButton";
import { IconButton } from "@mui/material";
import { FileDownload, Visibility } from "@mui/icons-material";

// notifications
import AlertQuestion from "@/presenters/components/recaudadores/AlertQuestion";
import AlertError from "@/presenters/components/recaudadores/AlertError";
import AlertLoader from "@/presenters/components/recaudadores/AlertLoader";
import AlertSuccess from "@/presenters/components/recaudadores/AlertSuccess";
import { InternalUserInfo } from "@/presenters/components/recaudadores/InternalUserInfo";

// hooks
import { useSolicitudesLiquidacion } from "@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/hooks/useSolicitudesLiquidacion";
import { useDocumentoPlanesPago } from "@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/hooks/useDocumentoPlanesPago";
import { useGenerarYDescargarDocumento } from "@/application/documento/useGenerar&DescargarDocumento";
import { ExternalUserInfo } from "@/presenters/components/recaudadores/ExternalUserInfo";

export default function VerPPSinLiquidar() {
    
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
    const [, setNumeroDocumentoRecaudador] = useState<string | null>(null);
    const [variables, setVariables] = useState<any>({});   
    const [, setShowAccessError] = useState(false);
    const [selectedSolicitudId, setSelectedSolicitudId] = useState<number | string | null>(null);

    // Hook para obtener datos del documento de planes de pago
    const {
        loading: loadingDocumentoPP,
        error: errorDocumentoPP,
        data: datosDocumentoPP,
        //refetch: refetchDocumentoPP
    } = useDocumentoPlanesPago(token || '', selectedSolicitudId, isInternalUser || false);

    const handleGenerarDocumento = useCallback((id: number | string) => {
        setSelectedSolicitudId(id);
    }, []);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!valueSesion?.user?.tipo_usuario) return;
        if (valueSesion.user.tipo_usuario === 'I') {
            setIsInternalUser(true);
        } else if (valueSesion.user.tipo_usuario === 'E') {
            setIsInternalUser(false);
            setShowAccessError(true);
        }
    }, [valueSesion?.user?.tipo_usuario]);

    const isDarkMode = mounted && theme === 'dark';

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

    // useEffect para generar el documento cuando los datos estén listos
    useEffect(() => {
        if (datosDocumentoPP && selectedSolicitudId) {
            try {
                const variables = {
                    Ndocumento: datosDocumentoPP.recaudador.numero_documento_recaudador,
                    valortotalap: formatCurrency(datosDocumentoPP.valor_total.valor_a_pagar),
                    telrecuadador: datosDocumentoPP.recaudador.telefono_recaudador,
                    DIRECCIONRECAUDADOR: datosDocumentoPP.recaudador.direccion_recaudador,
                    NOMBRERECAUDADOR: datosDocumentoPP.recaudador.nombre_recaudador,
                    nsolicitudap: datosDocumentoPP.detalle_plan_pago[0]?.nro_solicitud,
                    items: datosDocumentoPP.detalle_plan_pago.map((item) => ({
                        nfechasol: formatearFechaDMY(new Date(item.fecha_solicitud)),
                        estadosol: item.estado,
                        nplan: item.numero_plan_pago,
                        ncuotas: item.numero_cuota,
                        fpago: formatearFechaDMY(new Date(item.fecha_pago)) || '',
                        nfactura: item.Nro_factura,
                        valfacturaunica: formatCurrency(item.valor_factura)
                    }))
                };

                setVariables(variables);
                triggerGenerarDocumento();
                
                // Limpiar el ID seleccionado después de procesar
                setSelectedSolicitudId(null);
            } catch (error) {
                console.error('Error al procesar datos del documento:', error);
                setIsAlertErrorAcuerdoPago(true);
                setSelectedSolicitudId(null);
            }
        }
    }, [datosDocumentoPP, selectedSolicitudId, setIsAlertErrorAcuerdoPago, triggerGenerarDocumento]);

    // useEffect para manejar errores del documento
    useEffect(() => {
        if (errorDocumentoPP && selectedSolicitudId) {
            console.error('Error al obtener datos del documento:', errorDocumentoPP);
            setIsAlertErrorAcuerdoPago(true);
            setSelectedSolicitudId(null);
        }
    }, [errorDocumentoPP, selectedSolicitudId, setIsAlertErrorAcuerdoPago]);

    const {
        loading: acuerdosLoading,
        error: acuerdosError,
        data: acuerdosData,
        page,
        totalPages,
        setPage,
        //filters,
        setFilters,
        //refetch,
        fetchAllData
    } = useSolicitudesLiquidacion(token || '', 1, 10, isInternalUser);

    const handleFilter = useCallback(() => {
        setPage(1);
        setFilters({
            fecha_desde: fechaInicio || undefined,
            fecha_hasta: fechaFin || undefined
        });
    }, [fechaInicio, fechaFin, setPage, setFilters]);

    const handleClear = useCallback(() => {
        setFechaInicio('');
        setFechaFin('');
        setNumeroDocumentoRecaudador(null);
        setFilters({
            fecha_desde: undefined,
            fecha_hasta: undefined
        });
    }, [setFilters]);

    const handleFoundCollector = useCallback((numero_documento: string) => {
        setNumeroDocumentoRecaudador(numero_documento);
        setPage(1);
    }, [setPage]);

    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage);
    }, [setPage]);

    const tableData = React.useMemo(() => {
        if (!acuerdosData || acuerdosData.length === 0) {
            return [];
        }

        return acuerdosData.map((item) => ({
            id_solicitud_acuerdo_pago: item.id_solicitud_acuerdo_pago || item.id_solicitud,
            numero_solicitud: item.nro_solicitud,
            fecha_solicitud: formatearFechaDMY(new Date(item.fecha_solicitud)),
            estado: item.estado_display,
            estado_plan_pago_display: item.estado_plan_pago_display,
            nit_recaudador: item.numero_documento,
            total_pagar: isInternalUser 
                ? formatCurrency(item.valor_a_pagar || 0)
                : formatCurrency(item.valor_total_pagar || 0),
            observaciones: item.observaciones
        }));
    }, [acuerdosData]);

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
            label: 'ESTADO DE SOLICITUD',
            render: (value: any) => value
        },
        {
            key: 'estado_plan_pago_display',
            label: 'ESTADO DE PLAN DE PAGOS',
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

    const showGlobalLoader = isInternalUser === null || (acuerdosLoading && acuerdosData.length === 0);

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
                    isOpen={isAlertErrorAcuerdoPago}
                    message={alertErrorTextAcuerdoPago}
                    onClose={() => setIsAlertErrorAcuerdoPago(false)}
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

                <div className="w-full max-w-full mx-auto">
                    <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                        
                        <div className={`rounded-xl p-6 relative ${isDarkMode ? 'dark' : 'bg-white'}`}>

                            <button
                                onClick={() => router.push('/')}
                                className={`absolute top-2 right-4 text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
                            >
                                &times;
                            </button>

                            <h1 className={`text-xl sm:text-2xl lg:text-3xl my-6 font-bold text-center ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>LIQUIDACIÓN DE ACUERDOS DE PAGO - ÁREA DE RECAUDO</h1>

                            <h3 className={`text-lg mt-6 font-bold ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                Búsqueda por Recaudador
                            </h3>

                            {isInternalUser ? (
                                <InternalUserInfo onFoundCollector={handleFoundCollector} />
                            ) : (
                                <ExternalUserInfo />
                            )}
                            

                        </div>

                        <div className={`rounded-xl p-6 mt-6 ${isDarkMode ? 'dark' : 'bg-white'}`}>

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

                        <div className={`rounded-xl p-6 mt-6 ${isDarkMode ? 'dark' : 'bg-white'}`}>

                            <h3 className={`text-xl sm:text-2xl lg:text-3xl mt-6 text-center mb-6 font-bold ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                                LIQUIDAR PLAN DE PAGOS - ACUERDOS DE PAGO
                            </h3>

                            {acuerdosLoading && acuerdosData.length > 0 && (
                                <div className={`text-center py-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Cargando registros…</div>
                            )}
                            {acuerdosError && (
                                <div className="text-center text-red-600 py-8">{acuerdosError}</div>
                            )}
                            {!acuerdosLoading && !acuerdosError && (
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
                                                            router.push(`/acuerdos_pago/liquidacion/detalles?id=${row.id_solicitud_acuerdo_pago}`);
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
                                                        onClick={() => handleGenerarDocumento(row.id_solicitud_acuerdo_pago)}
                                                        disabled={!idPlantilla || loadingDocumentoPP}
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
                                    isLoading={acuerdosLoading}
                                    fetchAllData={fetchAllData}
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
