'use client';

// react
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { signIn, useSession } from 'next-auth/react';

// presenters
import { Button } from '@/presenters/components/ui/AnimatedButton';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';

// hooks
import { usePagosLineaCuotaFomento } from '../hooks/usePagosLineaCuotaFomento';
import { useDescargarDocumentoPagosLinea } from '../hooks/useDescargarDocumentoPagosLinea';

const VerReporteLibroCompra = () => {

    const [, setIsInternalUser] = useState<boolean | null>(null);
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFinal, setFechaFinal] = useState<string>('');
    const [mounted, setMounted] = useState(false);

    const { theme } = useTheme();
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted && theme === 'dark';

    const { data: session } = useSession({
      required: true,
      onUnauthenticated() {
        signIn();
      }
    });

    const valueSesion: any = session;
    const token = (session as any)?.user?.tokens?.access || '';

    // Hook del reporte de pagos en línea
    const {
        reporteData,
        isLoading: isLoadingReporte,
        showAlertNotification,
        alertMessage,
        showErrorAlert,
        errorAlertMessage,
        fetchReporte,
        clearFilters: clearFiltersReporte,
        handlePageChange,
        clearAlerts,
        fetchAllData
    } = usePagosLineaCuotaFomento(token);

    // Hook para descargar el documento de pagos en línea
    const {
        //isLoading: isLoadingDescarga,
        //descargarDocumento,
        clearAlerts: clearAlertsDescarga,
        showAlertNotification: showAlertNotificationDescarga,
        alertMessage: alertMessageDescarga,
        showErrorAlert: showErrorAlertDescarga,
        errorAlertMessage: errorAlertMessageDescarga
    } = useDescargarDocumentoPagosLinea(token);

    useEffect(() => {
      if (!valueSesion?.user?.tipo_usuario) return; 
      if (valueSesion.user.tipo_usuario === 'I') {
        setIsInternalUser(true);
      } else if (valueSesion.user.tipo_usuario === 'E') {
        setIsInternalUser(false);
      }
    }, [valueSesion?.user?.tipo_usuario]);

    const columns = [
        {
            key: 'fecha_registro',
            label: 'FECHA DE REGISTRO',
            render: (value: any) => value
        },
        {   
            key: 'nit_recaudador', 
            label: 'NIT RECAUDADOR', 
            render: (value: any) => value
        },
        {
            key: 'nombre_recaudador',
            label: 'NOMBRE RECAUDADOR',
            render: (value: any) => value
        },
        {   
            key: 'fecha_compra', 
            label: 'FECHA DE COMPRA', 
            render: (value: any) => value
        },
        {
            key: 'nro_factura_unica', 
            label: 'N° FACTURA UNICA',
            render: (value: any) => value
        },
        {
            key: 'cuota_fomento', 
            label: 'CUOTA FOMENTO',
            render: (value: any) => value
        },
        { 
            key: 'valor_interes', 
            label: 'VALOR INTERESES',
            render: (value: any) => value
        },
        { 
            key: 'fecha_pago', 
            label: 'FECHA DE PAGO',
            render: (value: any) => value ? value : "Sin fecha"
        },
        {
            key: 'nro_comprobante',
            label: 'N° COMPROBANTE',
            render: (value: any) => value
        },
    ];
 
    return (
      <div className="w-full max-w-full mx-auto">
  
        <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>

            <div className={`rounded-xl p-6 relative ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>

                <button
                    onClick={() => router.push('/')}
                    className={`absolute top-2 right-4 text-2xl ${isDarkMode ? 'text-white hover:text-red-400' : 'text-[rgb(var(--brown))] hover:text-red-700'}`}
                >
                    &times;
                </button>

                <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>REPORTE PAGOS EN LINEA CUOTA DE FOMENTO CACAOTERO</h2>

                <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Consulta por fecha</h3>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 col-span-2'>

                  <AnimatedInput
                      label='Fecha Inicio'
                      type='date'
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      name='fecha_inicio'
                      darkMode={isDarkMode}
                  />

                  <AnimatedInput
                      label='Fecha Final'
                      type='date'
                      value={fechaFinal}
                      onChange={(e) => setFechaFinal(e.target.value)}
                      name='fecha_final'
                      darkMode={isDarkMode}
                  />

                </div>

                <div className='flex justify-center gap-4 mt-6 flex-wrap'>  
                  <Button title='Limpiar' onClick={() => {
                    setFechaInicio('');
                    setFechaFinal('');
                    clearFiltersReporte();
                  }} />
                  <Button title='Consultar' onClick={() => {
                    const params: any = {
                      page: 1,
                      page_size: 10
                    };
                    
                    if (fechaInicio) params.fecha_inicio = fechaInicio;
                    if (fechaFinal) params.fecha_fin = fechaFinal;
                    
                    fetchReporte(params);
                  }} />
                  <Button title='Salir' onClick={() => router.push('/')} />
                </div>
                
            </div>

          {/* Tabla de resultados */}
          <div className={`rounded-3xl mt-6 shadow-md p-6 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
            <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
              CONSOLIDADO PAGO EN LINEA CUOTA DE FOMENTO CACAOTERO
            </h2>

            <h3 className={`text-md mb-6 font-bold mt-4 text-center ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>PAGOS PASARELA DE PAGO</h3>
  
            <DynamicTable
              columns={columns}
              data={reporteData.registros}
              isLoading={isLoadingReporte}
              currentPage={reporteData.current_page}
              totalPages={reporteData.total_pages}
              onPageChange={handlePageChange}
              fetchAllData={fetchAllData}
            //   actionsTop={
            //     <button
            //     className="flex items-center gap-1 rounded-xl bg-[rgb(var(--gray-20))] px-4 py-1.5 text-center text-sm font-semibold text-[rgb(var(--brown))] hover:bg-[rgb(var(--gray-40))]/90"                 
            //     onClick={() => {
            //       const params: any = {};
                  
            //       if (fechaInicio) params.fecha_inicio = fechaInicio;
            //       if (fechaFinal) params.fecha_fin = fechaFinal;
                  
            //       descargarDocumento(params);
            //     }}
            //     disabled={isLoadingDescarga}
            //  >
            //   <span className="mr-1">
            //                 <img
            //                   src="/images/icons/more.png"
            //                   alt="icon-masivo"
            //                   className="h-4 w-4"
            //                 />
            //             </span>
            //    {isLoadingDescarga ? 'DESCARGANDO...' : 'DESCARGAR REPORTE'}
            //  </button>
            //   }
            />

            <div className='flex flex-col md:flex-row justify-center gap-4 mt-6 col-span-8 w-full md:w-auto'>
              

              <div className='w-full'>
              <AnimatedInput
                label='TOTAL CF'
                type='text'
                value={reporteData.total_cuota || ''}
                onChange={() => {}}
                name='total_cuota_fomento'
                readOnly
                darkMode={isDarkMode}
              />
              </div>

              <div className='w-full'>
              <AnimatedInput
                label='TOTAL INTERESES'
                type='text'
                value={reporteData.total_interes || ''}
                onChange={() => {}}
                name='total_intereses'
                readOnly
                darkMode={isDarkMode}
              />
              </div>

            </div>
          </div>

          {/* Alertas del reporte */}
          {showAlertNotification && (
              <AlertSuccess
                  isOpen={showAlertNotification}
                  message={alertMessage}
                  onClose={clearAlerts}
              />
          )}

          {showErrorAlert && (
              <AlertError
                  isOpen={showErrorAlert}
                  message={errorAlertMessage}
                  onClose={clearAlerts}
              />
          )}

          {/* Alertas de descarga */}
          {showAlertNotificationDescarga && (
              <AlertSuccess
                  isOpen={showAlertNotificationDescarga}
                  message={alertMessageDescarga}
                  onClose={clearAlertsDescarga}
              />
          )}

          {showErrorAlertDescarga && (
              <AlertError
                  isOpen={showErrorAlertDescarga}
                  message={errorAlertMessageDescarga}
                  onClose={clearAlertsDescarga}
              />
          )}
        </div>
      </div>
    );
  };
  
  export default VerReporteLibroCompra;
  