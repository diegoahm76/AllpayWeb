'use client';

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { useHistoricoDireccion } from '../hooks/useHistoricoDireccion';
import { HistoricoDireccionModalProps } from '../models/historicodireccion.model';
import { formatearFechaRobustaDMY } from '@/utils/dateUtils';

const HistoricoDireccionModal: React.FC<HistoricoDireccionModalProps> = ({
  isOpen,
  onClose,
  personaId,
}) => {
  const { theme } = useTheme();
  const { data: session } = useSession();
  const token = (session as any)?.user?.tokens?.access;
  
  const {
    isLoading,
    error,
    data,
    fetchHistoricoDireccion,
    clearData
  } = useHistoricoDireccion();

  useEffect(() => {
    if (isOpen && token && personaId) {
      fetchHistoricoDireccion(token, personaId);
    }
    
    return () => {
      if (!isOpen) {
        clearData();
      }
    };
  }, [isOpen, token, personaId, fetchHistoricoDireccion, clearData]);

  const columns = [
    {
      key: 'direccion',
      label: 'Dirección'
    },
    {
      key: 'tipo_direccion',
      label: 'Tipo Dirección'
    },
    {
      key: 'cod_municipio',
      label: 'Código Municipio'
    },
    {
      key: 'cod_pais_exterior',
      label: 'País Exterior',
      render: (_: any, row: any) => {
        if (!row) return 'N/A';
        return row.cod_pais_exterior || 'N/A';
      }
    },
    {
      key: 'fecha_cambio',
      label: 'Fecha Cambio',
      render: (_: any, row: any) => {
        if (!row || !row.fecha_cambio) return 'N/A';
        
        try {
          return formatearFechaRobustaDMY(row.fecha_cambio);
        } catch {
          // Si falla el formateo, intenta formatear manualmente
          try {
            const fecha = new Date(row.fecha_cambio);
            return fecha.toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
          } catch {
            return row.fecha_cambio; // Fallback al valor original
          }
        }
      }
    }
  ];

  if (!isOpen) return null;

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
    >
      <div className="min-h-[400px]">
        <h2 className={`text-2xl font-bold mb-6 text-center ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}>
          Historial de Direcciones
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <p><strong>Error:</strong> {error}</p>
          </div>
        )}

        <div className="mt-4">
          <DynamicTable
            columns={columns}
            data={data}
            currentPage={1}
            totalPages={1}
            onPageChange={() => {}}
            actions={[]}
            isLoading={isLoading}
            fetchAllData={async () => ({ data, total_pages: 1 })}
          />
        </div>
      </div>
    </ModalContainer>
  );
};

export default HistoricoDireccionModal; 