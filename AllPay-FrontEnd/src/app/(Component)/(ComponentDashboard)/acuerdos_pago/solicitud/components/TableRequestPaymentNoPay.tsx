'use client'

// react
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

// utils
import { formatCurrency, formatNumberWithCommas } from '@/utils/formatters';
import { formatearFechaDMYUTC } from '@/utils/dateUtils';

// presenters
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import Modal from '@/presenters/components/ui/ModalContainer';
import RequestSendPayment from "@/presenters/components/acuerdos_pago/RequestSendPayment";
import { ExternalUserInfo } from '@/presenters/components/recaudadores/ExternalUserInfo';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';

// app
import { useSolicitudAcuerdoPagoPreview } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/solicitud/hooks/useSolicitudAcuerdoPagoPreview';
import { useSolicitudAcuerdoPago } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/solicitud/hooks/useSolicitudAcuerdoPago';
import { useFacturasNoPagadas } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/solicitud/hooks/useFacturasNoPagadas';
import { FacturaNoPagada } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/solicitud/models/facturasNoPagadas.model';



export default function TableRequestPaymentNoPay() {

    const { theme } = useTheme();
    const router = useRouter();
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
          signIn();
        }
    });
    const valueSesion: any = session; 
    const token = (session as any)?.user?.tokens?.access;
    const [mounted, setMounted] = useState(false);
    const [messageError, setMessageError] = useState('');
    const [isAlertError, setIsAlertError] = useState(false);
    const [messageSuccess, setMessageSuccess] = useState('');
    const [isAlertSuccess, setIsAlertSuccess] = useState(false);

    // useLoggedUser
    const [, setIsInternalUser] = useState<boolean | null>(null);

    // invoices
    const {
        loading, error, data, page,
        setPage, fetchFacturas
    } = useFacturasNoPagadas(token);
    
    const [selectedFacturas, setSelectedFacturas] = useState<any[]>([]);
    
    // request payment
    const { fetchPreview, loading: loadingPreview } = useSolicitudAcuerdoPagoPreview(token);
    const { create, loading: loadingSolicitud } = useSolicitudAcuerdoPago(token);
    
    // states
    const [file, setFile] = useState<File | null>(null);
    const [observaciones, setObservaciones] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);

    // Función para saber si una factura está seleccionada
    const isFacturaSelected = (id_factura_unica: number) =>
        selectedFacturas.some(f => f.id_factura_unica === id_factura_unica);

    const toggleFactura = (factura: any) => {
        setSelectedFacturas(prev => {
            if (isFacturaSelected(factura.id_factura_unica)) {
                // Quitar si ya está seleccionada
                return prev.filter(f => f.id_factura_unica !== factura.id_factura_unica);
            } else {
                // Agregar si no está seleccionada
                return [...prev, factura];
            }
        });
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!valueSesion?.user?.tipo_usuario) return; // Esperamos a tener el dato
        if (valueSesion.user.tipo_usuario === 'I') {
          setIsInternalUser(true);
          setMessageError('Solo un usuario externo puede hacer solicitudes de acuerdo de pago.');
          setIsAlertError(true);
        } else if (valueSesion.user.tipo_usuario === 'E') {
          setIsInternalUser(false);
        }
    }, [valueSesion?.user?.tipo_usuario]);

    const isDarkMode = mounted && theme === 'dark';

    // Facturas de la página actual
    const currentPageFacturas = data?.facturas || [];
    const allCurrentPageSelected = currentPageFacturas.length > 0 && currentPageFacturas.every(f => isFacturaSelected(f.id_factura_unica));
    const someCurrentPageSelected = currentPageFacturas.some(f => isFacturaSelected(f.id_factura_unica));

    const toggleSelectAllCurrentPage = () => {
        if (!Array.isArray(currentPageFacturas)) return;
        
        if (allCurrentPageSelected) {
            // Deseleccionar todas las de la página actual
            setSelectedFacturas(prev => prev.filter(f => !currentPageFacturas.some(cf => cf.id_factura_unica === f.id_factura_unica)));
        } else {
            // Agregar todas las de la página actual que no estén seleccionadas
            setSelectedFacturas(prev => {
                const newFacturas = currentPageFacturas.filter(cf => !prev.some(f => f.id_factura_unica === cf.id_factura_unica));
                return [...prev, ...newFacturas];
            });
        }
    };

    const handleEnviarSolicitud = async () => {
        if (selectedFacturas.length === 0) {
            setMessageError('Debes seleccionar al menos una factura.');
            setIsAlertError(true);
            return;
        }
        try {
            const ids = selectedFacturas.map(f => f.id_factura_unica);
            const resp = await fetchPreview(ids);
            setPreviewData(resp?.data);
            setModalOpen(true);
        } catch (e) {
            console.error('Error al obtener la vista previa:', e);
        }
    };

    const handleSubmitSolicitud = async () => {
        if (!file) {
            setMessageError('Debes adjuntar un archivo.');
            setIsAlertError(true);
            return;
        }
        if (selectedFacturas.length === 0) {
            setMessageError('Debes seleccionar al menos una factura.');
            setIsAlertError(true);
            return;
        }
        try {
            const payload = {
                id_facturas: selectedFacturas.map(f => f.id_factura_unica),
                observaciones,
                doc_solicitud: file
            };
            const resp = await create(payload);
            const nro_solicitud = resp?.data?.nro_solicitud;
            setModalOpen(false);

            if (resp?.success) {
                setMessageSuccess('Acuerdo de pago creado con el numero: ' + nro_solicitud);
                setIsAlertSuccess(true);
            } else {
                setMessageError(resp?.detail || 'Ocurrió un error al enviar la solicitud');
                setIsAlertError(true);
            }

        } catch (e: any) {
            setModalOpen(false);

            setMessageError(e?.message || 'Ocurrió un error al enviar la solicitud');
            setIsAlertError(true);

        }
    };

    // Función para cerrar el modal y limpiar campos
    const handleCloseModal = () => {
        setObservaciones('');
        setFile(null);
        setModalOpen(false);
    };

    const handleLimpiarFacturas = () => {
        setSelectedFacturas([]);
    };

    // Acciones para la tabla (checkbox individual)
    const actions = [
        {
            label: 'Seleccionar',
            render: (row: any) => (
                <input
                    type="checkbox"
                    checked={isFacturaSelected(row.id_factura_unica)}
                    onChange={() => toggleFactura(row)}
                />
            )
        }
    ];

    // Botón de seleccionar todas para el header de acciones
    const selectAllButton = (
        <button
            onClick={toggleSelectAllCurrentPage}
            className={`flex items-center gap-2 px-2 py-1 rounded font-medium transition-all duration-200 text-xs
                ${allCurrentPageSelected
                    ? 'bg-[#4D750F] text-white hover:bg-[#3d5d0c]'
                    : isDarkMode
                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                        : 'bg-[#DEDEDE] text-[#562707] hover:bg-gray-200'}
            `}
            style={{ minWidth: 0 }}
            title={allCurrentPageSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}
        >
            <input
                type="checkbox"
                checked={allCurrentPageSelected}
                ref={el => {
                    if (el) el.indeterminate = !allCurrentPageSelected && someCurrentPageSelected;
                }}
                onChange={toggleSelectAllCurrentPage}
                className="w-4 h-4 accent-[#4D750F] cursor-pointer"
                readOnly
            />
            <span>
                {allCurrentPageSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </span>
        </button>
    );

    // Columnas de la tabla (sin render de acciones)
    const columns = [
        { key: 'nit_recaudador', label: 'NIT RECAUDADOR' },
        { key: 'fecha_registro', label: 'FECHA DE REGISTRO FACTURA', render: (v: any) => formatearFechaDMYUTC(v) },
        { key: 'numero_factura', label: 'N° FACTURA UNICA', render: (v: any) => v.toString() },
        { key: 'fecha_compra', label: 'FECHA DE COMPRA', render: (v: any) => formatearFechaDMYUTC(v) },
        { key: 'nit_proveedor', label: 'NIT PROVEEDOR' },
        { key: 'kilos', label: 'KILOS', render: (v: number) => formatNumberWithCommas(v.toString()) },
        { key: 'precio_kilo', label: 'PRECIO KILO', render: (v: any) => formatCurrency(v) },
        { key: 'valor_bruto', label: 'VALOR BRUTO', render: (v: any) => formatCurrency(v) },
        { key: 'cuota_fomento', label: 'CUOTA FOMENTO', render: (v: any) => formatCurrency(v) },
        { key: 'dias_mora', label: 'DÍAS MORA' },
        { key: 'estado_liquidacion_display', label: 'ESTADO' },
    ];

    // Mapeo de datos para la tabla
    const tableData = currentPageFacturas.map((factura: FacturaNoPagada) => ({
        nit_recaudador: factura.numero_documento_recaudador,
        fecha_registro: factura.fecha_creacion.split('T')[0],
        numero_factura: factura.nro_factura_unica,
        fecha_compra: factura.fecha_compra.split('T')[0],
        nit_proveedor: factura.numero_documento_proveedor,
        kilos: typeof factura.total_kilos === 'string' ? parseFloat(factura.total_kilos) : factura.total_kilos,
        precio_kilo: factura.promedio_valor_kilo,
        valor_bruto: factura.valor_bruto,
        cuota_fomento: factura.cuota_fomento,
        dias_mora: factura.dias_mora,
        estado_liquidacion_display: factura.tiene_solicitud_acuerdo_pago ? 'Solicitado' : 'Sin solicitud',
        id_factura_unica: factura.id_factura_unica,
    }));

    const fetchAllData = async (page: number) => {
        const response = await fetchFacturas(page);
        const facturas = Array.isArray(response?.facturas) ? response.facturas : [];
        return {
            data: facturas.map((factura: FacturaNoPagada) => ({
                nit_recaudador: factura.numero_documento_recaudador,
                fecha_registro: factura.fecha_creacion.split('T')[0],
                numero_factura: factura.nro_factura_unica,
                fecha_compra: factura.fecha_compra.split('T')[0],
                nit_proveedor: factura.numero_documento_proveedor,
                kilos: typeof factura.total_kilos === 'string' ? parseFloat(factura.total_kilos) : factura.total_kilos,
                precio_kilo: factura.promedio_valor_kilo,
                valor_bruto: factura.valor_bruto,
                cuota_fomento: factura.cuota_fomento,
                dias_mora: factura.dias_mora,
                estado_liquidacion_display: factura.tiene_solicitud_acuerdo_pago ? 'Solicitado' : 'Sin solicitud'
            })),
            total_pages: response?.total_pages || 1
        };
    };

    return (
        <div>

            <AlertSuccess 
                isOpen={isAlertSuccess} 
                onClose={() => {
                    setIsAlertSuccess(false);
                    if (messageSuccess) {
                        router.push('/acuerdos_pago/consultar/');
                    }
                }} 
                message={messageSuccess} 
            />

            <AlertError 
                isOpen={isAlertError} 
                onClose={() => {
                    setIsAlertError(false);
                    // Si el mensaje es específico sobre usuario externo, redirigir a la raíz
                    if (messageError === 'Solo un usuario externo puede hacer solicitudes de acuerdo de pago.') {
                        router.push('/');
                    }
                }} 
                message={messageError} 
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

                        <h2 className={`text-xl sm:text-2xl lg:text-3xl font-bold text-center mt-[39px] mb-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                            SOLICITAR ACUERDO DE PAGO
                        </h2>

                        <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Datos empresariales</h3>
                        
                        <ExternalUserInfo />
                                                      
                    </div>
                    
                    <div className={`rounded-xl p-6 mt-6 ${isDarkMode ? 'dark' : 'bg-white'}`}> 
                        <h2 className={`text-xl sm:text-2xl lg:text-3xl font-bold mb-6 text-center mt-[39px] ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
                            Solicitud de Acuerdo de Pago - Listado de cuotas de Fomento No Pagadas
                        </h2>

                        {loading && (
                            <div className={`text-center py-8 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Cargando...</div>
                        )}

                        {error && (
                            <div className="text-center text-red-600 py-8">{error}</div>
                        )}

                        {!loading && !error && (
                            <DynamicTable
                                columns={columns}
                                data={tableData}
                                currentPage={page}
                                totalPages={data?.total_pages || 1}
                                onPageChange={setPage}
                                fetchAllData={fetchAllData}
                                actions={actions}
                                actionsHeader={selectAllButton}
                            />
                        )}

                        <div className='flex gap-4 items-center justify-center md:justify-end mt-4 flex-col md:flex-row '>
                            <Button
                                title='Limpiar facturas'
                                onClick={handleLimpiarFacturas}
                            />
                            <Button
                                title='Solicitar Acuerdo'
                                onClick={handleEnviarSolicitud}
                                loading={loadingPreview}
                            />
                            <Button
                                title='Salir'
                                onClick={() => router.push("/")}
                            />
                        </div>
                    </div>
                </div>

            </div>
            {/* Modal para mostrar la vista previa */}
            {modalOpen && previewData && (
                <Modal isOpen={modalOpen} onClose={handleCloseModal} size="4xl">
                    <RequestSendPayment
                        nro_solicitud={previewData.nro_solicitud}
                        valor_total_pagar={previewData.valor_total_pagar}
                        estado={previewData.estado}
                        fecha_solicitud={previewData.fecha_solicitud}
                        observaciones={observaciones}
                        setObservaciones={setObservaciones}
                        file={file}
                        setFile={setFile}
                        onSubmit={handleSubmitSolicitud}
                        loading={loadingSolicitud}
                        onClose={handleCloseModal}
                    />
                </Modal>
            )}
        </div>
    );
}

