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
import { useReporteCuotaFomentoFecha } from '@/app/(Component)/(ComponentDashboard)/reportes/cuota_fomento_fecha/hooks/useReporteCuotaFomentoFecha';
import { useReporteAcuerdosPago } from '@/app/(Component)/(ComponentDashboard)/reportes/cuota_fomento_fecha/hooks/useReporteAcuerdosPago';
import { useReporteInteresesAcuerdoPago } from '@/app/(Component)/(ComponentDashboard)/reportes/cuota_fomento_fecha/hooks/useReporteInteresesAcuerdoPago';
import { useDescargarDocumentoCuotaFomento } from '@/app/(Component)/(ComponentDashboard)/reportes/cuota_fomento_fecha/hooks/useDescargarDocumentoCuotaFomento';
import { useDescargarDocumentoAcuerdosPago } from '@/app/(Component)/(ComponentDashboard)/reportes/cuota_fomento_fecha/hooks/useDescargarDocumentoAcuerdosPago';
import { useDescargarDocumentoInteresesAcuerdoPago } from '@/app/(Component)/(ComponentDashboard)/reportes/cuota_fomento_fecha/hooks/useDescargarDocumentoInteresesAcuerdoPago';
import { formatNumberWithCommas } from '@/utils/formatters';

const VerReporteCFFecha = () => {

    const [, setIsInternalUser] = useState<boolean | null>(null);
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFinal, setFechaFinal] = useState('');
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
    const token = (session as any)?.user?.tokens?.access;

    // Hook para el reporte CFR
    const {
        reporteDataCFR,
        isLoading: isLoadingCFR,
        showAlertNotification: showAlertNotificationCFR,
        alertMessage: alertMessageCFR,
        showErrorAlert: showErrorAlertCFR,
        errorAlertMessage: errorAlertMessageCFR,
        fetchReporte: fetchReporteCFR,
        handlePageChange: handlePageChangeCFR,
        clearFilters: clearFiltersCFR,
        clearAlerts: clearAlertsCFR,
        fetchAllData: fetchAllDataCFR
    } = useReporteCuotaFomentoFecha(token);

    // Hook para el reporte de acuerdos de pago
    const {
        reporteData: reporteDataAP,
        isLoading: isLoadingAP,
        showAlertNotification: showAlertNotificationAP,
        alertMessage: alertMessageAP,
        showErrorAlert: showErrorAlertAP,
        errorAlertMessage: errorAlertMessageAP,
        fetchReporte: fetchReporteAP,
        handlePageChange: handlePageChangeAP,
        clearFilters: clearFiltersAP,
        clearAlerts: clearAlertsAP,
        fetchAllData: fetchAllDataAP
    } = useReporteAcuerdosPago(token);

    // Hook para el reporte de intereses de acuerdo de pago
    const {
        reporteData: reporteDataIAP,
        isLoading: isLoadingIAP,
        showAlertNotification: showAlertNotificationIAP,
        alertMessage: alertMessageIAP,
        showErrorAlert: showErrorAlertIAP,
        errorAlertMessage: errorAlertMessageIAP,
        fetchReporte: fetchReporteIAP,
        handlePageChange: handlePageChangeIAP,
        clearFilters: clearFiltersIAP,
        clearAlerts: clearAlertsIAP,
        fetchAllData: fetchAllDataIAP
    } = useReporteInteresesAcuerdoPago(token);

    // Hook para descargar documento de cuota fomento
    const {
        //isLoading: isLoadingDescargaCF,
        showAlertNotification: showAlertNotificationDescargaCF,
        alertMessage: alertMessageDescargaCF,
        showErrorAlert: showErrorAlertDescargaCF,
        errorAlertMessage: errorAlertMessageDescargaCF,
        //descargarReporte: descargarReporteCF,
        clearAlerts: clearAlertsDescargaCF
    } = useDescargarDocumentoCuotaFomento(token);

    // Hook para descargar documento de acuerdos de pago
    const {
        //isLoading: isLoadingDescargaAP,
        showAlertNotification: showAlertNotificationDescargaAP,
        alertMessage: alertMessageDescargaAP,
        showErrorAlert: showErrorAlertDescargaAP,
        errorAlertMessage: errorAlertMessageDescargaAP,
        //descargarReporte: descargarReporteAP,
        clearAlerts: clearAlertsDescargaAP
    } = useDescargarDocumentoAcuerdosPago(token);

    // Hook para descargar documento de intereses de acuerdo de pago
    const {
        //isLoading: isLoadingDescargaIAP,
        showAlertNotification: showAlertNotificationDescargaIAP,
        alertMessage: alertMessageDescargaIAP,
        showErrorAlert: showErrorAlertDescargaIAP,
        errorAlertMessage: errorAlertMessageDescargaIAP,
        //descargarReporte: descargarReporteIAP,
        clearAlerts: clearAlertsDescargaIAP
    } = useDescargarDocumentoInteresesAcuerdoPago(token);

    useEffect(() => {
      if (!valueSesion?.user?.tipo_usuario) return; 
      if (valueSesion.user.tipo_usuario === 'I') {
        setIsInternalUser(true);
      } else if (valueSesion.user.tipo_usuario === 'E') {
        setIsInternalUser(false);
      }
    }, [valueSesion?.user?.tipo_usuario]);

    const columnsCFR = [

        {
            key: 'tipo_documento_recaudador',
            label: 'TIPO DOCUMENTO',
            render: (value: any) => value
        },
        {   
            key: 'numero_documento_recaudador', 
            label: 'N° DOCUMENTO', 
            render: (value: any) => value
        },
        {
            key: 'nombre_recaudador',
            label: 'NOMBRE RECAUDADOR',
            render: (value: any) => value || 'N/A'
        },
        {
            key: 'nombres_tipo_comprador',
            label: 'TIPO COMPRADOR',
            render: (value: any) => value
        },
        {
            key: 'total_kilos',
            label: 'TOTAL KILOS',
            render: (value: any) => formatNumberWithCommas(value.toString()) || '0'
        },
        {
            key: 'valor_cuota_fomento',
            label: 'VALOR CUOTA FOMENTO',
            render: (value: any) => `$${value?.toLocaleString() || '0'}`
        },
        {
            key: 'precio_promedio',
            label: 'PRECIO PROMEDIO',
            render: (value: any) => `$${value?.toLocaleString() || '0'}`
        },
        {
            key: 'valor_intereses',
            label: 'VALOR INTERESES',
            render: (value: any) => `$${value?.toLocaleString() || '0'}`
        },
        {
            key: 'nro_doc_pago',
            label: 'N° DOC PAGO',
            render: (value: any) => value
        },
        {
            key: 'fecha_pago',
            label: 'FECHA PAGO',
            render: (value: any) => value ? new Date(value).toLocaleDateString('es-ES') : 'Pendiente'
        },
    ];

    // Columnas específicas para acuerdos de pago (incluye nombre_recaudador)
    const columnasAcuerdosPago = [
        {
            key: 'tipo_documento_recaudador',
            label: 'TIPO DOCUMENTO',
            render: (value: any) => value
        },
        {   
            key: 'numero_documento_recaudador', 
            label: 'N° DOCUMENTO', 
            render: (value: any) => value
        },
        {
            key: 'nombre_recaudador',
            label: 'NOMBRE RECAUDADOR',
            render: (value: any) => value || 'N/A'
        },
        {
            key: 'nombres_tipo_comprador',
            label: 'TIPO COMPRADOR',
            render: (value: any) => value
        },
        {
            key: 'total_kilos',
            label: 'TOTAL KILOS',
            render: (value: any) => formatNumberWithCommas(value.toString()) || '0'
        },
        {
            key: 'valor_cuota_fomento',
            label: 'VALOR CUOTA FOMENTO',
            render: (value: any) => `$${value?.toLocaleString() || '0'}`
        },
        {
            key: 'precio_promedio',
            label: 'PRECIO PROMEDIO',
            render: (value: any) => `$${value?.toLocaleString() || '0'}`
        },
        {
            key: 'valor_intereses',
            label: 'VALOR INTERESES',
            render: (value: any) => `$${value?.toLocaleString() || '0'}`
        },
        {
            key: 'nro_doc_pago',
            label: 'N° DOC PAGO',
            render: (value: any) => value
        },
        {
            key: 'fecha_pago',
            label: 'FECHA PAGO',
            render: (value: any) => value ? new Date(value).toLocaleDateString('es-ES') : 'Pendiente'
        },
    ];

    const columnasIntereses = [
        {
            key: 'fecha_creacion',
            label: 'FECHA CREACIÓN',
            render: (value: any) => new Date(value).toLocaleDateString('es-ES')
        },
        {
            key: 'tipo_documento_recaudador',
            label: 'TIPO DOCUMENTO',
            render: (value: any) => value
        },
        {
            key: 'numero_documento_recaudador',
            label: 'N° DOCUMENTO',
            render: (value: any) => value
        },
        {
            key: 'nombre_recaudador',
            label: 'NOMBRE RECAUDADOR',
            render: (value: any) => value || 'N/A'
        },
        {
            key: 'mes',
            label: 'MES',
            render: (value: any) => value || 'N/A'
        },
        {
            key: 'fecha_pago',
            label: 'FECHA PAGO',
            render: (value: any) => value ? new Date(value).toLocaleDateString('es-ES') : 'Pendiente'
        },
        {
            key: 'nro_doc_pago',
            label: 'N° DOC PAGO',
            render: (value: any) => value
        },
        {
            key: 'valor_intereses',
            label: 'VALOR INTERESES',
            render: (value: any) => `$${value?.toLocaleString() || '0'}`
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

                <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>REPORTE CONSOLIDADO DEMANDA NACIONAL DE CACAO</h2>

                <h3 className={`text-md text-left font-bold mt-4 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>CONSULTA POR FECHA DE PAGO</h3>

                <div className='flex flex-col md:flex-row gap-4 mt-4 col-span-2'>

                  <div className='w-full'>
                  <AnimatedInput
                      label='Fecha Inicio'
                      type='date'
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      name='fecha_inicio'
                      darkMode={isDarkMode}
                  />
                  </div>

                  <div className='w-full'>
                  <AnimatedInput
                      label='Fecha Final'
                      type='date'
                      value={fechaFinal}
                      onChange={(e) => setFechaFinal(e.target.value)}
                      name='fecha_final'
                      darkMode={isDarkMode}
                  />
                  </div>

                </div>

                <div className='flex justify-center gap-4 mt-6 flex-wrap'>  
                  <Button title='Limpiar' onClick={() => {
                    setFechaInicio('');
                    setFechaFinal('');
                    clearFiltersCFR();
                    clearFiltersAP();
                    clearFiltersIAP();
                  }} />
                  <Button title='Consultar' onClick={() => {
                    fetchReporteCFR({
                      fecha_inicio: fechaInicio || undefined,
                      fecha_final: fechaFinal || undefined
                    });
                    fetchReporteAP({
                      fecha_inicio: fechaInicio || undefined,
                      fecha_final: fechaFinal || undefined
                    });
                    fetchReporteIAP({
                      fecha_inicio: fechaInicio || undefined,
                      fecha_final: fechaFinal || undefined
                    });
                  }} />
                  <Button title='Salir' onClick={() => router.push('/')} />
                </div>
                
            </div>

          {/* Tabla de resultados CFR */}
          <div className={`rounded-3xl mt-6 shadow-md p-6 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
            <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
              CONSOLIDADO DE DEMANDA NACIONAL DE CACAO
            </h2>

            <h3 className={`text-md font-bold mt-4 mb-6 text-center ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>RECAUDO CUOTA DE FOMENTO REGULAR</h3>
  
            <div className="overflow-x-auto">
                <DynamicTable
                    columns={columnsCFR}
                    data={reporteDataCFR.registros}
                    isLoading={isLoadingCFR}
                    currentPage={reporteDataCFR.current_page}
                    totalPages={reporteDataCFR.total_pages}
                    onPageChange={handlePageChangeCFR}
                    fetchAllData={fetchAllDataCFR}

                />
            </div>

            <div className='flex flex-col md:flex-row justify-center gap-4 mt-6 col-span-8 w-full md:w-auto'>

              <div className='w-full'>
              <AnimatedInput
                label='TOTAL KILOS'
                type='text'
                value={Math.round(reporteDataCFR.sumatorias.sumatoria_kilos || 0).toLocaleString()}
                onChange={() => {}}
                name='total_kilos'
                readOnly
                darkMode={isDarkMode}
              />
              </div>

              <div className='w-full'>
                <AnimatedInput
                  label='TOTAL CF'
                  type='text'
                  value={"$ " + Math.round(reporteDataCFR.sumatorias.sumatoria_valor_cuota_fomento || 0).toLocaleString()}
                  onChange={() => {}}
                  name='total_cuota_fomento'
                  readOnly
                  darkMode={isDarkMode}
                />
              </div>

              <div className='w-full'>
              <AnimatedInput
                label='PRECIO PROMEDIO'
                type='text'
                value={"$ " + Math.round(reporteDataCFR.sumatorias.sumatoria_precio_promedio || 0).toLocaleString()}
                onChange={() => {}}
                name='precio_promedio'
                readOnly
                darkMode={isDarkMode}
              />
              </div>

              <div className='w-full'>
              <AnimatedInput
                label='TOTAL INTERESES'
                type='text'
                value={"$ " +  Math.round(reporteDataCFR.sumatorias.sumatoria_valor_intereses || 0).toLocaleString()}
                onChange={() => {}}
                name='total_intereses'
                readOnly
                darkMode={isDarkMode}
              />
              </div>
            </div>
  
          </div>

          {/* Tabla de resultados AP */}
          <div className={`rounded-3xl mt-6 shadow-md p-6 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
            <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
              CONSOLIDADO DE DEMANDA NACIONAL DE CACAO
            </h2>

            <h3 className={`text-md font-bold mt-4 mb-6 text-center ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>RECAUDO POR ACUERDOS DE PAGO</h3>
  
            <div className="overflow-x-auto">
                <DynamicTable
                    columns={columnasAcuerdosPago}
                    data={reporteDataAP.registros}
                    isLoading={isLoadingAP}
                    currentPage={reporteDataAP.current_page}
                    totalPages={reporteDataAP.total_pages}
                    onPageChange={handlePageChangeAP}
                    fetchAllData={fetchAllDataAP}
  
                />
            </div>

            <div className='flex flex-col md:flex-row justify-center gap-4 mt-6 col-span-8 w-full md:w-auto'>
              

              <div className='w-full'>
              <AnimatedInput
                label='TOTAL KILOS'
                type='text'
                value={Math.round(reporteDataAP.sumatorias.sumatoria_kilos || 0).toLocaleString()}
                onChange={() => {}}
                name='ap_total_kilos'
                readOnly
                darkMode={isDarkMode}
              />
              </div>

              <div className='w-full'>
              <AnimatedInput
                label='TOTAL CF'
                type='text'
                value={"$ " + Math.round(reporteDataAP.sumatorias.sumatoria_valor_cuota_fomento || 0).toLocaleString()}
                onChange={() => {}}
                name='ap_total_cuota_fomento'
                readOnly
                darkMode={isDarkMode}
              />
              </div>

              <div className='w-full'>
              <AnimatedInput
                label='PRECIO PROMEDIO'
                type='text'
                value={"$ " + Math.round(reporteDataAP.sumatorias.sumatoria_precio_promedio || 0).toLocaleString()}
                onChange={() => {}}
                name='ap_precio_promedio'
                readOnly
                darkMode={isDarkMode}
              />
              </div>

              <div className='w-full'>
              <AnimatedInput
                label='TOTAL INTERESES'
                type='text'
                value={"$ " + Math.round(reporteDataAP.sumatorias.sumatoria_valor_intereses || 0).toLocaleString()}
                onChange={() => {}}
                name='ap_total_intereses'
                readOnly
                darkMode={isDarkMode}
              />
              </div>
            </div>
  
          </div>

          {/* Tabla de resultados Intereses */}
          <div className={`rounded-3xl mt-6 shadow-md p-6 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
            <h2 className={`text-xl sm:text-2xl lg:text-3xl text-center font-bold my-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
              CONSOLIDADO DE DEMANDA NACIONAL DE CACAO
            </h2>

            <h3 className={`text-md font-bold mt-4 mb-6 text-center ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>RECAUDO POR INTERESES</h3>
  
            <div className="overflow-x-auto">
                <DynamicTable
                    columns={columnasIntereses}
                    data={reporteDataIAP.registros}
                    isLoading={isLoadingIAP}
                    currentPage={reporteDataIAP.current_page}
                    totalPages={reporteDataIAP.total_pages}
                    onPageChange={handlePageChangeIAP}
                    fetchAllData={fetchAllDataIAP}
                />
            </div>

            <div className='flex justify-between gap-4 mt-6 '>
              


              <div>
                
                <AnimatedInput
                label='TOTAL INTERESES'
                type='text'
                value={"$ " + Math.round(reporteDataIAP.sumatorias.sumatoria_valor_intereses || 0).toLocaleString()}
                onChange={() => {}}
                name='iap_total_intereses'
                readOnly
                darkMode={isDarkMode}
              />
              </div>
            </div>
  
          </div>
        </div>

        {/* Alertas CFR */}
        {showAlertNotificationCFR && (
          <AlertSuccess
            isOpen={showAlertNotificationCFR}
            message={alertMessageCFR}
            onClose={clearAlertsCFR}
          />
        )}

        {showErrorAlertCFR && (
          <AlertError
            isOpen={showErrorAlertCFR}
            message={errorAlertMessageCFR}
            onClose={clearAlertsCFR}
          />
        )}

        {/* Alertas AP */}
        {showAlertNotificationAP && (
          <AlertSuccess
            isOpen={showAlertNotificationAP}
            message={alertMessageAP}
            onClose={clearAlertsAP}
          />
        )}

        {showErrorAlertAP && (
          <AlertError
            isOpen={showErrorAlertAP}
            message={errorAlertMessageAP}
            onClose={clearAlertsAP}
          />
        )}

        {/* Alertas IAP */}
        {showAlertNotificationIAP && (
          <AlertSuccess
            isOpen={showAlertNotificationIAP}
            message={alertMessageIAP}
            onClose={clearAlertsIAP}
          />
        )}

        {showErrorAlertIAP && (
          <AlertError
            isOpen={showErrorAlertIAP}
            message={errorAlertMessageIAP}
            onClose={clearAlertsIAP}
          />
        )}

        {/* Alertas Descarga CF */}
        {showAlertNotificationDescargaCF && (
          <AlertSuccess
            isOpen={showAlertNotificationDescargaCF}
            message={alertMessageDescargaCF}
            onClose={clearAlertsDescargaCF}
          />
        )}

        {showErrorAlertDescargaCF && (
          <AlertError
            isOpen={showErrorAlertDescargaCF}
            message={errorAlertMessageDescargaCF}
            onClose={clearAlertsDescargaCF}
          />
        )}

        {/* Alertas Descarga AP */}
        {showAlertNotificationDescargaAP && (
          <AlertSuccess
            isOpen={showAlertNotificationDescargaAP}
            message={alertMessageDescargaAP}
            onClose={clearAlertsDescargaAP}
          />
        )}

        {showErrorAlertDescargaAP && (
          <AlertError
            isOpen={showErrorAlertDescargaAP}
            message={errorAlertMessageDescargaAP}
            onClose={clearAlertsDescargaAP}
          />
        )}

        {/* Alertas Descarga IAP */}
        {showAlertNotificationDescargaIAP && (
          <AlertSuccess
            isOpen={showAlertNotificationDescargaIAP}
            message={alertMessageDescargaIAP}
            onClose={clearAlertsDescargaIAP}
          />
        )}

        {showErrorAlertDescargaIAP && (
          <AlertError
            isOpen={showErrorAlertDescargaIAP}
            message={errorAlertMessageDescargaIAP}
            onClose={clearAlertsDescargaIAP}
          />
        )}
      </div>
    );
  };
  
  export default VerReporteCFFecha;
  