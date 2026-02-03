'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import axios from 'axios';
import { useTheme } from 'next-themes';
import '@/presenters/css/background.css';
import * as XLSX from 'xlsx';
import { TextField, Grid } from '@mui/material';

const baseApiUrl = process.env.BASE_API_URL; // Accede a la variable de entorno aquí
const Usuarios: React.FC = () => {
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const { theme } = useTheme();

  const valueSesion: any = session;

  const [, setPermisos] = useState({
    actualizar: false,
    borrar: false,
    consultar: false,
    crear: false
  });
  const handleDownloadExcel = () => {
    // Extraer solo los datos visibles en la tabla
    const tableData = user.map(
      ({
        tipo_persona_desc,
        nombre_completo,
        nombre_comercial,
        razon_social,
        tipo_documento,
        numero_documento
      }) => ({
        'Tipo Persona': tipo_persona_desc,
        'Nombre Completo': nombre_completo,
        'Nombre Comercial': nombre_comercial,
        'Razón Social': razon_social,
        'Tipo Documento': tipo_documento,
        'N° Documento': numero_documento
      })
    );

    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');
    XLSX.writeFile(workbook, 'Usuarios.xlsx');
  };

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

  const buscarPersonasAll = useCallback(async (value: any) => {
    if (value.consultar) {
      try {
        const response = await axios
          .get(`${baseApiUrl}personas/get-personas-filters-admin-user/`, {
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
        setUser(response.data.data);
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
    buscarPersonasAll(permisosValue);
  }, [buscarPersonasAll]);

  const [documentNumber, setDocumentNumber] = useState('');

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
  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
        <div className="w-full p-1">
          <div
            className={`m-auto w-full rounded-xl p-6 ${theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'
              }`}
          >
            <div className={`rounded-xl p-4 ${theme === 'dark' ? 'dark' : 'bg-white'}`}>
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
                    className={`mb-10 text-center text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#562707]'
                      }`}
                  >
                    Búsqueda avanzada por usuario
                  </h3>
                </Grid>
                <Grid item marginTop={-6}>
                  <button
                    type="button"
                    onClick={handleDownloadExcel}
                    className="mt-4 block rounded-full border-none bg-transparent p-0 shadow-xl"
                  >
                    <img
                      src="https://w7.pngwing.com/pngs/670/803/png-transparent-excel-logo-logos-logos-and-brands-icon.png"
                      alt="Descargar Excel"
                      className="h-10 w-10 cursor-pointer"
                    />
                  </button>
                </Grid>
              </Grid>

              <Grid container spacing={2} className="mb-4">
                <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                  <div>
                    <TextField
                      fullWidth
                      id="documentNumber"
                      name="documentNumber"
                      placeholder="Nombre de usuario"
                      type="text"
                      variant="outlined"
                      value={documentNumber}
                      sx={Stilestex}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                    // className="w-full rounded-lg border border-[#562707] p-2 text-[#562707]"
                    />
                  </div>
                </Grid>

                <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
                  <div className="relative w-full">
                    <TextField
                      name="searchUser2"
                      id="searchUser2"
                      placeholder="Búsqueda"
                      variant="outlined"
                      fullWidth
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

              <div className="grid grid-cols-1 gap-4 overflow-x-auto">
                <table className="w-full min-w-300 table-auto">
                  <thead>
                    <tr
                      className={`h-8 ${theme === 'dark' ? 'bg-[#78390e] text-white' : 'bg-gray-100'}`}
                    >
                      <th className="text-left">Tipo persona</th>
                      <th className="text-left">Nombre Completo</th>
                      <th className="text-left">Nombre Comercial</th>
                      <th className="text-left">Razón Social</th>
                      <th className="text-left">Tipo Documento</th>
                      <th className="text-left">N° Documento</th>
                      <th className="text-left">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.map((value: any, index: number) => (
                      <tr
                        key={index}
                        className={`h-8 border-b-1 border-gray-200 ${theme === 'dark' ? 'text-white' : ''}`}
                      >
                        <td>{value.tipo_persona_desc}</td>
                        <td>{value.nombre_completo}</td>
                        <td>{value.nombre_comercial}</td>
                        <td>{value.razon_social}</td>
                        <td>{value.tipo_documento}</td>
                        <td>{value.numero_documento}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Grid
                container
                spacing={2}
                marginTop={2}
                className="mb-4 justify-center overflow-x-auto"
              >
                <Grid item xs={12} sm={12} md={12} lg={12} xl={12} className="flex justify-center">
                  <div>
                    <button
                      type="button"
                      className="float-right m-auto block rounded-full bg-[#4D750F] px-6 py-2 font-medium text-white shadow-xl"
                    >
                      Buscar persona
                    </button>
                  </div>
                </Grid>
              </Grid>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Usuarios;
