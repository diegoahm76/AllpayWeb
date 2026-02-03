'use client'

import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useObtenerDetallesPlanPago } from '../../../../../../application/acuerdos_pago/cuotas/useObtenerCuotasPlanPago';
import { useEliminarCuotaPlanPago } from '../hooks/useEliminarCuotaPlanPago';
import { usePlanPagoPorSolicitud } from '../hooks/usePlanPagoPorSolicitud';
import { formatCurrency } from '@/utils/formatters';
import { formatearFechaDMY } from '@/utils/dateUtils';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import RegistrarCapacidadPago from './registrarCapacidadPago';
import { useRouter } from 'next/navigation';
import { DetallePlanPago } from '../../../../../../domain/models/acuerdos_pago/cuotas/obtenerCuotasPlanPago.model';
import AlertQuestion from '@/presenters/components/recaudadores/AlertQuestion';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import { useActualizarCuota } from '../hooks/useActualizarCuota';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
// import { EliminarCuotaPlanPagoResponse } from '../models/eliminarCuotaPlanPago.model';

export default function CreatePaymentPlanDetails() {
    const { data: session } = useSession();
    const token = (session as any)?.user?.tokens?.access;

    const searchParams = useSearchParams();
    const router = useRouter();
    const idSolicitud = searchParams.get('id');

    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    const [, setPage] = useState(1);
    const [showDeleteQuestion, setShowDeleteQuestion] = useState(false);
    const [cuotaToDelete, setCuotaToDelete] = useState<number | null>(null);
    const [showLoader, setShowLoader] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [hasPlanPago, setHasPlanPago] = useState<boolean>(false);
    const [isCheckingPlanPago, setIsCheckingPlanPago] = useState(false);

    const {
        fetchPlanPagoPorSolicitud
    } = usePlanPagoPorSolicitud();

    const {
        loading, error, data,
        obtenerDetalles
    } = useObtenerDetallesPlanPago(token);

    const {
        // error: errorEliminar, data: dataEliminar,
        eliminarCuota,
    } = useEliminarCuotaPlanPago(token);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalSolicitudId, setModalSolicitudId] = useState<string | null>(null);

    const [isModalEditarOpen, setIsModalEditarOpen] = useState(false);
    const [cuotaToEdit, setCuotaToEdit] = useState<number | null>(null);
    const [fechaPago, setFechaPago] = useState('');

    const {
        actualizarCuotaPlanPago,
        loading: loadingActualizar
    } = useActualizarCuota(token);

    useEffect(() => {
        setMounted(true);
    }, []);

    // hay plan de pago
    useEffect(() => {
        const checkPlanPago = async () => {
            if (token && idSolicitud) {
                setIsCheckingPlanPago(true);
                try {
                    const response = await fetchPlanPagoPorSolicitud(token, idSolicitud);
                    const hasPlan = response?.data?.plan_pago !== null;
                    setHasPlanPago(hasPlan);
                } catch (error) {
                    console.error('Error al verificar plan de pago:', error);
                    setHasPlanPago(false);
                } finally {
                    setIsCheckingPlanPago(false);
                }
            }
        };

        checkPlanPago();
    }, [token, idSolicitud]);

    // obtener detalles de la solicitud
    useEffect(() => {
        if (token && idSolicitud !== null) {
            obtenerDetalles(idSolicitud);
        }    
    }, [token, idSolicitud]);

    const handleDeleteCuota = async (idCuota: number) => {
        setCuotaToDelete(idCuota);
        setShowDeleteQuestion(true);
    };

    const handleConfirmDelete = async () => {
        if (!cuotaToDelete) return;

        try {
            setShowLoader(true);
            const responseEliminar = await eliminarCuota(cuotaToDelete);
            setShowLoader(false);
            
            if (responseEliminar.success) {
                setSuccessMessage(responseEliminar.detail || '¡Cuota eliminada exitosamente!');
                setShowSuccess(true);
                // Recargar los datos después de eliminar
                if (idSolicitud) {
                    await obtenerDetalles(idSolicitud);
                }
            } else {
                setErrorMessage('Error al eliminar la cuota');
                setShowError(true);
            }
        } catch (error: unknown) {
            setShowLoader(false);
            
            let mensajeError = 'Error al eliminar la cuota';
            
            if (error instanceof Error) {
                mensajeError = error.message;
            } else if (typeof error === 'string') {
                mensajeError = error;
            } else if (error && typeof error === 'object' && 'message' in error) {
                mensajeError = (error as { message: string }).message;
            }

            if (mensajeError.toLowerCase().includes('solo se puede eliminar')) {
                setErrorMessage('Solo se puede eliminar la última cuota agregada del plan de pago');
            } else {
                setErrorMessage(mensajeError);
            }
            
            setShowError(true);
        } finally {
            setShowDeleteQuestion(false);
            setCuotaToDelete(null);
        }
    };

    const handleCloseSuccess = () => {
        setShowSuccess(false);
    };

    const handleEditCuota = (idCuota: number) => {
        setCuotaToEdit(idCuota);
        setIsModalEditarOpen(true);
    };

    const handleActualizarCuota = async () => {
        if (!cuotaToEdit || !fechaPago) return;

        try {
            setShowLoader(true);
            const response = await actualizarCuotaPlanPago(cuotaToEdit, { fecha_pago: fechaPago });
            setShowLoader(false);
            
            if (response.success) {
                setSuccessMessage(response.detail || '¡Cuota actualizada exitosamente!');
                setShowSuccess(true);
                setIsModalEditarOpen(false);
                // Recargar los datos después de actualizar
                if (idSolicitud) {
                    await obtenerDetalles(idSolicitud);
                }
            } else {
                setErrorMessage('Error al actualizar la cuota');
                setShowError(true);
            }
        } catch (error: unknown) {
            setShowLoader(false);
            let mensajeError = 'Error al actualizar la cuota';
            
            if (error instanceof Error) {
                mensajeError = error.message;
            }
            
            setErrorMessage(mensajeError);
            setShowError(true);
        } finally {
            setCuotaToEdit(null);
            setFechaPago('');
        }
    };

    const tableData = data?.data?.map((item: DetallePlanPago) => ({
        numero_solicitud: item.nro_solicitud,
        fecha_solicitud: formatearFechaDMY(new Date(item.fecha_solicitud)),
        nro_plan_pago: item.numero_plan_pago,
        nit_recaudador: item.numero_documento_recaudador,
        nro_cuota: item.numero_cuota,
        fecha_pago: item.fecha_pago ? formatearFechaDMY(new Date(item.fecha_pago)) : '-',
        nro_factura: item.Nro_factura,
        valor_factura: formatCurrency(item.valor_factura),
        id_cuota_acuerdo_pago: item.id_cuota_acuerdo_pago
    })) || [];

    const columns = [
        {
            key: 'nro_cuota',
            label: 'NÚMERO DE CUOTA',
        },
        {
            key: 'fecha_solicitud',
            label: 'FECHA DE SOLICITUD',
        },
        {
            key: 'nit_recaudador',
            label: 'NIT RECAUDADOR',
        },
        {
            key: 'numero_solicitud',
            label: 'No. DE SOLICITUD',
        },
      
        {
            key: 'fecha_pago',
            label: 'FECHA DE PAGO',
        },
        {
            key: 'nro_factura',
            label: 'NÚMERO DE FACTURA ÚNICA',
        },
        {
            key: 'valor_factura',
            label: 'VALOR DE FACTURA ÚNICA',
        },
    ];
    
    const actions = [
        {
            label: 'Ver Detalles',
            render: (row: any) => (
                <button
                    onClick={() => handleEditCuota(row.id_cuota_acuerdo_pago)}
                >
                    <img
                        src="/images/icons/update.png"
                        alt="Editar"
                        className="h-6 w-6"
                    />
                </button>
            )
        },
        {
            label: 'Eliminar',
            render: (row: any) => (
                <button
                    onClick={() => handleDeleteCuota(row.id_cuota_acuerdo_pago)}
                    className="text-red-600 hover:text-red-800"
                >
                    <img
                        src="/images/icons/delete.png"
                        alt="Eliminar"
                        className="h-6 w-6"
                    />
                </button>
            )
        }
    ];

    const fetchAllData = async (page: number) => {
        try {
            if (page === 0) {
                return {
                    data: tableData,
                    total_pages: 1
                };
            }
            
            return {
                data: tableData,
                total_pages: 1
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
    const headingClass = isDarkMode ? 'text-white' : 'text-[#562707]';
    const infoTextClass = isDarkMode ? 'text-white' : 'text-gray-600';

    if (!mounted) {
        return null;
    }

    return (
        <div className="w-full max-w-full mx-auto p-6">
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>                    
                    <h3 className={`text-2xl text-center font-bold ${headingClass}`}>
                        Detalle del Plan de Pago
                    </h3>

                    {isCheckingPlanPago && (
                        <div className="flex justify-center items-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[rgb(var(--green))]" />
                        </div>
                    )}

                    {!isCheckingPlanPago && !hasPlanPago && (
                        <div className="text-center py-4">
                            <p className={infoTextClass}>No se encontró un plan de pago para esta solicitud</p>
                        </div>
                    )}

                    {!isCheckingPlanPago && hasPlanPago && (
                        <>
                            <AlertLoader
                                isOpen={showLoader}
                                loadingText="Eliminando cuota..."
                            />
                            <AlertSuccess
                                isOpen={showSuccess}
                                message={successMessage}
                                onClose={handleCloseSuccess}
                            />
                            <AlertQuestion
                                isOpen={showDeleteQuestion}
                                questionText="¿Está seguro que desea eliminar esta cuota?"
                                answerAfirmative="Sí, eliminar"
                                answerNegative="No, cancelar"
                                onConfirm={handleConfirmDelete}
                                onClose={() => {
                                    setShowDeleteQuestion(false);
                                    setCuotaToDelete(null);
                                }}
                            />
                            <AlertError
                                isOpen={showError}
                                message={errorMessage}
                                onClose={() => setShowError(false)}
                            />

                            {loading && (
                                <div className="flex justify-center items-center py-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[rgb(var(--green))]" />
                                </div>
                            )}

                            {!loading && !error && (
                                <DynamicTable
                                    columns={columns}
                                    data={tableData}
                                    actions={actions}
                                    currentPage={1}
                                    fetchAllData={fetchAllData}
                                    totalPages={1}
                                    onPageChange={setPage}
                                    isLoading={loading}
                                />
                            )}
                        </>
                    )}

                    <div className="flex justify-end gap-4 mt-6">
                        <Button
                            title="Crear"
                            onClick={() => {
                                setModalSolicitudId(idSolicitud);
                                setIsModalOpen(true);
                            }}
                        />
                        <Button
                            title="Regresar"
                            onClick={() => {
                                router.push('/acuerdos_pago/gestionar/');
                            }}
                        />
                    </div>
                </div>
            </div>

            <ModalContainer isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="6xl">
                {modalSolicitudId && (
                    <RegistrarCapacidadPago idSolicitud={modalSolicitudId} hasPlanPago={hasPlanPago} onClose={() => setIsModalOpen(false)} />
                )}
            </ModalContainer>

            <ModalContainer isOpen={isModalEditarOpen} onClose={() => setIsModalEditarOpen(false)} size="md">
                <div className="flex flex-col gap-6">
                    <h3 className={`text-2xl text-center font-bold ${headingClass}`}>
                        Editar Cuota del Plan de Pago
                    </h3>

                    <AnimatedInput
                        label="Fecha de Pago"
                        name="fecha_pago"
                        value={fechaPago}
                        onChange={(e) => setFechaPago(e.target.value)}
                        minDate={new Date().toISOString().split('T')[0]}
                        type="date"
                        required
                        darkMode={isDarkMode}
                    />

                    <div className="flex justify-center gap-4 mt-4">
                        <Button
                            title="Cancelar"
                            onClick={() => {
                                setIsModalEditarOpen(false);
                                setCuotaToEdit(null);
                                setFechaPago('');
                            }}
                        />
                        <Button
                            title="Guardar"
                            onClick={handleActualizarCuota}
                            disabled={!fechaPago || loadingActualizar}
                        />
                    </div>
                </div>
            </ModalContainer>
        </div>
    );
}
