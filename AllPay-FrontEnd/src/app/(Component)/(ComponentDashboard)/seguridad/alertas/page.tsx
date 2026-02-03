'use client';

import DynamicTable from '@/presenters/components/ui/DynamicTable';
import '@/presenters/css/background.css';
import { Grid } from '@mui/material';
import { signIn, useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import React, { useCallback, useEffect, useState } from 'react';
import {
  getAlertasByBandeja,
  getAlertasByBandejaPaginated,
  marcarAlertaComoLeida,
   
} from './services/roles.service';
import { Chip } from '@mui/material';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import { IconButton, Tooltip } from '@mui/material';
import LaunchIcon from '@mui/icons-material/Launch';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import VisibilityIcon from '@mui/icons-material/Visibility';

const Alertas: React.FC = () => {
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });
  const valueSesion: any = session;

  const { theme } = useTheme();
  // dentro de tu componente Alertas, junto a los otros useState:
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [
    ,
    // totalPages
    setTotalPages
  ] = useState(1);
    const [idBandeja, setIdBandeja] = useState<number | null>(null);
    



useEffect(() => {
     const stored = window.sessionStorage.getItem('bandeja');
    if (stored) {
      const parsed = JSON.parse(stored);
      setIdBandeja(parsed.id_bandeja_alerta);
    }
  }, []);

  const [alertas, setAlertas] = useState<any[]>([]);
  const router = useRouter();

  const loadPage = useCallback(async () => {
    if (!idBandeja || !valueSesion) return;

    try {
      const { data, total_pages } = await getAlertasByBandeja({
        idBandeja,
        valueSesion,
        page: currentPage,
        leido: filter === 'all' ? undefined : filter
      });

      setAlertas(data);
      setTotalPages(total_pages);

      if (data.length === 0) {
        await Swal.fire({
          icon: 'info',
          title: 'Sin alertas',
          text: 'No se encontraron alertas para estos criterios.',
          confirmButtonText: 'Aceptar',
          customClass: {
            confirmButton: 'w-[120px] py-2 rounded-2xl bg-[rgb(var(--green))] text-white'
          },
          buttonsStyling: false
        });
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  }, [idBandeja,   currentPage, filter]);

   useEffect(() => {
    loadPage(); 
  }, [ loadPage]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const columns = [
    {
      key: 'mensaje',
      label: 'Mensaje',
      render: (_: any, row: any) => <span>{row.id_alerta_generada?.mensaje || '—'}</span>
    },

    {
      key: 'responsable_directo',
      label: 'Responsable Directo',
      render: (value: boolean) => (
        <Chip
          label={value ? 'Sí' : 'No'}
          sx={{
            backgroundColor: value ? '#4D750F' : 'default',
            color: value ? 'white' : 'inherit'
          }}
          size="small"
        />
      )
    },
    {
      key: 'leido',
      label: 'Leído',
      render: (value: boolean) => (
        <Chip
          label={value ? 'Sí' : 'No'}
          sx={{
            backgroundColor: value ? '#4D750F' : 'default',
            color: value ? 'white' : 'inherit'
          }}
          size="small"
        />
      )
    },
    {
      key: 'fecha_generada',
      label: 'Fecha Generada',
      render: (_: any, row: any) => row.id_alerta_generada?.fecha_generada
        ? new Date(row.id_alerta_generada.fecha_generada).toLocaleString('es-CO', {
            dateStyle: 'short',
            timeStyle: 'short'
          })
        : 'Sin fecha'
    },

    {
      key: 'fecha_envio_email',
      label: 'Fecha Envío Email',
      render: (value: string) => value ?
        new Date(value).toLocaleString('es-CO', {
          dateStyle: 'short',
          timeStyle: 'short'
        }) : 'Sin fecha'
    },
    {
      key: 'email_usado',
      label: 'Email Usado',
      render: (value: string | null | undefined) => value?.trim() || 'Sin email asignado'
    },
    {
      key: 'mensaje',
      label: 'Ver Mensaje',
      render: (_: any, row: any) => (
        <div>
          <IconButton
            onClick={async () => {
               await marcarAlertaComoLeida({
                pk: row.id_alerta_bandeja_alerta_persona,
                valueSesion
              });

               setAlertas((prev) =>
                prev.map((alerta) =>
                  alerta.id_alerta_bandeja_alerta_persona === row.id_alerta_bandeja_alerta_persona
                    ? { ...alerta, leido: true }
                    : alerta
                )
              );

               setSelectedMessage(row.id_alerta_generada?.mensaje || '—');
              setIsModalOpen(true);
            }}
            sx={{
              color: theme === 'dark' ? 'white' : '#562707',
              '&:hover': {
                backgroundColor:
                  theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(86, 39, 7, 0.1)'
              }
            }}
          >
            <VisibilityIcon />
          </IconButton>
        </div>
      )
    },
    {
      key: 'modulo_destino',
      label: 'Ir al Módulo',
      render: (_: any, row: any) =>
        row.modulo_destino ? (
          <Tooltip title="Ir al módulo">
            <IconButton
              size="small"
              onClick={async () => {
                 await marcarAlertaComoLeida({
                  pk: row.id_alerta_bandeja_alerta_persona,
                  valueSesion
                });

                 setAlertas((prev) =>
                  prev.map((alerta) =>
                    alerta.id_alerta_bandeja_alerta_persona === row.id_alerta_bandeja_alerta_persona
                      ? { ...alerta, leido: true }
                      : alerta
                  )
                );

                 router.push(`/${row.modulo_destino}`);
              }}
              sx={{
                color: '#4D750F',
                '&:hover': {
                  backgroundColor: 'rgba(77, 117, 15, 0.1)'
                }
              }}
            >
              <LaunchIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <span>—</span>
        )
    }
  ];

  // Dentro de tu componente Alertas.tsx
  const fetchAllAlertas = async (_page: number) => {
    if (!valueSesion) {
      return { data: [], total_pages: 1 };
    }

    const stored = sessionStorage.getItem('bandeja');
    if (!stored) {
      return { data: [], total_pages: 1 };
    }
    const { id_bandeja_alerta: idBandeja } = JSON.parse(stored);

    const { data: rawData, total_pages } = await getAlertasByBandejaPaginated({
      idBandeja,
      valueSesion,

      leido: filter // 'all' | 'read' | 'unread'
    });

    const formattedData = rawData.map((alerta: any) => ({
      ...alerta,
      mensaje: alerta.id_alerta_generada?.mensaje || '—',
      fecha_generada: alerta.id_alerta_generada?.fecha_generada || 'Sin fecha',
    }));

    return {
      data: formattedData,
      total_pages
    };
  };

  const filteredAlertas = alertas.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'read') return a.leido === true;
    return a.leido === false;
  });
  const pageSize = 10;
  const paginatedAlertas = filteredAlertas.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  
  
  return (
    <>
      <ModalContainer isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="md">
        <div>
          <h3
            className={`mb-10 text-center text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
          >
            Mensaje
          </h3>
        </div>
        <p
          className={`rounded-xl border p-4 text-justify text-base leading-relaxed ${
            theme === 'dark'
              ? 'border-white/20 bg-white/5 text-gray-100'
              : 'border-[#562707]/10 bg-[#562707]/5 text-[#391a04]'
          }`}
        >
          {selectedMessage ?? 'Sin mensaje disponible'}
        </p>
      </ModalContainer>

      <div className="w-full">
        <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
          <div className="w-full p-1">
            <div
              className={`m-auto w-full rounded-xl p-6 ${
                theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'
              }`}
            >
              <div className={`rounded-xl p-4 sm:p-5 lg:p-6 relative ${theme === 'dark' ? 'dark' : 'bg-white'}`}>
                <button
                    onClick={() => router.push('/')}
                    className="absolute top-2 right-2 sm:right-4 text-xl sm:text-2xl hover:text-red-700 text-[rgb(var(--brown))]"
                >
                    &times; 
                </button>
                <div>
                  <h3
                    className={`mt-7 mb-10 text-center text-3xl font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-[#562707]'
                    }`}
                  >
                    Alertas Generadas
                  </h3>
                </div>

                <Grid container justifyContent="center" spacing={2} mb={2}>
                  {(['all', 'read', 'unread'] as const).map((f) => (
                    <Grid item key={f}>
                      <Button
                        title={f === 'all' ? 'Todos' : f === 'read' ? 'Leídos' : 'No Leídos'}
                        onClick={() => {
                          setFilter(f);
                          setCurrentPage(1);
                        }}
                        className={filter === f ? 'bg-[rgb(var(--green-80))]' : ''}
                      />
                    </Grid>
                  ))}

                
                </Grid>
                <Grid container spacing={2} marginTop={-4}>
                  <Grid item xs={12} sm={12}>
                    <DynamicTable
                      columns={columns}
                      data={paginatedAlertas} // ✅ Aquí se usa
                      currentPage={currentPage}
                      totalPages={Math.ceil(filteredAlertas.length / pageSize)} // ✅ también actualizado
                      onPageChange={setCurrentPage}
                      fetchAllData={fetchAllAlertas}
                    />
                  </Grid>
                </Grid>

                <div className="flex justify-center mt-6 gap-4">
                        <Button onClick={() => router.push('/')} title="Salir" />
                    </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Alertas;
