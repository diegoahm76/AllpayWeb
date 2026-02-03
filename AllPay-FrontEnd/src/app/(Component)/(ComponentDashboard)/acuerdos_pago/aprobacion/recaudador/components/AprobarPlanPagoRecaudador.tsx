'use client'

// react
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// app
import { useAprobacionPlanPago } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/recaudador/hooks/useAprobacionPPRecaudador';

// components
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertQuestion from '@/presenters/components/recaudadores/AlertQuestion';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import ModalContainer from '@/presenters/components/ui/ModalContainer';

// hooks
import { useInformacionSolicitudRecaudador } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/recaudador/hooks/useInformacionSolicitud';

// utils
import { formatCurrency } from '@/utils/formatters';
import { AnimatedTextarea } from '@/presenters/components/ui/AnimatedTextarea';

interface SolicitarAcuerdoPagoProps {
    idSolicitud: string | null;
    idPlanPago: string | null;
    onClose?: () => void;
    onSave?: (data: any) => void;
    onSuccess?: () => void;
}

export default function AprobarPlanPagoRecaudador({ idSolicitud, idPlanPago, onClose, onSave, onSuccess }: SolicitarAcuerdoPagoProps) {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { data: session } = useSession();
    const token = (session as any)?.user?.tokens?.access;

    const [formData, setFormData] = useState({
        observacion_direccion: '',
        aprobacion_recaudador: 'Pendiente'
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [showConfirmApproval, setShowConfirmApproval] = useState(false);

    const { loading: aprobacionLoading,
        //error: aprobacionError,
        aprobarPlanPago 
        } = useAprobacionPlanPago();
        
    const { loading: detalleLoading, error: detalleError, data: informacionSolicitud, obtenerInformacionSolicitud } = useInformacionSolicitudRecaudador();

    // Cargar información al montar el componente
    useEffect(() => {
        if (token && idPlanPago) {
            obtenerInformacionSolicitud(token, idPlanPago);
        }
    }, [token, idPlanPago]); // Removí obtenerInformacionSolicitud para evitar bucle infinito

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleApprovalClick = () => {
        // Mostrar la confirmación antes de aprobar
        setShowConfirmApproval(true);
    };

    const handleConfirmApproval = async () => {
        setShowConfirmApproval(false);
        
        try {
            const response = await aprobarPlanPago(String(informacionSolicitud?.data.id_plan_pago), token, formData);
            setSuccessMessage(response.detail);
            setShowSuccess(true);
            
            if (onSave) {
                onSave(response);
            }
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Error al aprobar el plan de pago');
            setShowError(true);
        }
    };

    const handleCancelApproval = () => {
        setShowConfirmApproval(false);
    };

    const handleSuccessClose = () => {
        setShowSuccess(false);
        if (onSuccess) {
            onSuccess();
        }
        onClose?.();
    };

    const handleVerDocumentoAcuerdoPago = () => {
        if (solicitudData?.doc_acuerdo_pago) {
            setShowDocumentModal(true);
        } else {
            setErrorMessage('No hay documento de acuerdo de pago disponible para mostrar');
            setShowError(true);
        }
    };

    const handleCloseDocumentModal = () => {
        setShowDocumentModal(false);
    };

    // Datos de la nueva información de solicitud
    const solicitudData = informacionSolicitud?.data;

    return (
        <div className="w-full max-w-full mx-auto">
            <AlertSuccess
                isOpen={showSuccess}
                message={successMessage}
                onClose={handleSuccessClose}
            />

            <AlertError
                isOpen={showError}
                message={errorMessage}
                onClose={() => setShowError(false)}
            />

            {showConfirmApproval && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10001 }}>
                    <AlertQuestion
                        isOpen={showConfirmApproval}
                        onClose={handleCancelApproval}
                        onConfirm={handleConfirmApproval}
                        questionText="¿Está seguro que desea aprobar este documento? Al ser aprobado, su firma será asignada al documento."
                        answerAfirmative="Sí, Aprobar"
                        answerNegative="Cancelar"
                    />
                </div>
            )}
                                
            <h3 className={`text-2xl text-center font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                Aprobar Plan de Pago Recaudador
            </h3>

            {(detalleLoading || aprobacionLoading) && (
                <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[rgb(var(--green))]" />
                </div>
            )}

            {detalleError && (
                <div className="text-center text-red-600 py-4">
                    {detalleError}
                </div>
            )}

            {!detalleLoading && !detalleError && (
                <div className="grid grid-cols-3 gap-4 mt-8">
                    
                    <AnimatedInput
                        label="Número solicitud"
                        name="numero_solicitud"
                        disabled={true}
                        type="text"
                        value={idSolicitud || ''}
                        readOnly
                    />

                    <AnimatedInput
                        label="Número de cuotas"
                        name="numero_cuotas"
                        disabled={true}
                        type="text"
                        value={String(solicitudData?.nro_cuotas || '')}
                        readOnly
                    />

                    <AnimatedInput
                        label="Valor Total"
                        name="valor_total"
                        disabled={true}
                        type="text"
                        value={formatCurrency(solicitudData?.valor_total_pagar || 0)}
                        readOnly
                    />

                    <AnimatedInput
                        label="VoBo Área de Recaudo"
                        name="vo_bo_area_recaudo"
                        type="text"
                        disabled={true}
                        value={'Aceptada Recaudo'}
                        onChange={handleInputChange}
                    />

                    <AnimatedInput
                        label="VoBo Jurídica"
                        name="vo_bo_juridica"
                        value={'Aceptada Juridica'}
                        onChange={handleInputChange}
                        
                    />

                    <AnimatedInput
                        label="Aprobación Gerencia"
                        name="aprobacion_direccion"
                        type="text"
                        value={'Aceptado Gerencia'}
                        disabled={true}
                        onChange={handleInputChange}
                    />

                    <AnimatedSelect
                        label="Aprobación Recaudador"
                        name="aprobacion_recaudador"
                        value={formData.aprobacion_recaudador}
                        onChange={handleInputChange}
                        options={[
                            { key: 'pendiente', value: 'Pendiente', title: 'Pendiente' },
                            { key: 'aceptada', value: 'Aceptada Recaudador', title: 'Aceptada Recaudador' }
                        ]}
                    />

                    <AnimatedInput
                        label="Fecha Aprobación"
                        name="fecha_aprobacion"
                        type="date"
                        value={new Date().toISOString().split('T')[0]}
                        disabled={true}
                        onChange={handleInputChange}
                    />

                    <AnimatedTextarea
                        label="Observaciones"
                        name="observacion_direccion"
                        value={"Juridica: " + solicitudData?.observacion_juridica + "\nGerencia: " + solicitudData?.observacion_direccion}
                        disabled={true}
                        onChange={handleInputChange}
                        darkMode={isDarkMode}
                    />

                </div>
            )}

            <div className="flex justify-end items-center mt-6 gap-4">

                <div className="flex flex-col items-center">
                    <Button
                        title={"Ver Documento Acuerdo Pago"}
                        onClick={handleVerDocumentoAcuerdoPago}
                        disabled={!solicitudData?.doc_acuerdo_pago}
                    />
                </div>

                <Button
                    title={aprobacionLoading ? "Guardando..." : "Aprobar y Firmar"}
                    onClick={handleApprovalClick}
                    disabled={aprobacionLoading || detalleLoading || formData.aprobacion_recaudador !== 'Aceptada Recaudador'}
                />

                <Button
                    title="Salir"
                    onClick={onClose || (() => {})}
                    disabled={aprobacionLoading || detalleLoading}
                />
            </div>

            {/* Modal para ver el documento del acuerdo de pago */}
            <ModalContainer
                isOpen={showDocumentModal}
                onClose={handleCloseDocumentModal}
                size="4xl"
            >
                <div>
                    <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                        Documento de Acuerdo de Pago
                    </h3>
                    
                    {solicitudData?.doc_acuerdo_pago ? (
                        <div className="w-full h-[800px] border rounded-lg overflow-hidden">
                            <iframe
                                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(solicitudData.doc_acuerdo_pago)}`}
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                allowFullScreen
                                title="Documento de Acuerdo de Pago"
                            />
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className={theme === 'dark' ? 'text-white' : 'text-gray-600'}>
                                No hay documento disponible para mostrar
                            </p>
                        </div>
                    )}
                </div>
            </ModalContainer>
        </div>
    );
}