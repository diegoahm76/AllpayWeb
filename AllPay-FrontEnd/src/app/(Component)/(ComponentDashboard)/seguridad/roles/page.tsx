'use client';

import { Button } from '@/presenters/components/ui/AnimatedButton';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import '@/presenters/css/background.css';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Grid, IconButton } from '@mui/material';
import { signIn, useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import React, { useEffect, useState } from 'react';
import Roles_crear from './components/Roles_crear';
import Roles_editar from './components/Roles_editar';
import { fetch_roles_sistema, handleDeleteRol } from './services/roles.service';
import { useRouter } from 'next/navigation';

interface Usuario {
  id_usuario: number;
  nombre_usuario: string;
  nombre_persona: string;
  email: string;
}

const Roles: React.FC = () => {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const valueSesion: any = session;

  const [roles, setRoles] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showMessage, setShowMessage] = useState(1);
  const [selectedRolName, setSelectedRolName] = useState('');
  const [selectedRolId, setSelectedRolId] = useState<number | null>(null);
  const [selectedUsuarios, setSelectedUsuarios] = useState<Usuario[]>([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState<any[]>([]);

  const [isExportLoading,] = useState(false);

  const fetchAllUsuarios = async () => {
    try {
      if (usuariosData.length === 0) {
        return {
          data: [],
          total_pages: 0
        };
      }

      // Formatear los datos según las columnas definidas
      const formattedData = usuariosData.map(usuario => ({
        nombre_usuario: usuario.nombre_usuario,
        nombre_persona: usuario.nombre_persona,
        email: usuario.email
      }));

      return {
        data: formattedData,
        total_pages: 1
      };
    } catch (error) {
      console.error('Error al obtener datos para Excel:', error);
      return {
        data: [],
        total_pages: 0
      };
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Solo ejecutar cuando el componente esté montado, la sesión esté autenticada y el token esté disponible
    if (mounted && status === 'authenticated' && showMessage === 1 && valueSesion?.user?.tokens?.access) {
      fetch_roles_sistema({ setRoles, valueSesion });
    }
  }, [mounted, status, showMessage, valueSesion?.user?.tokens?.access]);

  const handleOpenModalUsuarios = (usuarios: any[], nombreRol: string) => {
    setSelectedUsuarios(usuarios);
    setSelectedRolName(nombreRol);
    setShowModal(true);
  };

  const rowsPerPage = 10;
  const totalPages = Math.ceil(selectedUsuarios.length / rowsPerPage);

  const [filters, setFilters] = useState({
    nombre_usuario: '',
    nombre_persona: '',
    email: ''
  });

  const handleBuscarUsuarios = () => {
    const filtered = selectedUsuarios.filter(
      (usuario) =>
        usuario.nombre_usuario
          .toLowerCase()
          .includes(filters.nombre_usuario.toLowerCase()) &&
        usuario.nombre_persona
          .toLowerCase()
          .includes(filters.nombre_persona.toLowerCase()) &&
        usuario.email.toLowerCase().includes(filters.email.toLowerCase())
    );

    setFilteredUsuarios(filtered);
    setCurrentPage(1); // Reinicia a la primera página
  };

  const usuariosData = filteredUsuarios.length > 0 ? filteredUsuarios : selectedUsuarios;
  const paginatedUsuarios = usuariosData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const columns = [
    { key: 'nombre_usuario', label: 'Usuario' },
    { key: 'nombre_persona', label: 'Nombre Persona' },
    { key: 'email', label: 'Email' }
  ];

  const [showModal, setShowModal] = useState(false);

  const isDarkMode = mounted && theme === 'dark';

  if (!mounted) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
        <div className="w-full p-1">
          <div
            className={`m-auto w-full rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'
              }`}
          >
            <div
              className={`rounded-xl p-4 relative ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}
            >
              <button
                onClick={() => router.push('/')}
                className={`absolute top-2 right-2 sm:right-4 text-xl sm:text-2xl ${isDarkMode ? 'text-white hover:text-red-300' : 'text-[rgb(var(--brown))] hover:text-red-700'} `}
              >
                &times;
              </button>

              {showMessage === 1 && (
                <>
                  <div>
                    <h3
                      className={`mb-10 mt-[39px] text-center text-xl sm:text-2xl lg:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'
                        }`}
                    >
                      LISTA DE ROLES
                    </h3>
                    <p
                      className={`text-1xl mb-10 text-left ${isDarkMode ? 'text-white' : 'text-[#562707]'
                        }`}
                    >
                      Un rol proporciona acceso a menús y funciones predefinidos,
                      para que según el rol asignado un administrador pueda
                      tener acceso a lo que necesita.
                    </p>
                  </div>
                  <div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                      {roles.map((value, index) => (
                        <article
                          key={index}
                          className={`w-full max-w-full overflow-hidden break-words rounded-lg border border-gray-100 p-4 shadow-xs transition hover:shadow-lg sm:p-6 ${isDarkMode
                            ? 'bg-[#260f00] text-white border border-white/20'
                            : 'bg-white text-[#562707]'
                            }`}
                        >
                          <p>Total de usuarios: {value.cantidad_usuarios}</p>
                          <a href="#">
                            <h3 className="mt-0.5 text-lg font-medium">
                              {value.nombre_rol}
                            </h3>
                          </a>
                          {/* Acciones */}
                          <div className="mt-1 space-y-0">
                            {/* Editar */}
                            <div className="flex items-center justify-between">
                              <span className={`${isDarkMode ? 'text-white' : 'text-[#562707]'} text-sm font-medium`}>
                                Editar rol
                              </span>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedRolId(value);
                                  setShowMessage(3);
                                }}
                                sx={{
                                  color: '#4D750F',
                                  padding: '2px',
                                  '&:hover': {
                                    backgroundColor: 'rgba(77, 117, 15, 0.1)'
                                  }
                                }}
                              >
                                <img
                                  src="https://i.postimg.cc/5tRmgygC/Grupo-1126-1.png"
                                  alt="Editar"
                                  style={{ width: 20, height: 20 }}
                                />
                              </IconButton>
                            </div>

                            {/* Ver usuarios */}
                            <div className="flex items-center justify-between">
                            <span className={`${isDarkMode ? 'text-white' : 'text-[#562707]'} text-sm font-medium`}>
                                Ver usuarios
                              </span>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  handleOpenModalUsuarios(
                                    value.usuarios,
                                    value.nombre_rol
                                  )
                                }
                                sx={{
                                  color: '#562707',
                                  padding: '2px',
                                  '&:hover': {
                                    backgroundColor: 'rgba(86, 39, 7, 0.1)'
                                  }
                                }}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </div>
                            {/* Eliminar */}
                            <div className="flex items-center justify-between">
                            <span className={`${isDarkMode ? 'text-white' : 'text-[#562707]'} text-sm font-medium`}>
                                Eliminar rol
                              </span>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  handleDeleteRol({
                                    id: value.id_rol,
                                    setRoles,
                                    valueSesion
                                  })
                                }
                                sx={{
                                  color: '#dc2626',
                                  padding: '2px',
                                  '&:hover': {
                                    backgroundColor: 'rgba(220, 38, 38, 0.1)'
                                  }
                                }}
                              >
                                <img
                                  src="https://i.postimg.cc/26tZCTC3/Grupo-1125-1.png"
                                  alt="Eliminar"
                                  style={{ width: 20, height: 20 }}
                                />
                              </IconButton>
                            </div>
                          </div>
                        </article>
                      ))}
                      <article
                        className={`w-full max-w-full overflow-hidden break-words rounded-lg border border-gray-100 p-4 shadow-xs transition hover:shadow-lg sm:p-6 ${isDarkMode
                          ? 'bg-[#260f00] text-white border border-white/20'
                          : 'bg-white text-[#562707]'
                          }`}
                      >
                        <p className="text-lg font-medium">
                          Crear un nuevo rol
                        </p>

                        <div className="mt-4 flex flex-wrap gap-4">
                          <Button
                            title="Crear"
                            onClick={() => setShowMessage(2)}
                          />
                          <Button
                            title="Salir"
                            onClick={() => router.push('/')}
                          />

                        </div>
                      </article>

                      <ModalContainer
                        isOpen={showModal}
                        onClose={() => setShowModal(false)}
                        size="3xl"
                      >
                        <div className="space-y-5">
                          <div>
                            <h3
                              className={`mb-4 text-center text-xl font-bold ${isDarkMode
                                ? 'text-white'
                                : 'text-[#562707]'
                                }`}
                            >
                              Usuarios del rol: {selectedRolName}
                            </h3>
                          </div>

                          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                            <AnimatedInput
                              type="text"
                              name="Usuario"
                              label="Usuario"
                              value={filters.nombre_usuario}
                              onChange={(e) =>
                                setFilters({
                                  ...filters,
                                  nombre_usuario: e.target.value
                                })
                              }
                              darkMode={isDarkMode}
                            />
                            <AnimatedInput
                              type="text"
                              label="Nombre Persona"
                              name="Nombre Persona"
                              value={filters.nombre_persona}
                              onChange={(e) =>
                                setFilters({
                                  ...filters,
                                  nombre_persona: e.target.value
                                })
                              }
                              darkMode={isDarkMode}
                            />
                            <AnimatedInput
                              type="email"
                              label="Email"
                              name="Email"
                              value={filters.email}
                              onChange={(e) =>
                                setFilters({ ...filters, email: e.target.value })
                              }
                              darkMode={isDarkMode}
                            />
                          </div>

                          {/* Botón buscar */}
                          <Grid
                            container
                            direction="row"
                            marginTop={2}
                            justifyContent="center"
                          >
                            <Button title="Buscar" onClick={handleBuscarUsuarios}></Button>
                          </Grid>
                          <DynamicTable
                            columns={columns}
                            data={paginatedUsuarios}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            fetchAllData={fetchAllUsuarios}
                            isLoading={isExportLoading}
                          />

                          <Grid
                            container
                            direction="row"
                            marginTop={2}
                            justifyContent="center"
                          >
                            <Button
                              title="Cerrar"
                              onClick={() => setShowModal(false)}
                            />
                          </Grid>
                        </div>
                      </ModalContainer>
                    </div>
                  </div>
                </>
              )}
              {showMessage === 2 && (
                <>
                  <Roles_crear setShowMessage={setShowMessage} />
                </>
              )}
              {showMessage === 3 && (
                <>
                  <Roles_editar
                    setShowMessage={setShowMessage}
                    selectedRolId={selectedRolId}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Roles;
