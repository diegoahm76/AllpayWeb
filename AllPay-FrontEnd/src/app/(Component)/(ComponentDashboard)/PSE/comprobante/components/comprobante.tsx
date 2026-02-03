'use client';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { signIn } from 'next-auth/react';
import { useComprobante } from '../hooks/useComprobante';
import { parseComprobanteParams, validateComprobanteParams, getCodigoPagoFromParams } from '../utils/comprobanteUrlUtils';
import SecureInput from './SecureInput';
import Logo from '@/presenters/components/shared/logo/Logo';
import LogoPSE from '@/presenters/components/shared/logo/LogoPSE';

const ComprobanteComponent: React.FC = () => {
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  
  // Estado para manejar el código de pago realizado
  const [codPagoRealizado, setCodPagoRealizado] = useState<string>('');
  
  // Parsear parámetros de la URL usando utilidades
  const urlParams = parseComprobanteParams(searchParams);
  const isValidParams = validateComprobanteParams(urlParams);
  
  console.log('[ComprobanteComponent] - Parámetros parseados de URL:', { 
    ...urlParams,
    isValid: isValidParams
  });
  
  // Obtener la sesión - solo para autenticación
  const { status: sessionStatus } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  // Efecto para determinar el código de pago realizado desde URL
  useEffect(() => {
    const codigoPago = getCodigoPagoFromParams(searchParams);
    
    if (codigoPago) {
      console.log('[ComprobanteComponent] - Usando código de pago desde URL:', codigoPago);
      console.log('[ComprobanteComponent] - Detalles de parámetros URL:', {
        id: searchParams.get('id'),
        orderId: searchParams.get('orderId'), 
        reference: searchParams.get('reference'),
        cod_pago_realizado: searchParams.get('cod_pago_realizado'),
        codigoFinal: codigoPago
      });
      setCodPagoRealizado(codigoPago);
    } else {
      console.warn('[ComprobanteComponent] - No se encontró código de pago en parámetros URL');
    }
  }, [searchParams]);

  // Usar el hook para obtener los datos del comprobante
  const {
    comprobante,
    isLoading,
    error,
    formatDate,
    formatEstadoPago,
    fetchByCode,
    hasToken
  } = useComprobante({
    codPagoRealizado: codPagoRealizado,
    autoFetch: !!codPagoRealizado // Solo hacer fetch automático si tenemos el código
  });

  // Si aún está cargando la sesión, mostrar un loader
  if (sessionStatus === 'loading') {
    return (
      <div className="flex justify-center items-center h-[500px]">
        <div className="w-12 h-12 border-4 border-[#4D750F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Si no hay token, mostrar mensaje de error
  if (!hasToken) {
    return (
      <div className="flex justify-center items-center h-[500px]">
        <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-red-900 text-red-100' : 'bg-red-50 text-red-700'}`}>
          <p className="text-center">No se encontró el token de autenticación. Por favor, inicie sesión nuevamente.</p>
        </div>
      </div>
    );
  }

  // Si no hay código de pago realizado, mostrar mensaje de error
  if (!codPagoRealizado) {
    return (
      <div className="flex justify-center items-center h-[500px]">
        <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-yellow-900 text-yellow-100' : 'bg-yellow-50 text-yellow-700'}`}>
          <div className="text-center">
            <p className="mb-4">No se encontró la referencia del pago en la URL.</p>
            <p className="text-sm">
              El comprobante se genera automáticamente después de completar un pago PSE.
            </p>
            {/* Mostrar información de debug si hay parámetros parciales */}
            {(urlParams.amount || urlParams.customerName || urlParams.email) && (
              <div className="mt-4 text-xs bg-gray-100 p-2 rounded">
                <p>Parámetros detectados:</p>
                {urlParams.orderId && <p>Order ID: {urlParams.orderId}</p>}
                {urlParams.id && <p>OpenPay ID: {urlParams.id}</p>}
                {urlParams.amount && <p>Amount: {urlParams.amount}</p>}
                {urlParams.customerName && <p>Customer: {urlParams.customerName}</p>}
                {urlParams.email && <p>Email: {urlParams.email}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'dark' : 'bg-white'}`}>
        <h3 className={`text-2xl font-bold text-center mb-6 ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
          Comprobante de Pago - Cuota de Fomento Cacaotero
        </h3>

        {/* Información de la transacción desde URL (mientras carga) */}
        {(urlParams.customerName || urlParams.email || urlParams.description) && !comprobante && !isLoading && (
          <div className={`mb-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e] border border-gray-700' : 'bg-blue-50 border border-blue-200'}`}>
            <h4 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
              Información de la Transacción
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {urlParams.orderId && (
                <div>
                  <span className="font-medium">ID de Orden:</span> {urlParams.orderId}
                </div>
              )}
              {urlParams.id && (
                <div>
                  <span className="font-medium">ID OpenPay:</span> {urlParams.id}
                </div>
              )}
              {urlParams.amount && (
                <div>
                  <span className="font-medium">Monto:</span> ${urlParams.amount.toLocaleString('es-CO')}
                </div>
              )}
              {urlParams.customerName && (
                <div>
                  <span className="font-medium">Cliente:</span> {urlParams.customerName}
                </div>
              )}
              {urlParams.email && (
                <div>
                  <span className="font-medium">Email:</span> {urlParams.email}
                </div>
              )}
              {urlParams.description && (
                <div className="col-span-full">
                  <span className="font-medium">Descripción:</span> {urlParams.description}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Logos */}
        <div className={`flex justify-between items-center mb-10 px-8 py-6 rounded-lg ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e] border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <div className="w-2/5 flex flex-col items-center">
            <Logo />
          </div>
          <div className="flex-grow flex justify-center">
            <div className={`h-16 w-0.5 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
          </div>
          <div className="w-2/5 flex flex-col items-center">
            <LogoPSE />
          </div>
        </div>
        
        {/* Mostrar loader mientras se cargan los datos */}
        {isLoading && (
          <div className="flex justify-center items-center py-10">
            <div className="w-8 h-8 border-4 border-[#4D750F] border-t-transparent rounded-full animate-spin mr-3" />
            <span className={theme === 'dark' ? 'text-white' : 'text-[#562707]'}>
              Cargando datos del comprobante...
            </span>
          </div>
        )}
        
        {/* Mostrar error si ocurre */}
        {error && (
          <div className={`mb-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-red-900 text-red-100' : 'bg-red-50 text-red-700'}`}>
            <div className="flex items-center justify-between">
              <p><strong>Error:</strong> {error}</p>
              <button 
                onClick={() => fetchByCode(codPagoRealizado)}
                className={`px-3 py-1 rounded-md ${theme === 'dark' ? 'bg-red-700 hover:bg-red-600' : 'bg-red-100 hover:bg-red-200'} transition-colors`}
              >
                Reintentar
              </button>
            </div>
          </div>
        )}
        
        {/* Mostrar datos del comprobante */}
        {comprobante && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Fecha de Pago */}
              <div className="col-span-1">
                <SecureInput
                  label="FECHA DE PAGO"
                  value={comprobante.pago.fecha_pago ? formatDate(comprobante.pago.fecha_pago) : 'Pendiente'}
                />
              </div>
              
              {/* Número Documento */}
              <div className="col-span-1">
                <SecureInput
                  label="NÚMERO DOCUMENTO"
                  value={comprobante.pago.numero_documento_pago}
                />
              </div>
              
              {/* Valor del Pago */}
              <div className="col-span-1">
                <SecureInput
                  label="VALOR DEL PAGO"
                  value={comprobante.pago.valor_pagado.toString()}
                  type="currency"
                />
              </div>
              
              {/* Valor Cuota de Fomento */}
              <div className="col-span-1">
                <SecureInput
                  label="VALOR CUOTA DE FOMENTO"
                  value={comprobante.pago.valor_cuota_fomento.toString()}
                  type="currency"
                />
              </div>
              
              {/* Valor Intereses */}
              <div className="col-span-1">
                <SecureInput
                  label="VALOR INTERESES"
                  value={comprobante.pago.valor_intereses.toString()}
                  type="currency"
                />
              </div>
              
              {/* Estado */}
              <div className="col-span-1">
                <SecureInput
                  label="ESTADO"
                  value={formatEstadoPago(comprobante.pago.cod_estado_pago)}
                />
              </div>
              
              {/* Código de Autorización */}
              <div className="col-span-1">
                <SecureInput
                  label="CÓDIGO DE AUTORIZACIÓN"
                  value={comprobante.pago.cod_pago_realizado}
                />
              </div>
              
              {/* Medio de Pago */}
              <div className="col-span-1">
                <SecureInput
                  label="MEDIO DE PAGO"
                  value={comprobante.pago.cod_medio_pago}
                />
              </div>
            </div>

            {/* Sección de Datos del Cliente */}
            <div className={`mt-8 p-4 rounded-lg ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e] border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
              <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
                DATOS DEL CLIENTE
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Nombre */}
                <div className="col-span-1">
                  <SecureInput
                    label="NOMBRE"
                    value={`${comprobante.pago.nombres_persona_paga} ${comprobante.pago.apellidos_persona_paga}`}
                  />
                </div>
                
                {/* Correo Electrónico */}
                <div className="col-span-1">
                  <SecureInput
                    label="CORREO ELECTRÓNICO"
                    value={comprobante.pago.email_persona_paga}
                  />
                </div>
                
                {/* Referencia del Pago */}
                <div className="col-span-1">
                  <SecureInput
                    label="REFERENCIA DEL PAGO"
                    value={comprobante.pago.cod_pago_realizado}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-8">
                  <a
                    href={comprobante.documento.archivo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#4D750F] hover:bg-[#3a5a0a] text-white px-4 py-2 rounded-md transition-colors flex items-center"
                  >
                    Ver Comprobante PDF
                  </a>
                </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ComprobanteComponent;

