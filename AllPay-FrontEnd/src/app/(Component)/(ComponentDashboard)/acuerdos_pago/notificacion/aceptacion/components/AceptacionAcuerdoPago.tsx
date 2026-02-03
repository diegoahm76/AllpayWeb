'use client'

// react
import { useTheme } from 'next-themes';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

// presenters
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { AnimatedTextarea } from '@/presenters/components/ui/AnimatedTextarea';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import ModalContainer from '@/presenters/components/ui/ModalContainer';

// notifications
import AlertQuestion from "@/presenters/components/recaudadores/AlertQuestion";
import AlertError from "@/presenters/components/recaudadores/AlertError";
import AlertLoader from "@/presenters/components/recaudadores/AlertLoader";
import AlertSuccess from "@/presenters/components/recaudadores/AlertSuccess";

// hooks
import { useWordToPdf } from '@/application/documento/useWordToPdf';
import { useInformacionSolicitud } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/notificacion/aceptacion/hooks/useInformacionSolicitud';
import { useNotificacionAcuerdoPago } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/notificacion/aceptacion/hooks/useNotificacionAcuerdoPago';
import { useDocumentoAcuerdoPago } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/notificacion/aceptacion/hooks/useDocumentoAcuerdoPago';
import { useUserProfile } from '@/application/user/useUserProfile';
import { usePlantillasDocumento } from '@/application/documento/usePlantillasDocumento';
import { formatCurrency } from '@/utils/formatters';

export default function AceptacionAcuerdoPago() {

    const { theme } = useTheme();
    const { data: session } = useSession();
    const token = (session as any)?.user?.tokens?.access;
    const router = useRouter();
    const searchParams = useSearchParams();
    const [mounted, setMounted] = useState(false);
    const [isAlertQuestion, setIsAlertQuestion] = useState(false);
    const [alertQuestionText, setAlertQuestionText] = useState('');
    const [documentoUrl, setDocumentoUrl] = useState<string | null>(null);
    const [documentoVisualizado, setDocumentoVisualizado] = useState(false);
    const [documentoGeneradoId, setDocumentoGeneradoId] = useState<number | null>(null);
    const [successMessage, setSuccessMessage] = useState<React.ReactNode>('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [tipoPersona, setTipoPersona] = useState<string | null>(null);
    const [showError, setShowError] = useState(false);
    const [plantillaId, setPlantillaId] = useState<number | null>(null);
    const [showDocumentModal, setShowDocumentModal] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    // Mover el hook al nivel superior del componente
    const { profile } = useUserProfile(token || '');

    // Hooks para plantillas (deben estar al nivel superior)
    const { plantillas: plantillasPN } = usePlantillasDocumento({
        token: token || '',
        nombre: 'Notificación Acuerdo Pago Persona Natural'
    });

    const { plantillas: plantillasPJ } = usePlantillasDocumento({
        token: token || '',
        nombre: 'Notificación Acuerdo Pago Persona Juridica'
    });

    // Usar useEffect para actualizar el estado cuando cambie el perfil
    useEffect(() => {
        setTipoPersona(profile?.persona?.tipo_persona || null);
    }, [profile]);

    // useEffect para cargar el ID de la plantilla solo una vez cuando se determine el tipo de persona
    useEffect(() => {
        if (tipoPersona && !plantillaId) {
            if (tipoPersona === 'N' && plantillasPN?.data?.[0]?.id_plantilla_doc) {
                setPlantillaId(plantillasPN.data[0].id_plantilla_doc);
            } else if (tipoPersona === 'J' && plantillasPJ?.data?.[0]?.id_plantilla_doc) {
                setPlantillaId(plantillasPJ.data[0].id_plantilla_doc);
            }
        }
    }, [tipoPersona, plantillasPN, plantillasPJ, plantillaId]);



    const { 
        //convertToPdf, 
        isLoading: isLoadingPdf, error: errorPdf } = useWordToPdf();

    const { loading, error, data, obtenerInformacionSolicitud } = useInformacionSolicitud();

    const { 
        loading: loadingDocumento,
        error: errorDocumento,
        obtenerDocumentoAcuerdoPago,
        clearError: clearErrorDocumento
    } = useDocumentoAcuerdoPago();

    const { 
        loading: loadingNotificacion, 
        //error: errorNotificacion, 
        //data: dataNotificacion, 
        //success: successNotificacion,
        notificarAcuerdoPago,
        //clearError: clearErrorNotificacion,
        //clearSuccess: clearSuccessNotificacion
    } = useNotificacionAcuerdoPago();
    const hasLoadedRef = useRef(false);

    // Cargar información al montar el componente (solo una vez)
    useEffect(() => {
        const cargarInformacion = async () => {
            const id = searchParams.get('id');
            if (id && token && !hasLoadedRef.current) {
                hasLoadedRef.current = true;
                try {
                    await obtenerInformacionSolicitud(token, id);
                        } catch (error) {
            console.error('Error al cargar información:', error);
            setErrorMessage('Error al cargar la información de la solicitud');
            setShowError(true);
        }
            }
        };

        cargarInformacion();
    }, [searchParams, token, obtenerInformacionSolicitud]);

    // Mostrar error si hay algún problema
    useEffect(() => {
        if (error) {
            setErrorMessage(error);
            setShowError(true);
        }
    }, [error]);


    // Mostrar error del PDF
    useEffect(() => {
        if (errorPdf) {
            setErrorMessage(errorPdf);
            setShowError(true);
        }
    }, [errorPdf]);

    // Mostrar error del documento
    useEffect(() => {
        if (errorDocumento) {
            setErrorMessage(errorDocumento);
            setShowError(true);
        }
    }, [errorDocumento]);

    const visualizarDocumentoAcuerdoPago = async () => {
        try {
            // Obtener el ID de la URL
            const id = searchParams.get('id');

            if (!id || !token) {
                console.error('No se encontró el ID en la URL o el token');
                setErrorMessage('No se encontró el ID de la solicitud');
                setShowError(true);
                return;
            }

            clearErrorDocumento();

            // Llamar al nuevo adapter para obtener el documento
            const response = await obtenerDocumentoAcuerdoPago(token, id);
            
            if (response.success && response.data) {
                // Guardar la URL del documento y marcarlo como visualizado
                setDocumentoUrl(response.data.ruta_documento);
                setDocumentoVisualizado(true);
                setDocumentoGeneradoId(response.data.id_documento_generado);
                
            }
            
        } catch (error) {
            console.error('Error al visualizar el documento:', error);
            setErrorMessage('Error al obtener la información del documento');
            setShowError(true);
        }
    }

    const handleNotificarClick = () => {
        setAlertQuestionText('¿Está seguro que desea notificar al usuario sobre el acuerdo de pago?');
        setIsAlertQuestion(true);
    }

    const confirmarNotificacion = () => {
        setIsAlertQuestion(false);
        // Aquí implementa la lógica para notificar al usuario
        notificarUsuario();
    }

    const notificarUsuario = async () => {
        try {
            const id = searchParams.get('id');

            if (!id || id.trim() === '') {
                setErrorMessage('No se encontró el ID de la solicitud en la URL');
                setShowError(true);
                return;
            }

            if (!token || token.trim() === '') {
                setErrorMessage('Token de autenticación no disponible. Por favor, inicie sesión nuevamente');
                setShowError(true);
                return;
            }

            if (!documentoGeneradoId || documentoGeneradoId <= 0) {
                setErrorMessage('Debe visualizar y generar el documento PDF antes de notificar al usuario');
                setShowError(true);
                return;
            }

            // Validar que el documento se haya visualizado
            if (!documentoVisualizado) {
                setErrorMessage('Debe visualizar el documento antes de notificar al usuario');
                setShowError(true);
                return;
            }

            // Validar que se tenga información de la solicitud
            if (!data?.data?.numero_solicitud) {
                setErrorMessage('No se ha cargado la información de la solicitud. Recargue la página e intente nuevamente');
                setShowError(true);
                return;
            }


            const response = await notificarAcuerdoPago(token, id, documentoGeneradoId);
            
            if (response.success) {
                setSuccessMessage(response.detail || 'Usuario notificado exitosamente sobre el acuerdo de pago');
                setShowSuccess(true);
            } else {
                setErrorMessage(response.detail || 'Error en la respuesta del servidor al notificar al usuario');
                setShowError(true);
            }
            
        } catch (error) {
            console.error('❌ Error al notificar al usuario:', error);
            
            // Manejar diferentes tipos de errores
            let errorMessage = 'Error inesperado al notificar al usuario';
            
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            
            // Mostrar error más descriptivo según el tipo
            setErrorMessage(errorMessage);
            setShowError(true);
        }
    }

    const cancelarNotificacion = () => {
        setIsAlertQuestion(false);
        setAlertQuestionText('');
    }

    const handleVerDocumentoAcuerdoPago = () => {
        setShowDocumentModal(true);
    }

    const handleCloseDocumentModal = () => {
        setShowDocumentModal(false);
    }

    if (!mounted) {
        return null;
    }

    return (
        <div className="w-full max-w-full mx-auto p-6">


            <AlertSuccess
                isOpen={showSuccess}
                messageHtml={successMessage}
                onClose={() => {
                    setShowSuccess(false);
                    setSuccessMessage('');
                    // Redirigir a la página de notificaciones después de cerrar el mensaje de éxito
                    router.push('/acuerdos_pago/notificacion/');
                }}
            />

            <AlertError
                isOpen={showError}
                message={errorMessage}
                onClose={() => {
                    setShowError(false);
                    setErrorMessage('');
                }}
            />

            <AlertQuestion
                isOpen={isAlertQuestion}
                questionText={alertQuestionText}
                onClose={cancelarNotificacion}
                onConfirm={confirmarNotificacion}
                answerAfirmative="Sí"
                answerNegative="Cancelar"
            />

            <AlertLoader
                isOpen={loading || isLoadingPdf || loadingNotificacion || loadingDocumento}                               
                loadingText={
                    loading ? 'Cargando información de la solicitud...' : 
                    loadingDocumento ? 'Obteniendo documento...' :
                    isLoadingPdf ? 'Generando PDF...' :
                    loadingNotificacion ? 'Notificando al usuario...' : ''
                }
            />

            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>                    
                    <h3 className={`text-2xl text-center font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                        Notificar Acuerdo de Pago
                    </h3>

                    <div className='flex flex-col-4 gap-4 mt-6'>
                        <AnimatedInput
                            label='Número de Solicitud'
                            name='numero_solicitud'
                            readOnly={true} 
                            type='text'
                            value={data?.data?.numero_solicitud?.toString() || ''}
                            darkMode={isDarkMode}
                        />
                         <AnimatedInput
                            label='Número Plan de Pago'
                            name='numero_plan_pago'
                            readOnly={true}
                            type='text'
                            value={data?.data?.numero_plan_pago?.toString() || ''}
                            darkMode={isDarkMode}
                        />
                         <AnimatedInput
                            label='Número de Cuotas'
                            name='numero_cuotas'
                            readOnly={true}
                            type='text'
                            value={data?.data?.numero_cuotas_plan_pago?.toString() || ''}
                            darkMode={isDarkMode}
                        />
                         <AnimatedInput
                            label='Valor Total a Pagar'
                            name='valor_total_pagar'
                            readOnly={true}
                            type='text'
                            value={data?.data?.valor_total_a_pagar ? ` ${formatCurrency(data.data.valor_total_a_pagar)}` : ''}
                            darkMode={isDarkMode}
                        />

                    </div>

                    <div className='flex flex-col-4 gap-4 mt-4'>
                        <AnimatedInput
                            label='Vobo Area de Recaudo'
                            name='vobo_area_recaudo'
                            readOnly={true}
                            type='text'
                            value={'Aceptada Recaudo'}
                            darkMode={isDarkMode}
                        />
                         <AnimatedInput
                            label='Vobo Area Jurídica'
                            name='vobo_area_juridica'
                            readOnly={true}
                            type='text'
                            value={'Aceptada Jurídica'}
                            darkMode={isDarkMode}
                        />
                         <AnimatedInput
                            label='Vobo Area Gerencia'
                            name='vobo_area_direccion'
                            readOnly={true}
                            type='text'
                            value={'Aceptada Gerencia'}
                            darkMode={isDarkMode}
                        />
                         <AnimatedInput
                            label='Estado del Plan'
                            name='estado_plan'
                            readOnly={true}
                            type='text'
                            value={'Aprobado'}
                            darkMode={isDarkMode}
                        />

                    </div>

                    <div className='mt-6 grid grid-cols-4 gap-4'>  
                        <div className='col-span-2'>
                            <AnimatedTextarea
                                label='Observaciones FEDECACAO'
                                name='observaciones'
                                value={[
                                    data?.data?.observacion_juridica && `Jurídica: ${data.data.observacion_juridica}`,
                                    data?.data?.observacion_direccion && `Gerencia: ${data.data.observacion_direccion}`
                                ].filter(Boolean).join('\n\n') || 'Sin observaciones'}
                                onChange={() => {}}
                                readOnly={true}
                                darkMode={isDarkMode}
                            />
                        </div>   
                        {/* <div>
                            <Button
                                title='Generar Documento Acuerdo de Pago'
                                onClick={generarDocumentoAcuerdoPago}
                                disabled={!documentoVisualizado}
                            />
                        </div>   */}

                        <div className='col-span-2 flex h-auto items-center justify-center'>
                            <Button
                                title='Visualizar Documento Acuerdo de Pago'
                                onClick={visualizarDocumentoAcuerdoPago}
                            />
                        </div> 
                    </div>

                    {/* Botón adicional para ver el documento del acuerdo de pago */}
                    {data?.data?.doc_acuerdo_pago && (
                        <div className='mt-4 flex flex-col items-center'>
                            <Button
                                title='Ver Documento Acuerdo de Pago'
                                onClick={handleVerDocumentoAcuerdoPago}
                            />
                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Documento ya generado disponible para visualización
                            </p>
                        </div>
                    )}

                    {/* Mostrar el documento generado debajo de observaciones */}
                    {documentoUrl && (
                        <div className="mt-6 flex justify-center">
                            <div className="w-full max-w-4xl">
                                <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                                    Documento Generado:
                                </h4>
                                <div className="w-full h-[800px] border rounded-lg overflow-hidden">
                                    <iframe
                                        src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(documentoUrl)}`}
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        allowFullScreen
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className='flex justify-end gap-4 mt-4'>
                        <div className="flex flex-col items-end">
                            <Button
                                title='Notificar'
                                onClick={handleNotificarClick}
                                disabled={!documentoGeneradoId || !documentoVisualizado}
                            />
                        </div>
             
                        <Button
                            title='Regresar'
                            onClick={() => router.push('/acuerdos_pago/notificacion')}
                        />
                    </div>
                    



                </div>
            </div>

            {/* Modal para ver el documento del acuerdo de pago */}
            <ModalContainer
                isOpen={showDocumentModal}
                onClose={handleCloseDocumentModal}
                size="6xl"
            >
                <div>
                    <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                        Documento de Acuerdo de Pago
                    </h3>
                    
                    {data?.data?.doc_acuerdo_pago ? (
                        <div className="w-full h-[800px] border rounded-lg overflow-hidden">
                            <iframe
                                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(data.data.doc_acuerdo_pago)}`}
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                allowFullScreen
                                title="Documento de Acuerdo de Pago"
                            />
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className={isDarkMode ? 'text-white' : 'text-gray-600'}>
                                No hay documento disponible para mostrar
                            </p>
                        </div>
                    )}
                </div>
            </ModalContainer>
        </div>
    );
}