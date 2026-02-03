import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import { usePazSalvoDetalle } from '../hooks/usePazSalvoDetalle';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import { formatNumberWithCommas } from '@/utils/formatters';

interface PazSalvoDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  pazSalvoId: number;
  token: string;
}

const PazSalvoDetalleModal: React.FC<PazSalvoDetalleModalProps> = ({
  isOpen,
  onClose,
  pazSalvoId,
  token
}) => {
  const { theme } = useTheme();
  const {
    detallesPazSalvo,
    isLoading,
    error,
    showErrorAlert,
    setShowErrorAlert,
    errorMessage,
    fetchPazSalvoDetalle,
    clearDetallesPazSalvo
  } = usePazSalvoDetalle();

  // Estado para manejar la paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // 10 registros por página
  
  // Estado para almacenar el número de paz y salvo para mostrar en el título
  const [numeroPazSalvo, setNumeroPazSalvo] = useState<string>('');

  useEffect(() => {
    if (isOpen && pazSalvoId && token) {
      fetchPazSalvoDetalle(token, pazSalvoId);
      // Reiniciar la página actual cuando se abre el modal con nuevos datos
      setCurrentPage(1);
    }
    
    return () => {
      if (!isOpen) {
        clearDetallesPazSalvo();
      }
    };
  }, [isOpen, pazSalvoId, token]);
  
  // Efecto para obtener el número de paz y salvo cuando se cargan los detalles
  useEffect(() => {
    if (detallesPazSalvo.length > 0 && detallesPazSalvo[0].numero_paz_y_salvo) {
      setNumeroPazSalvo(detallesPazSalvo[0].numero_paz_y_salvo);
    }
  }, [detallesPazSalvo]);

  // Gestión de paginación
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Obtener los datos de la página actual
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return detallesPazSalvo.slice(startIndex, endIndex);
  };

  // Calcular el número total de páginas
  const totalPages = Math.ceil(Math.max(1, detallesPazSalvo.length) / itemsPerPage);

  if (!isOpen) return null;

  // Formatear fecha para mostrar
  const formatDate = (value: string) => {
    if (!value) return 'N/A';
    const fecha = new Date(value);
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Formatear moneda para mostrar
  const formatCurrency = (value: number | string) => {
    if (value === undefined || value === null) return 'N/A';
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numericValue);
  };

  // Definición de columnas para la tabla
  const columns = [
    {
      key: 'nombre_factura',
      label: 'Factura',
      render: (value: string) => value || 'N/A'
    },
    {
      key: 'fecha_registro_factura',
      label: 'Fecha de Registro',
      render: (value: string) => formatDate(value)
    },
    {
      key: 'numero_factura',
      label: 'Número de Factura',
      render: (value: number) => value || 'N/A'
    },
    {
      key: 'departamento',
      label: 'Departamento',
      render: (value: string) => value || 'N/A'
    },
    {
      key: 'municipio',
      label: 'Municipio',
      render: (value: string) => value || 'N/A'
    },
    {
      key: 'fecha_compra',
      label: 'Fecha de Compra',
      render: (value: string) => formatDate(value)
    },
    {
      key: 'kilos_reportados',
      label: 'Kilos Reportados',
      render: (value: number) => {
        return formatNumberWithCommas(value.toString());
      }
    },
    {
      key: 'cuota_fomento',
      label: 'Cuota de Fomento',
      render: (value: number) => {
        return formatCurrency(value);
      }
    },
    {
      key: 'kilos_con_paz_y_salvo',
      label: 'Kilos con Paz y Salvo',
      render: (value: number) => {
        return formatNumberWithCommas(value.toString());
      }
    },
    {
      key: 'kilos_a_reportar',
      label: 'Kilos a Reportar',
      render: (value: number) => {
        return formatNumberWithCommas(value.toString());
      }
    },
    {
      key: 'razon_social_tercero',
      label: 'Razón Social Tercero',
      render: (value: string) => value || 'N/A'
    },
    {
      key: 'numero_documento',
      label: 'Número Documento Tercero',
      render: (value: string) => value || 'N/A'
    }
  ];

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      size="6xl"
    >
      <>
        {/* Alertas */}
        <AlertError 
          isOpen={showErrorAlert} 
          onClose={() => setShowErrorAlert(false)} 
          message={errorMessage} 
        />
        
        <h2 className={`text-2xl font-bold mb-6 text-center ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
          Detalle de Paz y Salvo {numeroPazSalvo ? `# ${numeroPazSalvo}` : ''}
        </h2>
        
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#78390e]"></div>
            <span className={`ml-2 ${theme === 'dark' ? 'text-white' : 'text-[#78390e]'}`}>Cargando detalles...</span>
          </div>
        ) : error ? (
          <div className={`p-4 rounded-md ${theme === 'dark' ? 'bg-red-900 text-white' : 'bg-red-100 text-red-800'}`}>
            <p>{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DynamicTable
              columns={columns}
              data={detallesPazSalvo.length > 0 ? getCurrentPageData() : []}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              downloadButtonPosition="top"
            />
          </div>
        )}
        
        <div className="flex justify-center mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#4D750F] text-white rounded-md hover:bg-[#3a5a0b] transition-colors"
          >
            Cerrar
          </button>
        </div>
      </>
    </ModalContainer>
  );
};

export default PazSalvoDetalleModal; 