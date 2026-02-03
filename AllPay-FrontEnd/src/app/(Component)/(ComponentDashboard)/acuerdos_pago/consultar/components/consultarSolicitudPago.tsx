'use client'

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { AnimatedTextarea } from '@/presenters/components/ui/AnimatedTextarea';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { formatCurrency } from '@/utils/formatters';
import { useSession } from 'next-auth/react';
import { useVentanaEmergenteDetallesPlanesPago } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/hooks/useVentanaEmergenteDetallesPlanesPago';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import ConsultarPlanPago from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/components/consultarPlanPago';

interface ConsultRequestPaymentProps {
  nro_solicitud: number | string;
  onClose: () => void;
  isInternalUser: boolean | null;
}

const ConsultRequestPayment: React.FC<ConsultRequestPaymentProps> = ({ nro_solicitud, onClose, isInternalUser }) => {
  const { data: session } = useSession();
  const token = (session as any)?.user?.tokens?.access;
  const { data, loading } = useVentanaEmergenteDetallesPlanesPago(token, nro_solicitud, isInternalUser);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const detalle = data?.data;

  const [openPlanPago, setOpenPlanPago] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';
  
  const handleVerAcuerdoPago = () => {
    if (detalle?.doc_acuerdo_plan_pago) {
      window.open(detalle?.doc_acuerdo_plan_pago, '_blank');
    }
  }

  const handleVerPlanPago = () => {
    setOpenPlanPago(true);
  }
  
  if (!mounted) return null;

  return (
    <div className="w-full max-w-full mx-auto p-6">

      <h2 className={`text-2xl font-bold mb-8 text-center ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
        CONSULTAR SOLICITUD DE ACUERDO DE PAGO
      </h2>
      
      {loading && <div className={`text-center py-8 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Cargando información...</div>}
      {!loading && detalle && (
        <>
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex flex-col gap-7 w-full lg:w-[320px] shrink-0">
              <AnimatedInput
                label="Número Solicitud"
                name="numero_solicitud"
                type="text"
                value={String(detalle.nro_solicitud)}
                onChange={() => {}}
                disabled
                darkMode={isDarkMode}
              />
              <AnimatedInput
                label="Valor Total a Pagar"
                name="valor_total"
                type="text"
                value={formatCurrency(detalle.valor_total_facturas)}
                onChange={() => {}}
                disabled
                darkMode={isDarkMode}
              />
              <AnimatedInput
                label="Estado de Solicitud"
                name="estado_solicitud"
                type="text"
                value={detalle.estado_solicitud}
                onChange={() => {}}
                disabled
                darkMode={isDarkMode}
              />
            </div>
            <div className="w-full lg:flex-1 flex flex-col gap-6">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
                <AnimatedInput
                  label="Fecha de Solicitud"
                  name="fecha_solicitud"
                  type="date"
                  value={detalle.fecha_solicitud ? detalle.fecha_solicitud.split('T')[0] : ''}
                  onChange={() => {}}
                  disabled
                  darkMode={isDarkMode}
                />
                {detalle.documento_asociado ? (
                  <a
                    href={detalle.documento_asociado}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`py-3 px-6 rounded-xl text-md border font-semibold shadow transition cursor-pointer flex items-center justify-center ${
                      isDarkMode
                        ? 'border-white/30 text-white bg-[#260f00] hover:bg-[#3a1a00]'
                        : 'border-gray-400 text-[rgb(var(--brown))] bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    Ver documento de solicitud
                  </a>
                ) : (
                  <span className={`py-3 px-6 rounded-xl text-md border font-semibold shadow cursor-not-allowed flex items-center justify-center ${
                    isDarkMode
                      ? 'border-white/30 text-white/50 bg-[#260f00]'
                      : 'border-gray-400 text-gray-400 bg-gray-100'
                  }`}>
                    Sin documento
                  </span>
                )}
              </div>
              <div className='mt-0'>
                <AnimatedTextarea
                  disabled={true}
                  label="Observaciones"
                  name="observaciones"
                  value={detalle.observaciones || ''}
                  onChange={() => {}}
                  rows={4}
                  darkMode={isDarkMode}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-4 mt-4">
            
            <Button
              title="Ver acuerdo de pago"
              loading={loading}
              onClick={handleVerAcuerdoPago}
              disabled={detalle.doc_acuerdo_plan_pago === null}
            />

            <Button
              title="Ver plan de pago"
              loading={loading}
              onClick={handleVerPlanPago}
            />
            <Button
              title="Salir"
              onClick={onClose}
            />
          </div>
          <ModalContainer isOpen={openPlanPago} onClose={() => setOpenPlanPago(false)} size="4xl">
            <ConsultarPlanPago token={token} id_solicitud={nro_solicitud} isInternalUser={isInternalUser}/>
          </ModalContainer>
        </>
      )}
    </div>
  );
};

export default ConsultRequestPayment;
