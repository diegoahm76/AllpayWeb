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
import AnimatedSelect from "@/presenters/components/ui/AnimatedSelect";
import DynamicTable from "@/presenters/components/ui/DynamicTable";
import { Button } from "@/presenters/components/ui/AnimatedButton";
import { IconButton } from "@mui/material";
import { FileDownload, Visibility } from "@mui/icons-material";
import ModalContainer from '@/presenters/components/ui/ModalContainer';

// notifications
import AlertQuestion from "@/presenters/components/recaudadores/AlertQuestion";
import AlertError from "@/presenters/components/recaudadores/AlertError";
import AlertLoader from "@/presenters/components/recaudadores/AlertLoader";
import AlertSuccess from "@/presenters/components/recaudadores/AlertSuccess";

// consulta acuerdos de pago
import { useConsultaAcuerdoPago } from "@/application/acuerdos_pago/useConsultaAcuerdoPago";
import { useGenerarYDescargarDocumento } from '@/application/documento/useGenerar&DescargarDocumento';
import ConsultRequestPayment from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/components/consultarSolicitudPago';


import { InternalUserInfo } from "@/presenters/components/recaudadores/InternalUserInfo";
import { ExternalUserInfo } from "@/presenters/components/recaudadores/ExternalUserInfo";
import { useConsultarDatosDocumentoPlanesPago } from "@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/hooks/useConsultarDatosDocumentoPlanesPago";

// estados acuerdos de pago
import { useEstadosAcuerdoPago } from '@/application/estados/useEstadosAcuerdoPago';

export default function RequestPayment() {
    
    const { theme } = useTheme();
    const router = useRouter();

    const { data: session } = useSession();
    const token = (session as any)?.user?.tokens?.access;
    const valueSesion: any = session;

    const [mounted, setMounted] = useState(false);
    const [isInternalUser, setIsInternalUser] = useState<boolean | null>(null);
    const [localFilters, setLocalFilters] = useState({
        estado: '',
        nro_solicitud: '',
        fecha_desde: '',
        fecha_hasta: ''
    });
    const [openModal, setOpenModal] = useState(false);
    const [selectedRow, setSelectedRow] = useState<any | null>(null);
    const [isAlertQuestion, setIsAlertQuestion] = useState(false);
    const [alertQuestionText, ] = useState('');
    const [variables, setVariables] = useState<any>({});

    const [, setNumeroDocumentoRecaudador] = useState<string | null>(null);

    const {
        loading: acuerdosLoading, error: acuerdosError, data: acuerdosData = [], page, totalPages,
        setPage, setFilters, fetchAllData
    } = useConsultaAcuerdoPago(token, isInternalUser);
    
    // consultar datos documento planes pago
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

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!valueSesion?.user?.tipo_usuario) return;
        if (valueSesion.user.tipo_usuario === 'I') {
            setIsInternalUser(true);
        } else if (valueSesion.user.tipo_usuario === 'E') {
            setIsInternalUser(false);
        }
    }, [valueSesion?.user?.tipo_usuario]);

    const isDarkMode = mounted && theme === 'dark';

    const showGlobalLoader =
        isInternalUser === null ||
        (acuerdosLoading && acuerdosData.length === 0);

    const handleFilter = useCallback(() => {
        setPage(1);
        setFilters({
            ...localFilters,
            estado: localFilters.estado || undefined,
            nro_solicitud: localFilters.nro_solicitud || undefined,
            fecha_desde: localFilters.fecha_desde || undefined,
            fecha_hasta: localFilters.fecha_hasta || undefined
        });
    }, [localFilters]);

    const handleClear = useCallback(() => {
        setLocalFilters(prev => ({
            ...prev,
            nro_solicitud: '',
            fecha_desde: '',
            fecha_hasta: '',
            estado: ''
        }));
        setFilters({
            ...localFilters,
            nro_solicitud: undefined,
            fecha_desde: undefined,
            fecha_hasta: undefined,
            estado: ''
        });
    }, [localFilters]);

    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage);
    }, []);

    const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setLocalFilters(prev => ({ ...prev, [name]: value }));
    }, []);

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

    const { estados, loading: loadingEstados, error: errorEstados } = useEstadosAcuerdoPago(token);

    const tableData = React.useMemo(() => {
        if (!acuerdosData || acuerdosData.length === 0) {
            return [];
        }

        return acuerdosData.map((item: any) => {
            return {
                id_solicitud_acuerdo_pago: item.id_solicitud_acuerdo_pago,
                numero_solicitud: item.nro_solicitud,
                fecha_solicitud: item.fecha_solicitud,
                estado: item.estado_display || item.estado,
                estado_plan_pago_display: item.estado_plan_pago_display || 'Pendiente',
                nit_recaudador: item.numero_documento || (item.recaudador?.numero_documento ?? ''),
                total_pagar: item.valor_total_pagar,
                observacion: item.observaciones,
                acciones: (
                    <div>
                        <IconButton
                            onClick={() => {
                                setSelectedRow(item);
                                setOpenModal(true);
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
                            onClick={() => { handleGenerarDocumento(item.id_solicitud_acuerdo_pago); }}
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
            };
        });
    }, [acuerdosData, isDarkMode, handleGenerarDocumento, idPlantilla]);

    const columns = React.useMemo(() => [
        {
            key: "numero_solicitud",
            label: "NÚMERO DE SOLICITUD",
        },
        {
            key: "fecha_solicitud",
            label: "FECHA DE SOLICITUD",
            render: (value: string) => formatearFechaDMY(new Date(value))
        },
        {
            key: "estado",
            label: "ESTADO SOLICITUD",
        },
        {
            key: "estado_plan_pago_display",
            label: "ESTADO PLAN DE PAGO",
        },
        {
            key: "nit_recaudador",
            label: "NIT RECAUDADOR",
        },
        {
            key: "total_pagar",
            label: "TOTAL A PAGAR",
            render: (value: number) => formatCurrency(value)
        },
        {
            key: "observacion",
            label: "OBSERVACIÓN",
        },
    ], []);

    const actions = React.useMemo(() => [
        {
            label: 'Ver',
            render: (row: any) => (
                <IconButton
                    onClick={() => {
                        setSelectedRow(row);
                        setOpenModal(true);
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
            )
        },
        {
            label: 'Descargar',
            render: (row: any) => (
                <IconButton
                    onClick={() => { handleGenerarDocumento(row.id_solicitud_acuerdo_pago); }}
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
            )
        },
    ], [isDarkMode, handleGenerarDocumento, idPlantilla]);

    // Memoize the filter inputs
    const filterInputs = React.useMemo(() => (
        <>
            <div className="flex gap-4 mt-4 flex-col md:flex-row ">
                <div className="flex-1 min-w-[180px] ">
                    <AnimatedSelect
                        label="Estado"
                        name="estado"
                        value={localFilters.estado}
                        onChange={handleFilterChange}
                        options={[
                            { key: '', value: '', title: '' },
                            ...estados.map(e => ({
                                key: e.value,
                                value: e.value,
                                title: e.label
                            })).filter((e: any) => e.key === 'SO' || e.key === 'AP' || e.key === 'PA')
                        ]}
                        disabled={loadingEstados}
                        error={!!errorEstados}
                        darkMode={isDarkMode}
                    />
                </div>
                <div className="flex-1 min-w-[180px]">
                    <AnimatedInput
                        label="Nro. Solicitud"
                        name="nro_solicitud"
                        value={localFilters.nro_solicitud}
                        onChange={handleFilterChange}
                        type="text"
                        darkMode={isDarkMode}
                    />
                </div>
            </div>

            <div className="flex flex-wrap gap-4 mb-6 mt-4">
                <div className="flex-1 min-w-[180px]">
                    <AnimatedInput
                        label="Fecha desde"
                        name="fecha_desde"
                        value={localFilters.fecha_desde}
                        onChange={handleFilterChange}
                        type="date"
                        darkMode={isDarkMode}
                    />
                </div>
                <div className="flex-1 min-w-[180px]">
                    <AnimatedInput
                        label="Fecha hasta"
                        name="fecha_hasta"
                        value={localFilters.fecha_hasta}
                        onChange={handleFilterChange}
                        type="date"
                        darkMode={isDarkMode}
                    />
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mt-4 ">
                <Button
                    onClick={handleClear}
                    title="Limpiar"
                />
                <Button
                    onClick={handleFilter}
                    title="Buscar"
                />
                <Button
                    onClick={() => router.push('/')}
                    title="Salir"
                />
            </div>
        </>
    ), [localFilters, handleFilterChange, handleClear, handleFilter, router, estados, loadingEstados, errorEstados, isDarkMode]);

    const handleFoundCollector = useCallback((numero_documento: string) => {
        setNumeroDocumentoRecaudador(numero_documento);
        setPage(1);
        setFilters((prev: typeof localFilters) => ({
            ...prev,
            numero_documento: numero_documento || undefined
        }));
    }, []);

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

                <div className="w-full max-w-full mx-auto">
                    <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                        <div className={`rounded-xl p-6 relative ${isDarkMode ? 'dark' : 'bg-white'}`}>

                            <button
                                onClick={() => router.push('/')}
                                className={`absolute top-2 right-4 text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
                            >
                                &times;
                            </button>

                            {isInternalUser === true ? (                            
                                <h2 className={`my-6 text-xl sm:text-2xl lg:text-3xl font-bold text-center ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>CONSULTA DE ACUERDOS DE PAGO</h2>                                                   
                            ) : (
                                <h2 className={`my-6 text-xl sm:text-2xl lg:text-3xl font-bold text-center ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>CONSULTA DE ACUERDOS DE PAGO</h2>                      
                            )}
                            
                            <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Datos Empresariales</h3>

                            {isInternalUser === true ? (
                                <InternalUserInfo onFoundCollector={handleFoundCollector} />
                            ) : (
                                <ExternalUserInfo />
                            )}

                            {filterInputs}
                        </div>

                        <div className={`rounded-xl p-6 mt-6  ${isDarkMode ? 'dark' : 'bg-white'}`}>
                        <h2 className={`text-lg sm:text-xl lg:text-2xl text-center font-bold my-4 sm:my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'} px-2`}>CONSULTA SOLICITUDES DE ACUERDO DE PAGO</h2>
                            {/* loader local */}
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
                                    currentPage={page}
                                    totalPages={totalPages}
                                    onPageChange={handlePageChange}
                                    actions={actions}
                                    isLoading={acuerdosLoading}
                                    fetchAllData={fetchAllData}
                                />
                            )}
                        </div>
                    </div>
                </div>   
                <ModalContainer isOpen={openModal} onClose={() => setOpenModal(false)} size="4xl">
                    {selectedRow && (
                        <ConsultRequestPayment
                            nro_solicitud={selectedRow.id_solicitud_acuerdo_pago}
                            onClose={() => setOpenModal(false)} 
                            isInternalUser={isInternalUser}
                        />
                    )}
                </ModalContainer>
            </div>
        )
    );
}
