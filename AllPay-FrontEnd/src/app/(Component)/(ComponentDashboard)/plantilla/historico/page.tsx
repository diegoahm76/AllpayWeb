'use client';
import axios from 'axios';
import { signIn, useSession } from 'next-auth/react';
import React, { JSX, useEffect, useState } from 'react';
import '@/presenters/css/background.css';
import { Grid } from '@mui/material';
import { useTheme } from 'next-themes';
import Swal from 'sweetalert2';
import IconButton from '@mui/material/IconButton';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
 import { Button } from '@/presenters/components/ui/AnimatedButton';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import { useRouter } from 'next/navigation';

const baseApiUrl = process.env.BASE_API_URL;
const User: React.FC = () => {
  const router = useRouter();
  interface FormData {
    searchUser1: string;
    searchUser2: string;
    documentNumber: string;
    tipoPersona: string;
    documentType: string;
    fechainico: any;
    fechafin: Date | any;
    consecutivo:any;
    username: any;
  }

  const initialFormData: FormData = {
    searchUser1: '',
    searchUser2: '',
    documentNumber: '',
    tipoPersona: '',
    documentType: '',
    fechainico: '',
    fechafin: '',
    username: '',
    consecutivo:"",

  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | any>) => {
    const { name, value } = e.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });
  const { theme } = useTheme();

  const valueSesion: any = session;

  // const [openModalCreate, setModalCreate] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [user, setUser] = useState<any[]>([]);

  const buscarPersonasAll = async (page = 1): Promise<void> => {
  
    const pageNumber = Number(page);
    if (isNaN(pageNumber) || pageNumber < 1) {
      console.error('El valor de "page" no es un número válido:', page);
      await Swal.fire({
        icon: 'warning',
        title: 'Página inválida',
        text: 'El número de página debe ser un número válido mayor a 0.',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} 
            py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300 
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] 
            disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 
            outline-none focus:outline-none
          `,
        },
        buttonsStyling: false,
      });
      return;
    }
  
    const { fechainico, fechafin, tipoPersona } = formData;
  
    // Validamos fechas
    const fechaInicioValida = fechainico?.length === 10 && !isNaN(new Date(fechainico).getTime());
    const fechaFinValida = fechafin?.length === 10 && !isNaN(new Date(fechafin).getTime());
  
    if (fechaInicioValida && fechaFinValida) {
      const fechaInicio = new Date(fechainico);
      const fechaFin = new Date(fechafin);
  
      const diffInMs = fechaFin.getTime() - fechaInicio.getTime();
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  
      if (diffInDays > 31 || diffInDays < 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Rango de fechas inválido',
          text: 'La diferencia entre las fechas debe ser máximo 1 mes y la fecha final no debe ser menor que la inicial.',
          confirmButtonText: 'Aceptar',
          customClass: {
            confirmButton: `
              ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} 
              py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300 
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] 
              disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 
              outline-none focus:outline-none
            `,
          },
          buttonsStyling: false,
        });
        return;
      }
    }
  
    try {
      const url = `${baseApiUrl}auditorias/get-list/?fecha_inicio=${fechainico}&fecha_fin=${fechafin}&page=${pageNumber}&id_modulo=${tipoPersona}`;
  
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`,
        },
      });
  
      if (!response.data.success) {
        throw new Error(response.data.detail || 'Error desconocido en la API');
      }
  
      setUser(response.data.data);
      setTotalPages(response.data.total_pages);
    } catch (error: unknown) {
      console.error('Error en buscarPersonasAll:', error);
  
      let errorMessage = 'Ocurrió un problema, intenta nuevamente';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (axios.isAxiosError(error) && error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
  
      await Swal.fire({
        icon: 'error',
        title: 'Error al obtener los datos',
        text: errorMessage,
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} 
            py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300 
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] 
            disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 
            outline-none focus:outline-none
          `,
        },
        buttonsStyling: false,
      });
    } finally {
      setIsLoading(false);
    }
  };
  

   

   
  const handleBuscarClick = () => {
    buscarPersonasAll(1);
  };
  useEffect(() => {
    buscarPersonasAll(currentPage);
  }, [currentPage]);

  interface AuditoriaItem {
    id_auditoria: number;
    id_usuario: number;
    id_modulo: number;
    id_cod_permiso_accion: number;
    fecha_accion: string;
    subsistema: string;
    dirip: string;
    descripcion: string;
    valores_actualizados: string;
    nombre_modulo: string;
    nombre_de_usuario: string;
    nombre_completo: string;
    cod_tipo_documento: string;
    nombre_tipo_documento: string;
    numero_documento: string;
    nombre_permiso: string;
    cod_permiso: string;
  }

  const formatDescripcion = (descripcion: string): string => {
    try {
      const parsed = JSON.parse(descripcion);

      let formatted = '--- Nuevo Registro ---\n';

      if (parsed.Mensaje) {
        formatted += `--Mensaje: ${parsed.Mensaje} --\n\n`;
        delete parsed.Mensaje;
      }

      for (const [key, value] of Object.entries(parsed)) {
        formatted += `--${key}: ${value}\n`;
      }

      return formatted.trim();
    } catch (error) {
      // Si no es JSON válido, devolvemos el string original con separador
      return `--- Nuevo Registro ---\n${descripcion}`;
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const url = `${baseApiUrl}auditorias/get-list/?fecha_inicio=${formData.fechainico}&fecha_fin=${formData.fechafin}&page=&id_modulo=${formData.tipoPersona}`;

      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.detail || 'Error desconocido en la API');
      }

      const data = response.data?.data ?? [];
      if (data.length === 0) {
        return [];
      }

      return data.map(({
        fecha_accion,
        subsistema,
        dirip,
        descripcion,
        nombre_modulo,
        nombre_de_usuario,
        nombre_completo,
        cod_tipo_documento,
        nombre_tipo_documento,
        numero_documento,
        nombre_permiso,
        cod_permiso
      }: AuditoriaItem) => ({
        'Fecha Acción': fecha_accion
          ? new Date(fecha_accion).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
          : 'Fecha no disponible',
        'Subsistema': subsistema,
        'Dirección IP': dirip,
        'Descripción': formatDescripcion(descripcion),
        'Nombre Módulo': nombre_modulo,
        'Nombre de Usuario': nombre_de_usuario,
        'Nombre Completo': nombre_completo,
        'Código Tipo Documento': cod_tipo_documento,
        'Nombre Tipo Documento': nombre_tipo_documento,
        'Número Documento': numero_documento,
        'Nombre Permiso': nombre_permiso,
        'Código Permiso': cod_permiso
      }));
    } catch (error) {
      console.error('Error al obtener datos para Excel:', error);
      return [];
    }
  };

  const [openModal, setOpenModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const handleOpenModal = (rowData: any) => {
    setSelectedRow(rowData);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedRow(null);
  };

  const formatDescripcionForTable = (descripcion: string): JSX.Element => {
    try {
      const parsed = JSON.parse(descripcion);

      const lines = [];

      // Si tiene "Mensaje", lo ponemos primero
      if (parsed.Mensaje) {
        lines.push(`Mensaje: ${parsed.Mensaje}`);
        delete parsed.Mensaje;
      }

      // El resto de campos
      for (const [key, value] of Object.entries(parsed)) {
        lines.push(`${key}: ${value}`);
      }

      // Retornamos un <div> con cada línea separada
      return (
        <div>
          {lines.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      );
    } catch (error) {
      // Si no es JSON válido, lo mostramos tal cual
      return <div>{descripcion}</div>;
    }
  };

  const formatDescripcionForModal = (descripcion: string): JSX.Element => {
    try {
      const parsed = JSON.parse(descripcion);

      const lines = [];

      // Mostrar primero el Mensaje, si existe
      if (parsed.Mensaje) {
        lines.push(`Mensaje: ${parsed.Mensaje}`);
        delete parsed.Mensaje;
      }

      // El resto de campos
      for (const [key, value] of Object.entries(parsed)) {
        lines.push(`${key}: ${value}`);
      }

      return (
        <div className="space-y-1">
          {lines.map((line, index) => (
            <p key={index}>-- {line}</p>
          ))}
        </div>
      );
    } catch (error) {
      // Si no es JSON válido, lo mostramos tal cual
      return <p>{descripcion}</p>;
    }
  };

  const columns = [
    {
      key: 'nombre_de_usuario',
      label: 'Nombre de Usuario'
    },
    {
      key: 'nombre_completo',
      label: 'Nombre Completo'
    },
    {
      key: 'nombre_modulo',
      label: 'Nombre Módulo'
    },
    {
      key: 'fecha_accion',
      label: 'Fecha Acción',
      render: (value: string) => {
        return value
          ? new Date(value).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
          : 'Fecha no disponible';
      }
    },
    {
      key: 'descripcion',
      label: 'Descripción',
      render: (value: string) => formatDescripcionForTable(value)
    }
  ];

  const actions = [
    {
      label: 'Ver',
      render: (row: any) => (
        <IconButton
          onClick={() => handleOpenModal(row)}
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
      )
    }
  ];

  return (
    <div className="w-full">
      <>
        <>
          <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
            <div className="w-full p-1">
              <div
                className={`m-auto w-full rounded-xl p-6 ${theme === 'dark' ? 'bg-[#260f00]' : 'bg-slate-200'}`}
              >
                <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>
                  <div>
                    <h3
                      className={`mt-[20px] mb-10 text-center text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                    >
                      Histórico 
                    </h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div></div>
                  </div>

                  <Grid container spacing={2} className="mb-4">
                    <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                      <AnimatedInput
                        type="date"
                        name="fechainico"
                        id="fechainico"
                        label="Fecha de inicio"
                        value={formData.fechainico}
                        onChange={handleChange}
                        darkMode={theme === 'dark'}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                      <AnimatedInput
                        type="date"
                        name="fechafin"
                        id="fechafin"
                        label="Fecha de finalización"
                        value={formData.fechafin}
                        onChange={handleChange}
                        darkMode={theme === 'dark'}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                          <AnimatedInput
                  type="text"
                  id="consecutivo"
                  name="consecutivo"
                  label="Consecutivo"
                  value={formData.consecutivo}
                  onChange={handleChange}
                  darkMode={theme === 'dark'}
                />
                    </Grid>

                


                  </Grid>

                  <Grid container spacing={2} className="mb-4 justify-center overflow-x-auto">
                    <Grid item>
                      <Button title="Buscar" onClick={() => handleBuscarClick()} />
                    </Grid>

                    <Grid item>
                      <Button title="Limpiar" onClick={() => setFormData(initialFormData)} />
                    </Grid>

                    <Grid item>
                      <Button title="Salir" onClick={() => router.push('/')} />
                    </Grid>
                  </Grid>
                </div>

                <div className={`mt-7 rounded-xl p-4 ${theme === 'dark' ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}>
                  <Grid
                    container
                    spacing={2}
                    marginTop={-7}
                    direction="row"
                    sx={{
                      justifyContent: 'space-around',
                      alignItems: 'center'
                    }}
                  >
                    <Grid item xs={12} sm={10} md={10} lg={10} xl={10}>
                      <h3
                        className={`mt-[55px] mb-10 ml-27 text-center text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                      >
                        Resultados de Historial
                      </h3>
                    </Grid>
                  </Grid>

                  <Grid
                    container
                    spacing={2}
                    marginTop={2}
                    marginLeft={-1}
                    direction="row"
                    sx={{
                      justifyContent: 'space-around',
                      alignItems: 'center'
                    }}
                  >
                    <DynamicTable
                      columns={columns}
                      data={user}
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      actions={actions}
                      isLoading={isLoading}
                      onDownloadExcel={handleDownloadExcel}
                    />
                  </Grid>

                  <ModalContainer isOpen={openModal} onClose={() => setOpenModal(false)}>
                    <div className="space-y-4">
                      <div>
                        <h3
                          className={`mb-10 text-center text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'}`}
                        >
                          AUDITORÍA
                        </h3>
                      </div>
                      {selectedRow && (
                        <div className={`space-y-2 ${theme === 'dark' ? 'text-white' : ''}`}>
                          <p>
                            <strong>Nombre Usuario:</strong> {selectedRow.nombre_de_usuario}
                          </p>
                          <p>
                            <strong>Nombre Completo:</strong> {selectedRow.nombre_completo}
                          </p>
                          <p>
                            <strong>Nombre Módulo:</strong> {selectedRow.nombre_modulo}
                          </p>
                          <p>
                            <strong>Fecha Acción:</strong>{' '}
                            {selectedRow.fecha_accion
                              ? new Date(selectedRow.fecha_accion).toLocaleString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })
                              : 'Fecha no disponible'}
                          </p>
                          <div>
                            <strong>Descripción:</strong>
                            <div className="mt-1">
                              {formatDescripcionForModal(selectedRow.descripcion)}
                            </div>
                          </div>
                        </div>
                      )}{' '}
                      <Grid
                        container
                        direction="row"
                        marginTop={2}
                        sx={{
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                      >
                        <Button title="Cerrar" onClick={handleCloseModal} />
                      </Grid>
                    </div>
                  </ModalContainer>
                </div>
              </div>
            </div>
          </div>
        </>
      </>
    </div>
  );
};

export default User;
