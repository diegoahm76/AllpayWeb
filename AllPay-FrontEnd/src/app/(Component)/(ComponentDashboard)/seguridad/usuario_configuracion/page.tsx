'use client';

import '@/presenters/css/background.css';
import { Grid, Pagination, TextField } from '@mui/material';
import axios from 'axios';
import { signIn, useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import UsuarioConfi from './UsuarioConfi';

// import image from "../e.png"; // Ajusta la ruta si es necesario

const baseApiUrl = process.env.BASE_API_URL; // Accede a la variable de entorno aquí
const Usuarios: React.FC = () => {
  interface FormData {
    searchUser1: string;
    searchUser2: string;
    documentNumber: string;
    tipoPersona: string;
    documentType: string;
  }

  const initialFormData: FormData = {
    searchUser1: '',
    searchUser2: '',
    documentNumber: '',
    tipoPersona: '',
    documentType: ''
  };

  const fieldTypes: { [key: string]: 'string' } = {
    searchUser1: 'string',
    searchUser2: 'string',
    documentNumber: 'string',
    tipoPersona: 'string',
    documentType: 'string'
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

  const valueSesion: any = session;

  const [permisos, setPermisos] = useState({
    actualizar: false,
    borrar: false,
    consultar: false,
    crear: false
  });
  console.log(permisos);

  const rolesAll = useCallback(async (value: any) => {
    if (value.consultar) {
      try {
        const response = await axios
          .get(`${baseApiUrl}roles/get-list-rol-sistema/`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${valueSesion.user.tokens.access}`
            }
          })
          .catch(function (error) {
            return error.response;
          });
        if (response.data.success === false) {
          throw response.data.detail;
        }

      } catch (error) {
        console.log(error as string);
      }
    } 
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('prm');
    const permisosValue = data
      ? JSON.parse(Buffer.from(data, 'base64').toString('utf-8'))
      : { crear: false, consultar: false, actualizar: false, borrar: false };

    setPermisos(permisosValue);
    rolesAll(permisosValue);
  }, [rolesAll]);

  const [user, setUser] = useState<any[]>([]);

  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const buscarPersonasAll = async (page = 1): Promise<void> => {

    // 🔍 Validación: Asegurar que `page` sea un número válido
    const pageNumber = Number(page);
    if (isNaN(pageNumber) || pageNumber < 1) {
      console.error('El valor de "page" no es un número válido:', page);
      Swal.fire({
        icon: "warning",
        title: "Página inválida",
        text: "El número de página debe ser un número válido mayor a 0.",
      });
      return;
    }

    try {
      const url = `${baseApiUrl}personas/get-personas-filters-admin-user/?numero_documento=${formData.documentNumber}&page=${pageNumber}&tipo_documento=${formData.documentType}&tipo_persona=${formData.tipoPersona}`;

      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.detail || "Error desconocido en la API");
      }

      Swal.fire({
        position: "top-end",
        icon: "success",
        title: "Datos cargados correctamente",
        showConfirmButton: false,
        timer: 1500
      });

      setUser(response.data.data);
      setCurrentPage(response.data.current_page);
      setTotalPages(response.data.total_pages);

    } catch (error: unknown) {
      console.error('Error en buscarPersonasAll:', error);

      // 🛠️ Manejo seguro del error
      let errorMessage = "Ocurrió un problema, intenta nuevamente";
      console.log(errorMessage);

      if (error instanceof Error) {
        errorMessage = error.message; // Si es un Error válido, usar su mensaje
      } else if (typeof error === "string") {
        errorMessage = error; // Si es un string, usarlo directamente
      } else if (axios.isAxiosError(error) && error.response?.data?.detail) {
        errorMessage = error.response.data.detail; // Si es un error de Axios con respuesta
      }

    }
  };

  const handleBuscarClick = () => {
    buscarPersonasAll(1); // Llama a la función con la página 1 (número)
  };




  useEffect(() => {
    buscarPersonasAll(currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('prm');
    const permisosValue = data
      ? JSON.parse(Buffer.from(data, 'base64').toString('utf-8'))
      : { crear: false, consultar: false, actualizar: false, borrar: false };

    setPermisos(permisosValue);
    // buscarPersonasAll(permisosValue);
  }, []);

  const [dataTypePerson, setDataTypePerson] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);


  const obtenerTiposPersona = useCallback(async () => {
    try {
      const response = await axios
        .get(`${baseApiUrl}choices/tipo-persona/`, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
        .catch(function (error) {
          return error.response;
        });
      if (response.data.success === false) {
        throw response.data.detail;
      }
      setDataTypePerson(response.data.data);
    } catch (error) {

    }
  }, []);

  const obtenerTiposDocumento = useCallback(async () => {
    try {
      const response = await axios
        .get(`${baseApiUrl}personas/tipos-documento/get-list/?activo=True`, {
          headers:  {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${valueSesion.user.tokens.access}`
          }
        })
        .catch(function (error) {
          return error.response;
        });
      if (response.data.success === false) {
        throw response.data.detail;
      }
      setDocumentTypes(response.data.data);
    } catch (error) {

    }
  }, []);

  useEffect(() => {
    obtenerTiposPersona();
    obtenerTiposDocumento();
  }, [obtenerTiposPersona, obtenerTiposDocumento]);

  const Stilestex = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '0.5rem', // 🔹 Mantiene el borde redondeado en todo momento
      borderColor: theme === 'dark' ? 'white' : '#562707',
      color: theme === 'dark' ? 'white' : '#562707',
      backgroundColor: theme === 'dark' ? '#260E00' : 'white',
      transition: 'all 0.2s ease-in-out',
      overflow: 'hidden', // 🔹 Evita que el borde cambie de forma
      outline: 'none', // 🔹 Elimina cualquier borde extra al enfocarse
      '& fieldset': {
        borderColor: theme === 'dark' ? 'white' : '#562707',
        borderWidth: '1.5px', // Grosor inicial del borde
        borderRadius: '0.5rem' // 🔹 Se asegura que el borde siempre sea redondeado
      },
      '&:hover fieldset': {
        borderColor: theme === 'dark' ? '#fff' : '#562707'
      },
      '&.Mui-focused fieldset': {
        borderColor: '#4D750F', // Color verde cuando está enfocado
        borderWidth: '2px',
        borderRadius: '0.5rem' // 🔹 Se mantiene el radio sin cambios
      }
    },
    '& .MuiInputBase-input': {
      padding: '10px' // Ajuste del padding interno
    }
  };

  const handleDownloadExcel = () => {
    const tableData = user.map(
      ({
        tipo_persona_desc,
        tipo_documento,
        numero_documento,
        primer_nombre,
        segundo_nombre,
        primer_apellido,
        segundo_apellido,
        nombre_completo,
        razon_social,
        nombre_comercial,
        digito_verificacion,
        cod_naturaleza_empresa,
        tiene_usuario,
        tipo_usuario
      }) => ({
        'Tipo Persona': tipo_persona_desc,
        'Tipo Documento': tipo_documento,
        'N° Documento': numero_documento,
        'Primer Nombre': primer_nombre,
        'Segundo Nombre': segundo_nombre,
        'Primer Apellido': primer_apellido,
        'Segundo Apellido': segundo_apellido,
        'Nombre Completo': nombre_completo,
        'Razón Social': razon_social || 'N/A',
        'Nombre Comercial': nombre_comercial || 'N/A',
        'Dígito Verificación': digito_verificacion || 'N/A',
        'Código Naturaleza Empresa': cod_naturaleza_empresa || 'N/A',
        'Tiene Usuario': tiene_usuario ? 'Sí' : 'No',
        'Tipo Usuario': tipo_usuario
      })
    );

    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');
    XLSX.writeFile(workbook, 'Usuarios.xlsx');
  };

  const [selectedUser, setSelectedUser] = useState(null);

  const handleEdit = (userData: any) => {
    setSelectedUser(userData);
  };

  const [editar, setEditar] = useState(false);

  const [
    tipousuario
    // settipousuario
  ] = useState('interno');

  return (
    <div>
      {editar ? (
        <>
          <UsuarioConfi selectedUser={selectedUser} setEditar={setEditar} tipousuario={tipousuario} tipoUsuario={undefined} isSuperUsuario={undefined} setIsSuperUsuario={undefined} />
        </>
      ) : (
        <>
          <div className="w-full">
            <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
              <div className="w-full p-1">
                <div
                  className={`m-auto w-full rounded-xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'
                    }`}
                >
                  <div className={`rounded-xl p-4 ${theme === 'dark' ? 'dark' : 'bg-white'}`}>
                    <div>
                      <h3
                        className={`mb-10 text-center text-xl sm:text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'
                          }`}
                      >
                        Administrar usuarios
                      </h3>
                    </div>

                    <Grid container xs={12} spacing={2} className="mb-4">
                      <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                        <div className="relative w-full">
                          <TextField
                            name="searchUser1"
                            id="searchUser1"
                            placeholder="Búsqueda por Persona"
                            variant="outlined"
                            fullWidth
                            value={formData.searchUser1}
                            onChange={handleChange}
                            sx={Stilestex}
                          />

                          {/* Icono de búsqueda alineado a la derecha */}
                          <button
                            type="button"
                            className="absolute inset-y-0 right-2 flex cursor-pointer items-center p-2"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill={theme === 'dark' ? '#ffff' : '#562707'}
                              width="24"
                              height="24"
                              viewBox="0 0 48 48"
                            >
                              <path d="M 21 3 C 11.621094 3 4 10.621094 4 20 C 4 29.378906 11.621094 37 21 37 C 24.710938 37 28.140625 35.804688 30.9375 33.78125 L 44.09375 46.90625 L 46.90625 44.09375 L 33.90625 31.0625 C 36.460938 28.085938 38 24.222656 38 20 C 38 10.621094 30.378906 3 21 3 Z M 21 5 C 29.296875 5 36 11.703125 36 20 C 36 28.296875 29.296875 35 21 35 C 12.703125 35 6 28.296875 6 20 C 6 11.703125 12.703125 5 21 5 Z"></path>
                            </svg>
                          </button>
                        </div>
                      </Grid>

                      <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                        <div className="relative w-full">
                          <TextField
                            name="searchUser2"
                            id="searchUser2"
                            placeholder="Búsqueda por usuario"
                            variant="outlined"
                            fullWidth
                            value={formData.searchUser2}
                            onChange={handleChange}
                            sx={Stilestex}
                          />

                          {/* Icono de búsqueda alineado a la derecha */}
                          <button
                            type="button"
                            className="absolute inset-y-0 right-2 flex cursor-pointer items-center p-2"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill={theme === 'dark' ? '#ffff' : '#562707'}
                              width="24"
                              height="24"
                              viewBox="0 0 48 48"
                            >
                              <path d="M 21 3 C 11.621094 3 4 10.621094 4 20 C 4 29.378906 11.621094 37 21 37 C 24.710938 37 28.140625 35.804688 30.9375 33.78125 L 44.09375 46.90625 L 46.90625 44.09375 L 33.90625 31.0625 C 36.460938 28.085938 38 24.222656 38 20 C 38 10.621094 30.378906 3 21 3 Z M 21 5 C 29.296875 5 36 11.703125 36 20 C 36 28.296875 29.296875 35 21 35 C 12.703125 35 6 28.296875 6 20 C 6 11.703125 12.703125 5 21 5 Z"></path>
                            </svg>
                          </button>
                        </div>
                      </Grid>
                    </Grid>

                    <Grid container spacing={2} className="mb-4">
                      <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                        <div>
                          {/* {error && <p className="text-red-500">{error}</p>}
                    <label
                      className={`mb-2 block text-sm font-bold ${
                        typePerson.error
                          ? 'text-[#d60f30]'
                          : theme === 'dark'
                            ? 'text-white'
                            : 'text-[#562707]'
                      }`}
                      htmlFor="typePersona"
                    >
                      Tipo de Persona
                    </label> */}
                          <select
                            name="tipoPersona"
                            value={formData.tipoPersona}
                            onChange={handleChange}
                            className={`w-full rounded-lg border p-2 ${theme === 'dark'
                              ? 'border-white bg-gray-800 text-white'
                              : 'border-[#562707] text-[#562707]'
                              }`}
                          >
                            <option value="">Tipo de Persona</option>
                            {dataTypePerson.map((value: any, index: number) => (
                              <option key={index} value={value[0]}>
                                {value[1]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                        <div>
                          {/* <label
                      className={`mb-2 block text-sm font-bold ${
                        typePerson.error
                          ? 'text-[#d60f30]'
                          : theme === 'dark'
                            ? 'text-white'
                            : 'text-[#562707]'
                      }`}
                      htmlFor="documentType"
                    >
                      Tipo de Documento
                    </label> */}
                          <select
                            name="documentType"
                            value={formData.documentType}
                            onChange={handleChange}
                            className={`w-full rounded-lg border p-2 ${theme === 'dark'
                              ? 'border-white bg-gray-800 text-white'
                              : 'border-[#562707] text-[#562707]'
                              }`}
                          >
                            <option value="">Tipo de Documento</option>
                            {documentTypes.map((value: any, index: number) => (
                              <option key={index} value={value.cod_tipo_documento}>
                                {value.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      </Grid>

                      <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                        <div>
                          {/* <label
                      className={`mb-2 block text-sm font-bold ${
                        typePerson.error
                          ? 'text-[#d60f30]'
                          : theme === 'dark'
                            ? 'text-white'
                            : 'text-[#562707]'
                      }`}
                      htmlFor="documentNumber"
                    >
                      Número de Documento
                    </label> */}
                          <TextField
                            fullWidth
                            id="documentNumber"
                            name="documentNumber"
                            placeholder="Número de Documento"
                            type="text"
                            variant="outlined"
                            value={formData.documentNumber}
                            onChange={handleChange}
                            sx={Stilestex}
                          />
                        </div>
                      </Grid>
                    </Grid>

                    <Grid container spacing={2} className="mb-4 justify-center overflow-x-auto">
                      <Grid
                        item
                        xs={12}
                        sm={12}
                        md={12}
                        lg={12}
                        xl={12}
                        className="flex justify-center"
                      >
                        <div>
                          <button
                            type="button"
                            className="float-right m-auto block rounded-full bg-[#4D750F] px-6 py-2 font-medium text-white shadow-xl"
                            onClick={() => handleBuscarClick()}
                          >
                            Buscar persona
                          </button>
                        </div>
                      </Grid>
                    </Grid>
                  </div>

                  <Grid container spacing={2} className="mb-4 overflow-x-auto">
                    {' '}
                    {/* Aquí agregamos overflow-x-auto */}
                    <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
                      <div
                        className={` ${theme === 'dark' ? 'bg-[#562707]' : 'bg-white'} mt-4 rounded-xl p-4`}
                      >
                        <Grid
                          container
                          spacing={2}
                          direction="row"
                          sx={{
                            justifyContent: 'space-around',
                            alignItems: 'center'
                          }}
                        >
                          <Grid item xs={12} sm={10} md={10} lg={10} xl={10}>
                            <h3
                              className={` text-center text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'
                                }`}
                            >
                              BÚSQUEDA AVANZADA POR PERSONA
                            </h3>
                          </Grid>
                          <Grid item marginTop={-6}>
                            <button
                              type="button"
                              onClick={handleDownloadExcel}
                              className="mt-4 block rounded-full border-none bg-transparent p-0 shadow-xl"
                            >
                              <img
                                src="https://i.postimg.cc/rFZtRsTg/Grupo-1100.png"
                                alt="Descargar Excel"
                                className="h-10 w-10 cursor-pointer"
                              />
                            </button>
                          </Grid>
                        </Grid>
                        <div className="grid grid-cols-1 gap-4 overflow-x-auto">
                          <table className="w-full min-w-300 table-auto">
                            <thead>
                              <tr
                                className={`h-8 ${theme === 'dark' ? 'bg-[#78390e] text-white' : 'bg-gray-100'}`}
                              >
                                <th className="text-left">Tipo persona</th>
                                <th className="text-left">Nombre Completo</th>
                                <th className="text-left">Razón Social</th>
                                <th className="text-left">Nombre Comercial</th>
                                <th className="text-left">Tipo Documento</th>
                                <th className="text-left">N° Documento</th>
                                <th className="text-left">Acción</th>
                              </tr>
                            </thead>
                            <tbody>
                              {user.map((value, index) => (
                                <tr
                                  key={index}
                                  className={`h-8 border-b-1 border-gray-200 ${theme === 'dark' ? 'text-white' : ''}`}
                                >
                                  <td>{value.tipo_persona_desc}</td>
                                  <td>{value.nombre_completo}</td>
                                  <td>{value.razon_social}</td>
                                  <td>{value.nombre_comercial}</td>
                                  <td>{value.tipo_documento}</td>
                                  <td>{value.numero_documento}</td>
                                  <td className="flex items-center gap-2">
                                    <img
                                      src={
                                        value.is_active
                                          ? 'https://i.postimg.cc/xCycvywm/Grupo-1127.png'
                                          : 'https://i.postimg.cc/NFLBkb47/Grupo-1125.png'
                                      }
                                      alt={value.is_active ? 'Activo' : 'Inactivo'}
                                      className="h-6 w-6" // Ajusta el tamaño según lo necesites
                                    />
                                    <button
                                      onClick={() => {
                                        setEditar(!editar);
                                        handleEdit(value);
                                      }}
                                    >
                                      <img
                                        src="https://i.postimg.cc/hPVKjZ05/Grupo-1126.png"
                                        alt="Editar"
                                        className="h-6 w-6" // Ajusta el tamaño según lo necesites
                                      />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>




                        <div className="mt-4 flex justify-center">
                          <Pagination
                            count={totalPages}
                            page={currentPage}
                            onChange={(_event, page) => setCurrentPage(page)}
                            sx={{
                              '& .MuiPaginationItem-root': {
                                color: '#4D750F'
                              },
                              '& .MuiPaginationItem-page.Mui-selected': {
                                backgroundColor: '#4D750F',
                                color: 'white'
                              },
                              '& .MuiPaginationItem-previousNext': {
                                color: '#4D750F'
                              }
                            }}
                          />
                        </div>
                      </div>
                    </Grid>
                  </Grid>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {/* <button onClick={() => setEditar(!editar)}>Editar</button> */}
    </div>
  );
};

export default Usuarios;
