/**
 * ConsultaCarteraDeudores.tsx
 * 
 * Componente principal para la consulta de Cartera de Deudores.
 * 
 * Funcionalidades:
 * - Búsqueda de recaudadores
 * - Visualización de datos de cartera con todas las columnas requeridas
 * - Filtros por fechas
 * - Selección única de registros mediante radio button
 */
'use client';
import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { signIn } from 'next-auth/react';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
// Importamos los componentes de alerta personalizados
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertNotification from '@/presenters/components/recaudadores/AlertNotification';
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
//import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';
// Importamos los componentes de información de usuario
import { ExternalUserInfo } from '@/presenters/components/recaudadores/ExternalUserInfo';
import { InternalUserInfo } from '@/presenters/components/recaudadores/InternalUserInfo';
// Importamos el hook personalizado para cartera en mora
import { useCarteraMora } from '../hooks/useCarteraMora';
import { FacturaCarteraMora, FormDataCarteraMora } from '../models/carteraConsulta.model';

const ConsultaCarteraDeudores: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });
  
  const [mounted, setMounted] = useState(false);
  // Estado para el radio button seleccionado
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';
  
    const tipoUsuario = (session as any)?.user?.tipo_usuario;
  
  // Mejorar la detección de usuario interno para considerar cualquier valor que comience con 'I' o 'INTERNO'
  const isInternal = tipoUsuario === 'INTERNO' || 
                     tipoUsuario === 'I' || 
                     tipoUsuario?.startsWith('I') || 
                     tipoUsuario?.startsWith('INTERNO');
  
  // Usar el hook personalizado para cartera en mora
  const {
    formData,
    carteraMora,
    isLoading,
    alertState,
    currentPage,
    totalPages,
    handleInputChange,
    handleSearch,
    handleClearSearch,
    handlePageChange,
    fetchAllDataForExcel,
    formatDate,
    formatNumber,
    formatCurrency,
    closeAlertNotification,
    closeErrorAlert,
    closeAlertSuccess,
    setFormData
  } = useCarteraMora();

  // Función para manejar el cambio de radio button
  const handleRadioChange = (row: FacturaCarteraMora) => {
    setSelectedRow(row.id);
  };

  // Función para manejar el recaudador encontrado (para compatibilidad con InternalUserInfo)
  const handleFoundCollector = (numero_documento: string) => {
    
    // Actualizar el formulario con los datos del recaudador encontrado
    if (numero_documento) {
      setFormData((prev: FormDataCarteraMora) => ({
        ...prev,
        documentoRecaudador: numero_documento
      }));
      
      // El useEffect se encargará de ejecutar la búsqueda automáticamente
      // cuando detecte el cambio en documentoRecaudador
    }
  };


  // Definición de columnas para la tabla de Cartera en Mora (adaptada a la nueva estructura)
  const columns = [
    {
      key: 'documento_recaudador',
      label: 'N° DOCUMENTO RECAUDADOR',
      render: (value: string) => value || 'N/A'
    },
    {
      key: 'razon_social_recaudador',
      label: 'RAZÓN SOCIAL',
      render: (value: string) => value || 'N/A'
    },
    {
      key: 'fecha_compra',
      label: 'FECHA DE COMPRA',
      render: (value: string) => value ? formatDate(value) : 'N/A'
    },
    {
      key: 'nro_factura_unica',
      label: 'N° FACTURA ÚNICA',
      render: (value: string) => value || 'N/A'
    },
    {
      key: 'valor_bruto',
      label: 'VALOR BRUTO',
      render: (value: number) => value ? formatCurrency(value) : '$0'
    },
    {
      key: 'cuota_fomento',
      label: 'CUOTA FOMENTO',
      render: (value: number) => value ? formatCurrency(value) : '$0'
    },
    {
      key: 'valor_neto',
      label: 'VALOR NETO',
      render: (value: number) => value ? formatCurrency(value) : '$0'
    },
    {
      key: 'dias_mora',
      label: 'DÍAS EN COACTIVO',
      render: (value: number) => value ? formatNumber(value) : '0'
    },
    {
      key: 'valor_intereses',
      label: 'VALOR DE INTERÉS',
      render: (value: number) => value ? formatCurrency(value) : '$0'
    },
    {
      key: 'estado_acuerdo_pago',
      label: 'ESTADO COACTIVO',
      render: (value: string) => value || 'N/A'
    }
  ];

  // Definición de acciones para cada fila - Solo radio button de selección
  const actions = [
    {
      label: 'Seleccionar',
      render: (row: FacturaCarteraMora) => (
        <input
          type="radio"
          name="carteraDeudor"
          checked={selectedRow === row.id}
          onChange={() => handleRadioChange(row)}
          className="h-4 w-4 text-[#78390e] border-gray-300 cursor-pointer focus:ring-[#78390e]"
        />
      )
    }
  ];

  // Renderizado de la tabla de resultados
  const renderTablaResultados = () => {
    return (
      <div className="overflow-x-auto w-full">
        <DynamicTable
          columns={columns}
          data={carteraMora}
          actions={actions}
          isLoading={isLoading}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          downloadButtonPosition="top"
          fetchAllData={fetchAllDataForExcel}
        />
        
        {/* Botón Ver Acciones debajo de la tabla */}
        {carteraMora.length > 0 && (
          <div className="flex justify-center mt-6">
            <Button
              onClick={() => {
                if (selectedRow) {
                  // Buscar la factura seleccionada para obtener su información completa
                  const facturaSeleccionada = carteraMora.find(factura => factura.id === selectedRow);
                  if (facturaSeleccionada) {
                    const facturaIdReal = (facturaSeleccionada as any).id_factura_unica ?? selectedRow;
                    const nroFactura = facturaSeleccionada.nro_factura_unica;
                    const coactivoId = (facturaSeleccionada as any).id_cobro_coactivo;
                    const params = new URLSearchParams({
                      facturaId: String(facturaIdReal),
                      nroFactura: String(nroFactura)
                    });
                    if (coactivoId) params.append('coactivoId', String(coactivoId));
                    router.push(`/coactivo/acciones?${params.toString()}`);
                  }
                } 
              }}
              title="Ver Acciones"
              disabled={!selectedRow}
            />
          </div>
        )}
      </div>
    );
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="w-full max-w-full mx-auto px-2 sm:px-4 md:px-6">
      {/* Componentes de alertas */}
      <AlertError 
        isOpen={alertState.showErrorAlert} 
        onClose={closeErrorAlert} 
        message={alertState.errorAlertMessage} 
      />
      
      <AlertNotification
        isOpen={alertState.showAlertNotification}
        onClose={closeAlertNotification}
        notificationText={alertState.alertMessage}
      />

      <AlertSuccess
        isOpen={alertState.showAlertSuccess}
        onClose={closeAlertSuccess}
        message={alertState.alertMessage}
        autoCloseMs={3000}
      />
      
      
      <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}>
        <div className={`rounded-xl p-6 relative ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>
          <button
            onClick={() => router.push('/')}
            className={`absolute top-2 right-4 text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
          >
            &times;
          </button>
          <h3 className={`text-xl sm:text-2xl lg:text-3xl my-6 font-bold text-center ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
            PROCESO COACTIVO CARTERA EN MORA
          </h3>
          
          {/* Información del usuario - Condicional según tipo de usuario */}
          {isInternal ? (
            <InternalUserInfo onFoundCollector={handleFoundCollector} />
          ) : (
            <ExternalUserInfo />
          )}

          {/* Formulario de filtros - Solo fechas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <AnimatedInput
              label="Fecha de Inicio"
              name="fechaInicio"
              type="date"
              value={formData.fechaInicio}
              onChange={handleInputChange}
              darkMode={isDarkMode}
            />

            <AnimatedInput
              label="Fecha Fin"
              name="fechaFinalizacion"
              type="date"
              value={formData.fechaFinalizacion}
              onChange={handleInputChange}
              darkMode={isDarkMode}
            />
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <Button
              onClick={handleSearch}
              title={isLoading ? "Cargando..." : "Buscar"}
              disabled={isLoading}
            />
            <Button
              onClick={handleClearSearch}
              title="Limpiar"
              disabled={isLoading}
            />
            <Button
              onClick={() => router.push('/')}
              title="Salir"
            />
          </div>
        </div>
    
          <div className="flex w-full items-center justify-center">
            <div className="w-full p-1">
                <div className={`rounded-xl p-2 sm:p-4 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'} relative mt-4`}>
                  <div className="relative flex flex-col justify-center items-center mt-[10px]">
                    <h3 className={`text-center text-xl sm:text-2xl lg:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                      LISTA DE CARTERA EN MORA
                    </h3>
                  </div>

                  <div className="mt-4 sm:mt-6 overflow-x-auto">
                    {isLoading ? (
                      <div className="flex justify-center items-center p-4 sm:p-8">
                        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-[#78390e]"></div>
                        <span className={`ml-2 ${isDarkMode ? 'text-white' : 'text-[#78390e]'}`}>Cargando...</span>
                      </div>
                    ) : (
                      renderTablaResultados()
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>
  );
};

export default ConsultaCarteraDeudores;
