'use client'

import AnimatedInput from '@/presenters/components/ui/AnimatedInput'
import { AnimatedTextarea } from '@/presenters/components/ui/AnimatedTextarea'
import { Button } from '@/presenters/components/ui/AnimatedButton'
import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { formatCurrency } from '@/utils/formatters'
import AlertError from '../recaudadores/AlertError';


interface RequestSendPaymentProps {
  nro_solicitud: number | string;
  valor_total_pagar: number | string;
  estado: string;
  fecha_solicitud: string;
  observaciones: string;
  setObservaciones: (v: string) => void;
  file: File | null;
  setFile: (f: File | null) => void;
  onSubmit: () => void;
  loading?: boolean;
  onClose: () => void;
}

export default function RequestSendPayment({
  nro_solicitud,
  valor_total_pagar,
  estado,
  fecha_solicitud,
  observaciones,
  setObservaciones,
  file,
  setFile,
  onSubmit,
  loading,
  onClose
}: RequestSendPaymentProps) {

  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [isAlertError, setIsAlertError] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  const handleSubmit = () => {
    if (!file) {
      setMessageError('Debes adjuntar un archivo.');
      setIsAlertError(true);
      return;
    }
    onSubmit();
  };

  if (!mounted) return null;

  return (
    <div className="w-full max-w-full mx-auto p-6">  

        <AlertError isOpen={isAlertError} onClose={() => setIsAlertError(false)} message={messageError} />

        <h2 className={`text-2xl font-bold mb-8 text-center ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>
            SOLICITAR ACUERDO DE PAGO
        </h2>
          
        <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex flex-col gap-7 w-full lg:w-[320px] shrink-0">
              <AnimatedInput
                label="Número Solicitud"
                name="numero_solicitud"
                type="text"
                value={String(nro_solicitud)}
                onChange={() => {}}
                disabled
                darkMode={isDarkMode}
              />
              <AnimatedInput
                label="Valor Total a Pagar"
                name="valor_total"
                type="text"
                value={formatCurrency(valor_total_pagar)}
                onChange={() => {}}
                disabled
                darkMode={isDarkMode}
              />
              <AnimatedInput
                label="Estado de Solicitud"
                name="estado_solicitud"
                type="text"
                value={estado}
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
                  value={fecha_solicitud ? fecha_solicitud.split('T')[0] : ''}
                  onChange={() => {}}
                  disabled
                  darkMode={isDarkMode}
                />
                <label className={`py-3 px-6 rounded-xl text-md border font-semibold shadow transition cursor-pointer flex items-center justify-center ${
                  isDarkMode
                    ? 'border-white/30 text-white bg-[#260f00] hover:bg-[#3a1a00]'
                    : 'border-gray-400 text-[rgb(var(--brown))] bg-gray-100 hover:bg-gray-200'
                }`}>
                  {file ? file.name : 'CARGA DOCUMENTO DE SOLICITUD'}
                  <input type="file" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
              <div className='mt-0'>
                <AnimatedTextarea
                  label="Observaciones"
                  name="observaciones"
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  rows={4}
                  darkMode={isDarkMode}
                />
              </div>
            </div>
        </div>
     
        <div className="flex justify-end gap-4 mt-4">
            <Button
              title="Enviar"
              onClick={handleSubmit}
              loading={loading}
            />
            <Button
              title="Salir"
              onClick={onClose}
            />
        </div> 
    </div>
  )
}
