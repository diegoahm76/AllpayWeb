'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const PSEResultPage: React.FC = () => {
  const searchParams = useSearchParams();
  const [redirecting, setRedirecting] = useState<boolean>(false);
  const [transactionDetails, setTransactionDetails] = useState<any>(null);
  
  // Obtener parámetros de la URL
  const reference = searchParams.get('reference');
  const amount = searchParams.get('amount');
  const status = searchParams.get('status');
  const transactionId = searchParams.get('id'); // ID de transacción que puede enviar OpenPay
  const openpayReference = searchParams.get('openpay_reference'); // Referencia adicional de OpenPay

  useEffect(() => {
    // Recuperar información adicional del localStorage
    const storedTransactionInfo = localStorage.getItem('pse_transaction_info');
    let transactionInfo = null;
    
    if (storedTransactionInfo) {
      try {
        transactionInfo = JSON.parse(storedTransactionInfo);
        setTransactionDetails(transactionInfo);
      } catch (error) {
        console.error('[PSEResult] - Error al parsear información de transacción:', error);
      }
    }
    
    // Construir URL de retorno con todos los parámetros
    const baseReturnUrl = transactionInfo?.returnUrl || 'http://localhost:3000';
    const urlParams = new URLSearchParams();
    
    // Agregar parámetros disponibles
    if (reference) urlParams.append('pse_reference', reference);
    if (transactionId) urlParams.append('transaction_id', transactionId);
    if (amount) urlParams.append('amount', amount);
    if (status) urlParams.append('status', status);
    if (openpayReference) urlParams.append('openpay_reference', openpayReference);
    
    // Agregar información adicional de la transacción almacenada
    if (transactionInfo) {
      if (transactionInfo.customerName) urlParams.append('customer_name', transactionInfo.customerName);
      if (transactionInfo.email) urlParams.append('customer_email', transactionInfo.email);
      if (transactionInfo.description) urlParams.append('description', transactionInfo.description);
      urlParams.append('payment_timestamp', transactionInfo.timestamp);
    }
    
    // Agregar timestamp del resultado
    urlParams.append('result_timestamp', new Date().toISOString());
    
    // Construir URL final de redirección
    const finalReturnUrl = `${baseReturnUrl}?${urlParams.toString()}`;
    
    
    // Esperar un momento para mostrar el mensaje antes de redireccionar
    const timer = setTimeout(() => {
      setRedirecting(true);
      
      // Limpiar localStorage después de usar la información
      localStorage.removeItem('pse_transaction_info');
      localStorage.removeItem('pse_return_url');
      
      // Redireccionar
      window.location.href = finalReturnUrl;
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [reference, amount, status, transactionId, openpayReference]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg text-center">
        <h1 className="text-2xl font-bold text-green-600 mb-4">
          ¡Transacción Completada!
        </h1>
        
        <div className="mb-6 text-left space-y-2">
          <p className="text-gray-700">
            <strong>Detalles de la transacción:</strong>
          </p>
          
          {reference && (
            <p className="text-sm text-gray-600">
              📋 <strong>Referencia:</strong> {reference}
            </p>
          )}
          
          {transactionId && (
            <p className="text-sm text-gray-600">
              🆔 <strong>ID Transacción:</strong> {transactionId}
            </p>
          )}
          
          {amount && (
            <p className="text-sm text-gray-600">
              💰 <strong>Monto:</strong> ${parseFloat(amount).toLocaleString('es-CO')} COP
            </p>
          )}
          
          {status && (
            <p className="text-sm text-gray-600">
              📊 <strong>Estado:</strong> {status === 'pending' ? 'Pendiente' : status}
            </p>
          )}
          
          {transactionDetails?.customerName && (
            <p className="text-sm text-gray-600">
              👤 <strong>Cliente:</strong> {transactionDetails.customerName}
            </p>
          )}
          
          {transactionDetails?.description && (
            <p className="text-sm text-gray-600">
              📝 <strong>Descripción:</strong> {transactionDetails.description}
            </p>
          )}
        </div>
        
        <div className="mb-4">
          {redirecting ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-4 border-green-600 border-t-transparent rounded-full animate-spin mr-2"></div>
              <p>Redirigiendo a localhost con la información de la transacción...</p>
            </div>
          ) : (
            <p>Será redirigido a localhost en unos segundos con todos los detalles de la transacción...</p>
          )}
        </div>
        
        <p className="text-xs text-gray-500">
          Los detalles de la transacción se incluirán en la URL de redirección para su procesamiento.
        </p>
      </div>
    </div>
  );
};

export default PSEResultPage; 