'use client';

import { Grid, IconButton } from '@mui/material';
import axios from 'axios';
import { signIn, useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useState } from 'react';
import DynamicTable from '../../ui/DynamicTable';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useTheme } from 'next-themes';
import AnimatedSelect from '../../ui/AnimatedSelect';
import { Button } from '../../ui/AnimatedButton';
import { Chip } from '@mui/material';

import ThumbsUpDownIcon from '@mui/icons-material/ThumbsUpDown';
import Swal from 'sweetalert2';

interface FirmarDocumentoProps {
  setDetalleSeleccionado: any;
  detalleSeleccionado: any | null;
  setOpenModalAsignaciones: any;
}

const Asignaciones: React.FC<FirmarDocumentoProps> = ({
  setOpenModalAsignaciones,
  setDetalleSeleccionado
}) => {
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const baseApiUrl = process.env.BASE_API_URL;
  const valueSesion: any = session;
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [estadoAsignacion, setEstadoAsignacion] = useState<string>(''); // 👈 nuevo estado
  const [filaSeleccionada, setFilaSeleccionada] = useState<any | null>(null); // 👈 para enviar
  const opcionesEstadoAsignacion = [
    { key: 'Ac', value: 'Ac', title: 'Aceptar' },
    { key: 'Re', value: 'Re', title: 'Rechazar' }
  ];

  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Estado para controlar la carga

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  const handleEnviarDecision = async () => {
    if (!filaSeleccionada || !estadoAsignacion) return; 
    const estiloBoton = `
      ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} 
      py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300 
      hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] 
      disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 
      outline-none focus:outline-none
    `;

    try {
      const payload = {
        id_asignacion_doc: filaSeleccionada.id_asignacion_doc,
        cod_estado_asignacion: estadoAsignacion
      };

      await axios.put(`${baseApiUrl}documentos/aceptar_rechazar_asignacion/`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

       obtenerAsignaciones();
      setEstadoAsignacion('');
      setFilaSeleccionada(null);

      await Swal.fire({
        icon: 'success',
        title: 'Estado actualizado',
        text: 'La decisión fue enviada correctamente.',
        confirmButtonText: 'Aceptar',
        customClass: { confirmButton: estiloBoton },
        buttonsStyling: false
      });
    } catch (error: any) {
      console.error('Error al enviar estado de asignación:', error);

      const errorMessage = error?.response?.data?.detail || 'No se pudo actualizar el estado.';

      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'Aceptar',
        customClass: { confirmButton: estiloBoton },
        buttonsStyling: false
      });
    }
  };

  const obtenerAsignaciones = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${baseApiUrl}documentos/asignacion_documentos/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

      if (response.data.success) {
        setAsignaciones(response.data.data);
      }
    } catch (error) {
      console.error('Error al obtener asignaciones:', error);
    } finally {
      setIsLoading(false);
    }
  }, [valueSesion]);

  useEffect(() => {
    obtenerAsignaciones();
  }, [obtenerAsignaciones]);

  const columnsAsignaciones = [
  {
  key: 'cod_estado_asignacion',
  label: 'Estado',
  render: (value: string | null) => {
    let label = 'Pendiente';
    let chipProps: any = {
      variant: 'outlined',
      sx: { color: '#ED6C02', borderColor: '#ED6C02' } // Naranja para pendiente
    };

    switch (value) {
      case 'Fi':
        label = 'Finalizado';
        chipProps.sx = { color: '#4D750F', borderColor: '#4D750F' }; // Verde oscuro
        break;
      case 'Ac':
        label = 'Aceptado';
        chipProps.sx = { color: '#1976d2', borderColor: '#1976d2' }; // Azul
        break;
      case 'Re':
        label = 'Rechazado';
        chipProps.sx = { color: '#D32F2F', borderColor: '#D32F2F' }; // Rojo personalizado
        break;
      case null:
      default:
        label = 'Pendiente';
        chipProps.sx = { color: '#ED6C02', borderColor: '#ED6C02' }; // Naranja
        break;
    }

    return <Chip label={label} {...chipProps} />;
  }
},
    {
      key: 'firma',
      label: 'Firma',
      render: (value: boolean) => (value ? 'Sí' : 'No')
    },
    {
      key: 'puede_reasignar',
      label: 'Puede Reasignar',
      render: (value: boolean) => (value ? 'Sí' : 'No')
    },
    {
      key: 'fecha_asignacion',
      label: 'Fecha Asignación',
      render: (value: string) =>
        new Date(value).toLocaleString('es-CO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
    }
    
  ];

  const actionsAsignaciones = [
    {
      label: 'Ver',
      render: (row: any) => (
        <IconButton
          onClick={() => {
            setOpenModalAsignaciones(false), setDetalleSeleccionado(row);
          }}
          aria-label="Ver"
          sx={{
            color: isDarkMode ? 'white' : '#562707',
            padding: '2px',
            '&:hover': {
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(86, 39, 7, 0.1)'
            }
          }}
        >
          <VisibilityIcon fontSize="small" />
        </IconButton>
      )
    },
    {
      label: 'Elegir',
      render: (row: any) => {
        if (row.cod_estado_asignacion !== null && row.cod_estado_asignacion !== undefined) return null;
    
        return (
          <IconButton
            onClick={() => setFilaSeleccionada(row)}
            aria-label="Elegir para aceptar/rechazar"
            sx={{
              color: isDarkMode ? 'white' : '#562707',
              padding: '2px',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(86, 39, 7, 0.1)'
              }
            }}
          >
            <ThumbsUpDownIcon fontSize="small" />
          </IconButton>
        );
      }
    }
    
    
  ];

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const paginatedAsignaciones = asignaciones.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(asignaciones.length / itemsPerPage);

  return (
    <>
      <>
        <div>
          <h3
            className={`mb-4 text-center text-xl font-bold ${
              isDarkMode ? 'text-white' : 'text-[#562707]'
            }`}
          >
            Asignaciones
          </h3>
        </div>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <AnimatedSelect
              label="Estado Asignación"
              name="estadoAsignacion"
              value={estadoAsignacion}
              onChange={(e) => setEstadoAsignacion(e.target.value)}
              options={opcionesEstadoAsignacion}
              darkMode={isDarkMode}
            />
          </Grid>
        </Grid>

        <DynamicTable
          columns={columnsAsignaciones}
          data={paginatedAsignaciones}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(newPage) => setCurrentPage(newPage)}
          actions={actionsAsignaciones}
          isLoading={isLoading}  // Se pasa el estado de carga al DynamicTable
          darkMode={isDarkMode}
        />

        <Grid
          container
          marginTop={2}
          sx={{
            justifyContent: 'center',
            alignItems: 'center'
          }}
          spacing={2}
        >
          <Grid item>
            <Button
              title="Guardar"
              onClick={handleEnviarDecision}
              disabled={!filaSeleccionada || !estadoAsignacion}
            />
          </Grid>
        </Grid>
      </>
    </>
  );
};

export default Asignaciones;
