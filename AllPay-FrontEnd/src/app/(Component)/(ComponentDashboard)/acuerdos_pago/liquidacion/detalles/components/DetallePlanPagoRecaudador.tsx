'use client'

// react
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

// hooks
import { useDetallesPlanesPago } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/detalles/hooks/useDetallesPlanesPago';
import { useLiquidacionDocumentoInterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/detalles/hooks/useLiquidacionDocumentoInterno';
import { useLiquidacionComprasAcuerdoPago } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/detalles/hooks/useLiquidacionComprasAcuerdoPago';
import { usePlantillasDocumento } from '@/application/documento/usePlantillasDocumento';
import { useGeneradorDocumento } from '@/application/documento/useGeneradorDocumento';

// utils
import { formatCurrency } from '@/utils/formatters';
import { formatearFechaDMY, formatearFechaDMYUTC, obtenerAnio, obtenerNombreMes } from '@/utils/dateUtils';
import { numeroALetras } from '@/utils/numero-a-letras';
import { generateCode } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_liquidacion/utils/generate-code';
import { formatNumberWithCommas } from '@/utils/formatters';

// presenters
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
import AlertQuestionWithDocument from '@/presenters/components/recaudadores/AlertQuestionWithDocument';
import { useWordToPdf } from '@/application/documento/useWordToPdf';
import { useEffect, useState } from 'react';

export default function DetallePlanPagoRecaudador() {

    const { data: session } = useSession();
    const router = useRouter();
    const token = (session as any)?.user?.tokens?.access;
    const valueSesion: any = session;
    const searchParams = useSearchParams();
    const idSolicitud = searchParams.get('id');
    const { theme } = useTheme();
    const [isInternalUser, setIsInternalUser] = useState<boolean | null>(null);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [selectedCuotas, setSelectedCuotas] = useState<Set<number>>(new Set());
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    
    // Estados para el documento y modal
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [documentUrl, setDocumentUrl] = useState<string>('');
    const [docToGenerate, setDocToGenerate] = useState<any>(null);
    const [isAlertLoader, setIsAlertLoader] = useState(false);
    const [alertLoaderText, setAlertLoaderText] = useState('');
    const [idPlantilla, setIdPlantilla] = useState<number | null>(null);

    useEffect(() => {
      
        if (!valueSesion?.user?.tipo_usuario) return;
        
        if (valueSesion.user.tipo_usuario === 'I') {
            setIsInternalUser(true);
        } else if (valueSesion.user.tipo_usuario === 'E') {
            setIsInternalUser(false);
        }
    }, [valueSesion?.user?.tipo_usuario]);

    const {
        loading,
        error,
        data,
        refetch
    } = useDetallesPlanesPago(token || '', idSolicitud, isInternalUser);

    // Hook para liquidación de documento interno
    const {
        loading: loadingLiquidacion,
        error: errorLiquidacion,
        //data: dataLiquidacion,
        generarLiquidacion,
        clearError: clearErrorLiquidacion
    } = useLiquidacionDocumentoInterno();

    // Hook para obtener plantilla de liquidación
    const { plantillas, error: errorPlantillas } = usePlantillasDocumento({
        token: token || '',
        nombre: 'Liquidación Acuerdo De Pago'
    });

    // Actualizar el ID de la plantilla cuando esté disponible
    useEffect(() => {
        if (plantillas?.data?.length) {
            setIdPlantilla(plantillas.data[0].id_plantilla_doc);
        }
    }, [plantillas]);

    // Hook para generación de documentos
    const { generarDocumento } = useGeneradorDocumento({
        token: token || '',
        id_plantilla_doc: idPlantilla || 0,
        consecutivo: true         
    });

    // Hook para liquidación de compras (solo para usuarios externos)
    const { 
        createLiquidacionCompras,
        //isLoading: isLoadingLiquidacionCompras,
        error: errorLiquidacionCompras,
        clearError: clearErrorLiquidacionCompras
    } = useLiquidacionComprasAcuerdoPago({ token: token || '' });

    // Hook para conversión a PDF
    const { 
        convertToPdf,
        isLoading: isLoadingPdf,
        error: errorPdf
    } = useWordToPdf();

    // Función para manejar selección de cuotas
    const handleCuotaSelection = (numeroCuota: number, isSelected: boolean) => {
        
        const newSelectedCuotas = new Set(selectedCuotas);
        const newSelectedRows = new Set(selectedRows);
        
        if (isSelected) {
            // Verificar si ya hay una cuota diferente seleccionada
            if (selectedCuotas.size > 0 && !selectedCuotas.has(numeroCuota)) {
                // Ya hay una cuota diferente seleccionada, mostrar error
                const cuotaActual = Array.from(selectedCuotas)[0];
                setErrorMessage(`Solo puede seleccionar facturas de una cuota a la vez. Actualmente tiene seleccionada la cuota ${cuotaActual}. Debe deseleccionarla primero para seleccionar la cuota ${numeroCuota}.`);
                setShowErrorAlert(true);
                return; // No permitir la selección
            }
            
            // Agregar la cuota a las seleccionadas
            newSelectedCuotas.add(numeroCuota);
            
            // Seleccionar todas las filas con esta cuota
            tableData.forEach((row: any) => {
                if (row.numero_cuota === numeroCuota) {
                    newSelectedRows.add(row.id);
                }
            });
        } else {
            // Remover la cuota de las seleccionadas
            newSelectedCuotas.delete(numeroCuota);
            
            // Deseleccionar todas las filas con esta cuota
            tableData.forEach((row: any) => {
                if (row.numero_cuota === numeroCuota) {
                    newSelectedRows.delete(row.id);
                }
            });
        }
        
        setSelectedCuotas(newSelectedCuotas);
        setSelectedRows(newSelectedRows);
    };

    // Función para verificar si una cuota está seleccionada
    const isCuotaSelected = (numeroCuota: number) => {
        return selectedCuotas.has(numeroCuota);
    };

    // Función para manejar la liquidación de cuotas seleccionadas
    const handleLiquidarCuotas = async () => {
        if (!token || selectedRows.size === 0) {
            setErrorMessage('Debe seleccionar al menos una cuota para liquidar.');
            setShowErrorAlert(true);
            return;
        }

        if (errorPlantillas) {
            setErrorMessage('Error al cargar la plantilla de liquidación.');
            setShowErrorAlert(true);
            return;
        }

        if (!idPlantilla) {
            setErrorMessage('No se encontró la plantilla necesaria para la liquidación.');
            setShowErrorAlert(true);
            return;
        }

        // Validar que isInternalUser esté definido
        if (isInternalUser === null) {
            setErrorMessage('Error: No se pudo determinar el tipo de usuario.');
            setShowErrorAlert(true);
            return;
        }

        // Mostrar el AlertLoader
        setIsAlertLoader(true);
        setAlertLoaderText('Generando documento de liquidación...');

        try {
            const datosSeleccionados = Array.from(selectedRows).map(id => {
                const row = tableData.find((item: any) => item.id === id);
                return row;
            }).filter(Boolean);

            // Obtener datos de liquidación
            const dataResp = await generarLiquidacion(token, datosSeleccionados, isInternalUser);
            
            if (!dataResp?.data?.length) {
                throw new Error('No se recibieron datos de liquidación');
            }

            const first = dataResp.data[0];

            // Calcular fechas para intereses
            let fechadeliquidacion_intereses: string;
            let fechalimitepago_intereses: string;

            if (first.intereses_x_factura > 0) {
                fechadeliquidacion_intereses = first.fecha_limite_pago_intereses || '';
                fechalimitepago_intereses = fechadeliquidacion_intereses || '';
            } else {
                fechadeliquidacion_intereses = new Date().toISOString().split('T')[0] || '';
                fechalimitepago_intereses = first.fecha_limite_pago || '';
            }


            // Generar código de barras
            const codigoBarras = generateCode({
                empresa: '1234567890128',
                referencia: first.numero_documento_recaudador,
                valorPagar: first.valor_a_pagar,
                fechaMaximaPago: fechalimitepago_intereses || ''
            });

            const fechaliquidacion_formateada = formatearFechaDMYUTC(fechadeliquidacion_intereses);
            const fechalimitepago_formateada = formatearFechaDMY(new Date(fechalimitepago_intereses));


            // Preparar variables para el documento
            const variables = {
                fechadeliquidacion: fechaliquidacion_formateada,
                fechadepago: fechalimitepago_formateada || '',
                mespago: obtenerNombreMes(fechaliquidacion_formateada),
                anopago: obtenerAnio(fechaliquidacion_formateada),
                Ndocumento: first.numero_documento_recaudador || '',
                NOMBREREPRESENTANTELEGAL: first.representante_legal || '',
                NOMBRERECAUDADOR: first.recaudador_nombre || '',
                DIRECCIONRECAUDADOR: first.direccion_recaudador || '',
                telrecuadador: first.telefono_recaudador || '',
                items: dataResp.data.map(d => ({
                    nfactura: d.nro_factura_unica.toString() || '',
                    ncuota: d.nro_cuota || '',
                    fpago: formatearFechaDMY(new Date(d.fecha_vencimiento || '')) || '',
                    ndproveedor: d.numero_documento_proveedor || '',
                    fcompra: formatearFechaDMY(new Date(d.fecha_compra)) || '',
                    kilos: formatNumberWithCommas(d.total_kilos.toString()) || 0,
                    valorcuota: formatCurrency(d.cuota_fomento) || 0,
                    valorinteres: formatCurrency(d.intereses_x_factura) || 0
                })),
                valortotalcuota: formatCurrency(first.cuota_fomento_total) || 0,
                valortotalintereses: formatCurrency(first.valor_intereses_total) || 0,
                valortotalpagar: formatCurrency(first.valor_a_pagar) || 0,

                VALORTOTALENLETRAS: numeroALetras(first.valor_a_pagar) || 'error',
                codigo_barras: codigoBarras
            };

            // Generar documento
            const docResp = await generarDocumento({ variables });
            if (!docResp?.success) throw new Error('Error al generar documento');

            // Cerrar el AlertLoader
            setIsAlertLoader(false);

            // Guardar el documento generado para la confirmación
            setDocumentUrl(docResp.data.ruta_documento);
            setDocToGenerate({ variables, docResp, datosSeleccionados });
            setShowConfirmationModal(true);

        } catch (error) {
            console.error('❌ Error al generar liquidación:', error);
            setIsAlertLoader(false);
            setErrorMessage(error instanceof Error ? error.message : 'Error al generar la liquidación. Por favor, intente nuevamente.');
            setShowErrorAlert(true);
        }
    };

    // Función para confirmar la liquidación
    const handleConfirmGeneration = async () => {
        try {
            setShowConfirmationModal(false);
            
            // Mostrar loader después de la confirmación
            setIsAlertLoader(true);
            setAlertLoaderText('Procesando liquidación...');
            
            if (!docToGenerate?.docResp?.success) {
                throw new Error('No hay documento generado válido');
            }

            // Extraer información solicitada
            const idDocumentoGenerado = docToGenerate.docResp.data.id_documento_generado;
            const codigoBarras = docToGenerate.variables.codigo_barras;
            
            // Extraer IDs de cuotas seleccionadas
            const idsCuotasSeleccionadas = docToGenerate.datosSeleccionados
                .map((item: any) => item.original?.id_cuota_acuerdo_pago)
                .filter((id: any) => id !== undefined && typeof id === 'number');

            // Eliminar duplicados
            const idsCuotasUnicas = [...new Set(idsCuotasSeleccionadas)] as number[];
         
            // Validar que haya cuotas seleccionadas
            if (idsCuotasUnicas.length === 0) {
                throw new Error('No hay cuotas válidas seleccionadas');
            }

            // Validar que isInternalUser esté definido
            if (isInternalUser === null) {
                throw new Error('No se pudo determinar el tipo de usuario');
            }

            // Preparar datos para la liquidación
            const requestData = {
                id_cuotas: idsCuotasUnicas,
                doc_pago_id: idDocumentoGenerado,
                codigo_barras: codigoBarras
            };

            try {
                // El hook se encarga de decidir qué adapter usar basado en isInternalUser
                const response = await createLiquidacionCompras(requestData, isInternalUser === true);
                
                // Mostrar mensaje de éxito o error basado en la respuesta del backend
                if (response.success) {
                    setSuccessMessage(response.detail || 'Liquidación de compras completada exitosamente');
                    setShowSuccessAlert(true);
                    
                    // Actualizar la tabla de cuotas
                    if (refetch) {
                        refetch();
                    }
                    
                    // Convertir documento a PDF
                    try {
                        const pdfResponse = await convertToPdf(token || '', idDocumentoGenerado);
                        
                        // Abrir el PDF en una nueva pestaña
                        if (pdfResponse.data?.ruta_documento) {
                            window.open(pdfResponse.data.ruta_documento, '_blank');
                        }
                    } catch (pdfError) {
                        console.error('❌ Error al convertir a PDF:', pdfError);
                        // No mostramos error de PDF, la liquidación fue exitosa
                    }
                } else {
                    // Respuesta no exitosa del backend
                    setErrorMessage(response.detail || 'Error en la liquidación de compras');
                    setShowErrorAlert(true);
                }
            } catch (liquidacionError) {
                console.error('❌ Error al crear liquidación de compras:', liquidacionError);
                setErrorMessage(liquidacionError instanceof Error ? liquidacionError.message : 'Error al completar la liquidación de compras. Por favor, intente nuevamente.');
                setShowErrorAlert(true);
            }

        } catch (error) {
            console.error('❌ Error al confirmar liquidación:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Error al confirmar la liquidación.');
            setShowErrorAlert(true);
        } finally {
            // Cerrar el loader
            setIsAlertLoader(false);
            // Limpiar selecciones
            setSelectedRows(new Set());
            setSelectedCuotas(new Set());
        }
    };

    const fetchAllData = async () => {
        return {
            data: tableData,
            total_pages: 1
        };
    };

    const tableData = data?.data?.map((item: any, index: number) => ({
        id: index, // Agregar ID único para cada fila
        numero_solicitud: item.nro_solicitud,
        tipo_documento: item.tipo_documento_recaudador,
        numero_documento: item.numero_documento_recaudador,
        nombre_recaudador: item.nombre_recaudador,
        fecha_solicitud: formatearFechaDMY(new Date(item.fecha_solicitud)),
        estado: item.estado,
        numero_plan_pago: item.numero_plan_pago,
        estado_plan_pago: item.estado_plan_pago_display,
        numero_cuota: item.numero_cuota,
        fecha_pago: item.fecha_pago ? formatearFechaDMY(new Date(item.fecha_pago)) : 'Pendiente',
        nro_factura: item.Nro_factura,
        cuota_fomento: formatCurrency(item.cuota_fomento),
        valor_factura: formatCurrency(item.valor_factura),
        cuota_liquidada: item.cuota_liquidada ? 'Si' : 'No',
        // Datos originales para referencia
        original: item
    })) || [];

    const columns = [
        {
            key: 'numero_cuota',
            label: 'NÚMERO CUOTA',
        },
        
        {
            key: 'numero_documento',
            label: 'NÚMERO DOCUMENTO',
        },
        {
            key: 'nombre_recaudador',
            label: 'NOMBRE RECAUDADOR',
        },
        {
            key: 'fecha_solicitud',
            label: 'FECHA SOLICITUD',
        },
        {
            key: 'numero_solicitud',
            label: 'NÚMERO DE SOLICITUD',
        },    
        {
            key: 'estado_plan_pago',
            label: 'ESTADO PLAN PAGO',
        },
        
        {
            key: 'fecha_pago',
            label: 'FECHA PAGO',
        },
        {
            key: 'nro_factura',
            label: 'NÚMERO FACTURA',
        },
        {
            key: 'cuota_fomento',
            label: 'CUOTA FOMENTO',
        },
        {
            key: 'valor_factura',
            label: 'VALOR FACTURA',
        },
        {
            key: 'cuota_liquidada',
            label: 'CUOTA LIQUIDADA',
        }
    ];

    const actions = [
        {
            label: 'Seleccionar',
            render: (row: any) => {
                const isSelected = isCuotaSelected(row.numero_cuota);
                return (
                    <div className="flex items-center justify-center">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleCuotaSelection(row.numero_cuota, e.target.checked)}
                            className="w-4 h-4 text-[#4D750F] bg-gray-100 border-gray-300 rounded focus:ring-[#4D750F] focus:ring-2"
                            title={`Seleccionar todas las facturas de la cuota ${row.numero_cuota}`}
                        />
                    </div>
                );
            }
        }
    ];

    return (
        <div className="w-full max-w-full mx-auto p-6">
            <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
                <div className={`rounded-xl p-6 ${theme === 'dark' ? 'dark' : 'bg-white'}`}>                    
                    <h3 className={`text-2xl text-center font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                        Detalle de las Cuotas del Plan de Pago
                    </h3>

                    {loading && (
                        <div className="flex justify-center items-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[rgb(var(--green))]" />
                        </div>
                    )}

                    {error && (
                        <div className="text-center text-red-600 py-4">
                            {error}
                        </div>
                    )}

                    {!loading && !error && (
                        <DynamicTable
                            columns={columns}
                            data={tableData.map((row: any) => ({
                                ...row,
                                // Agregar clase CSS para filas seleccionadas
                                className: selectedRows.has(row.id) 
                                    ? (theme === 'dark' ? 'bg-blue-900 bg-opacity-30' : 'bg-blue-50') 
                                    : ''
                            }))}
                            actions={actions}
                            currentPage={1}
                            totalPages={1}
                            fetchAllData={fetchAllData}
                            onPageChange={() => {}}
                            isLoading={loading}
                        />
                    )}

                    <div className="flex flex-col items-center gap-4 mt-6">
                        
                        {/* Botones de acción */}
                        <div className="flex justify-center items-center gap-4">
                            <Button
                                onClick={handleLiquidarCuotas}
                                title={loadingLiquidacion || isLoadingPdf ? 'Procesando...' : 'Liquidar cuota'}
                                disabled={selectedCuotas.size === 0 || loadingLiquidacion || isLoadingPdf}
                            />
                            <Button
                                onClick={() => {
                                    setSelectedRows(new Set());
                                    setSelectedCuotas(new Set());
                                }}
                                title="Limpiar Selección"
                                disabled={selectedCuotas.size === 0}
                            />
                            <Button
                                onClick={() => router.back()}
                                title="Regresar"
                            />        
                        </div>
                    </div>
                </div>
            </div>

            {/* Alert de error */}
            <AlertError
                isOpen={showErrorAlert}
                message={errorMessage || errorLiquidacion || errorLiquidacionCompras || errorPdf || 'Error al generar la liquidación. Por favor, intente nuevamente.'}
                onClose={() => {
                    setShowErrorAlert(false);
                    setErrorMessage('');
                    clearErrorLiquidacion();
                    clearErrorLiquidacionCompras();
                }}
            />

            {/* Alert de éxito */}
            <AlertSuccess
                isOpen={showSuccessAlert}
                message={successMessage}
                onClose={() => {
                    setShowSuccessAlert(false);
                    setSuccessMessage('');
                    // Limpiar selecciones al cerrar el éxito
                    setSelectedRows(new Set());
                    setSelectedCuotas(new Set());
                }}
            />

            {/* Alert de carga */}
            <AlertLoader
                isOpen={isAlertLoader}
                loadingText={alertLoaderText}
            />

            {/* Modal de confirmación con documento */}
            <AlertQuestionWithDocument
                isOpen={showConfirmationModal}
                onClose={() => setShowConfirmationModal(false)}
                onConfirm={handleConfirmGeneration}
                questionText="Esta acción genera la liquidación de la compra de la factura única nacional y emite la cuenta de cobro respectiva. ¿Desea realizar la liquidación?"
                documentUrl={documentUrl}
            />
        </div>
    );
}

