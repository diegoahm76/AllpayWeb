'use client';
import axios from 'axios';
import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import '@/presenters/css/background.css';
import { useTheme } from 'next-themes';
import Swal from 'sweetalert2';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useRouter } from 'next/navigation';
import Editar from '@/presenters/components/shared/logo/LogoEditar';
import Delet_icon from '@/presenters/components/shared/logo/logodelet';

const baseApiUrl = process.env.BASE_API_URL;
const Administracion_cargos: React.FC = () => {
  const router = useRouter();
  interface FormData {
    nombre: any;
  }

  const initialFormData: FormData = {
    nombre: ''
  };

  const fieldTypes: { [key: string]: 'string' } = {
    nombre: 'string'
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | any>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: fieldTypes[name] === 'string' ? value : value
    }));
  };

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  const valueSesion: any = session;

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [user, setUser] = useState<any[]>([]);

  const buscarPersonasAll = async (page = 1): Promise<void> => {

    const pageNumber = Number(page);
    if (isNaN(pageNumber) || pageNumber < 1) {
      console.error('El valor de "page" no es un número válido:', page);
      Swal.fire({
        icon: 'warning',
        title: 'Página inválida',
        text: 'El número de página debe ser un número válido mayor a 0.'
      });
      return;
    }

    try {
      const url = `${baseApiUrl}personas/cargos/get-list/`;

      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
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
      console.log(errorMessage);


    } finally {
      setIsLoading(false);
    }
  };

  const columns = [{ key: 'nombre', label: 'Nombre' }];

  const actions = [
    {
      label: 'Editar',
      render: (row: any) => (
        <button
          onClick={() => {
            handleEdit(row);
            setShowModal(true);
          }}
        >
          <Editar />
        </button>
      )
    },
    {
      label: 'Eliminar',
      render: (row: any) => (
        <button onClick={() => handleDeleteCargo(row.id_cargo)}>
         <Delet_icon />
        </button>
      )
    }
  ];

  useEffect(() => {
    buscarPersonasAll(currentPage);
  }, [currentPage]);

  const handleCreateCargo = async () => {
    if (!formData.nombre.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'Debes ingresar un nombre para el cargo.',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2
          `
        },
        buttonsStyling: false
      });
      return;
    }

    try {
      const response = await axios.post(
        `${baseApiUrl}personas/cargos/create/`,
        { nombre: formData.nombre },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${valueSesion.user.tokens.access}`
          }
        }
      );

      if (response.data.success) {
        await Swal.fire({
          icon: 'success',
          title: '¡Cargo creado!',
          text: 'El nuevo cargo se ha creado correctamente.',
          confirmButtonText: 'Aceptar',
          customClass: {
            confirmButton: `
              ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
              flex items-center justify-center gap-2
            `
          },
          buttonsStyling: false
        });

        buscarPersonasAll();
        setFormData((prev) => ({ ...prev, nombre: '' }));
        setShowModalcrear(false);
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: response.data.detail || 'Ocurrió un error al crear el cargo.',
          confirmButtonText: 'Aceptar',
          customClass: {
            confirmButton: `
              ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
              flex items-center justify-center gap-2
            `
          },
          buttonsStyling: false
        });
      }
    } catch (error: any) {
      const mensaje = error?.response?.data?.detail || 'Ocurrió un error al crear el cargo.';
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: mensaje,
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2
          `
        },
        buttonsStyling: false
      });
    }
  };

  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleEdit = (user: any) => {
    setFormData({
      nombre: user.nombre
    });
    setSelectedId(user.id_cargo);
  };

  const [showModal, setShowModal] = useState(false);
  const [showModalcrear, setShowModalcrear] = useState(false);

  useEffect(() => {
    if (!showModal) {
      setFormData((prev) => ({
        ...prev,
        nombre: ''
      }));
    }
  }, [showModal]);

  const handleUpdateCargo = async () => {
    if (!formData.nombre.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'Debes ingresar un nombre para el cargo.',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2
          `
        },
        buttonsStyling: false
      });
      return;
    }

    if (!selectedId) return;

    try {
      const response = await axios.put(
        `${baseApiUrl}personas/cargos/update/${selectedId}/`,
        { nombre: formData.nombre },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${valueSesion.user.tokens.access}`
          }
        }
      );

      if (response.data.success) {
        await Swal.fire({
          icon: 'success',
          title: '¡Cargo actualizado!',
          text: 'El cargo ha sido editado correctamente.',
          confirmButtonText: 'Aceptar',
          customClass: {
            confirmButton: `
              ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
              flex items-center justify-center gap-2
            `
          },
          buttonsStyling: false
        });

        buscarPersonasAll();
        setShowModal(false);
        setFormData(initialFormData);
        setSelectedId(null);
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: response.data.detail || 'Ocurrió un error al actualizar el cargo.',
          confirmButtonText: 'Aceptar',
          customClass: {
            confirmButton: `
              ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
              flex items-center justify-center gap-2
            `
          },
          buttonsStyling: false
        });
      }
    } catch (error: any) {
      const mensaje = error?.response?.data?.detail || 'Ocurrió un error al actualizar el cargo.';
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: mensaje,
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2
          `
        },
        buttonsStyling: false
      });
    }
  };

  const handleDeleteCargo = async (id: number) => {
    const confirm = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción eliminará el cargo permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true, // <--- esto invierte el orden
      customClass: {
        actions: 'flex gap-4 justify-end', // espacio entre botones
        confirmButton: `
        ${'Sí, eliminar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
        hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
        flex items-center justify-center gap-2
      `,
        cancelButton: `
        ${'Cancelar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
        hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
        flex items-center justify-center gap-2
      `
      },
      buttonsStyling: false
    });

    if (confirm.isConfirmed) {
      try {
        const response = await axios.delete(`${baseApiUrl}personas/cargos/delete/${id}/`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${valueSesion.user.tokens.access}`
          }
        });

        if (response.data.success) {
          await Swal.fire({
            icon: 'success',
            title: '¡Eliminado!',
            text: 'El cargo ha sido eliminado correctamente.',
            confirmButtonText: 'Aceptar',
            customClass: {
              confirmButton: `
              ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
              flex items-center justify-center gap-2
            `
            },
            buttonsStyling: false
          });

          buscarPersonasAll();
        } else {
          await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: response.data.detail || 'No se pudo eliminar el cargo.',
            confirmButtonText: 'Aceptar',
            customClass: {
              confirmButton: `
              ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
              flex items-center justify-center gap-2
            `
            },
            buttonsStyling: false
          });
        }
      } catch (error: any) {
        const mensaje = error?.response?.data?.detail || 'Ocurrió un error al eliminar el cargo.';
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: mensaje,
          confirmButtonText: 'Aceptar',
          customClass: {
            confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2
          `
          },
          buttonsStyling: false
        });
      }
    }
  };

  const fetchAllData = async () => {
    try {
      const response = await axios.get(`${baseApiUrl}personas/cargos/get-list/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.detail || 'Error desconocido en la API');
      }

      const data = response.data.data;
      if (!data || data.length === 0) {
        return {
          data: [],
          total_pages: 0
        };
      }

      return {
        data: data.map((item: any) => ({
          nombre: item.nombre
        })),
        total_pages: response.data.total_pages || 1
      };
    } catch (error) {
      console.error('Error al obtener datos para Excel:', error);
      return {
        data: [],
        total_pages: 0
      };
    }
  };

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
        <div className="w-full p-1">
          <div
            className={`m-auto w-full rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}
          >
            <div className={`rounded-xl p-4 relative ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
              <button
                onClick={() => router.push('/')}
                className={`absolute top-2 right-4 text-2xl ${isDarkMode ? 'text-white hover:text-red-400' : 'text-[rgb(var(--brown))] hover:text-red-700'}`}
              >
                &times;
              </button>

              <div className="relative mt-[39px] flex items-center justify-center">
                <h3 className={`text-center text-xl sm:text-2xl lg:text-3xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                  TIPOS DE CARGOS
                </h3>
              </div>

              <DynamicTable
                data={user}
                columns={columns}
                actions={actions}
                isLoading={isLoading}
                totalPages={totalPages}
                currentPage={currentPage}
                fetchAllData={fetchAllData}
                onPageChange={setCurrentPage}
              />

              <div className='flex justify-center mt-6 space-x-4'>
               
                <div >
                  <Button onClick={() => setShowModalcrear(true)} title="Crear" />
                </div>
                
                <div >
                  <Button onClick={() => router.push('/')} title="Salir" />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <ModalContainer isOpen={showModal} onClose={() => setShowModal(false)}>
        <div className="space-y-4">
          <h3
            className={`mb-4 text-center text-xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
          >
            Editar Tipo de Cargo
          </h3>

          <AnimatedInput
            type="text"
            name="nombre"
            id="nombre"
            label="  Nombre de cargo"
            value={formData.nombre}
            onChange={handleChange}
            darkMode={isDarkMode}
          />

          <div className="mt-6 flex justify-center space-x-4">
            <Button onClick={() => setShowModal(false)} title="Cancelar"></Button>
            <Button onClick={handleUpdateCargo} title="Editar"></Button>
          </div>
        </div>
      </ModalContainer>

      <ModalContainer isOpen={showModalcrear} onClose={() => setShowModalcrear(false)}>
        <div className="space-y-4">
          <h3
            className={`mb-4 text-center text-xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
          >
            Crear Tipo de Cargo
          </h3>

          <AnimatedInput
            type="text"
            name="nombre"
            id="nombre"
            label="  Nombre de cargo"
            value={formData.nombre}
            onChange={handleChange}
            darkMode={isDarkMode}
          />

          <div className="mt-6 flex justify-center space-x-4">
            <Button title="Cancelar" onClick={() => setShowModalcrear(false)}></Button>
            <Button title=" Crear Cargo " onClick={handleCreateCargo}></Button>
          </div>
        </div>
      </ModalContainer>

    </div>
  );
};

export default Administracion_cargos;
