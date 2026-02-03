'use client';

import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useSession, signIn } from 'next-auth/react';
import Image from 'next/image';
import { AuthResource } from '@/application/auth/resources/auth.resource';
import { MainResource } from '@/application/shared/resources/main-resource';
import RegisterNaturalForm from '@/presenters/components/modules/register/RegisterNatural';
import Modal from './components/Modal';
import Swal from 'sweetalert2';
import {  Grid } from '@mui/material';
// import { useTheme } from 'next-themes';

interface RegisterAdminFormProps {
  baseApiUrl: string;
  setEditar: any;
}
 

let date = new Date();
date.setFullYear(date.getFullYear() - 10);

const RegisterAdminForm = ({ baseApiUrl, setEditar }: RegisterAdminFormProps) => {
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const valueSesion: any = session;

  const [openModalPolitica, setModalPolitica] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);

  const [typePerson, setTypePerson] = useState({ value: 'N', error: false });
  const [currentStep, setCurrentStep] = useState(1);
  const [persona, setPersona] = useState(false);
  const [document, setDocument] = useState({ value: '', error: false });
  const [typeDocument, setTypeDocument] = useState({ value: '', error: false });
  const [dataTypeDocument, setDataTypeDocument] = useState<any[]>([]);
  const [dataPaisNacimiento, setDataPaisNacimiento] = useState<any[]>([]);
  const [dataGenero, setDataGenero] = useState<any[]>([]);

  const [dataCiudad, setDataCiudad] = useState<any[]>([]);
  const [dataDepartamento, setDataDepartamento] = useState<any[]>([]);

  const [dataCiudadNotificacion, setDataCiudadNotificacion] = useState<any[]>([]);
  const [dataDepartamentoNotificacion, setDataDepartamentoNotificacion] = useState<any[]>([]);

  const [, setError] = useState<string>('');
  const [errorUser, setErrorUser] = useState<string>('');
  const [messageUser, setMessageUser] = useState<string>('');
  const [, setMessage] = useState<string>('');

  const obtenerGeneros = useCallback(async () => {
    try {
      const response = await axios
        .get(`${baseApiUrl}personas/sexo/get-list/`, {
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
      setDataGenero(response.data.data);
    } catch (error: any) {
      if (typeof error === 'string') {
        Swal.fire({
          title: 'Error',
          text: error,
          icon: 'error',
          confirmButtonColor: '#4D750F',
          confirmButtonText: AuthResource.Acept
        });

        //setError(error)
      } else {
        Swal.fire({
          title: 'Error',
          text: 'Ha ocurrido un error contacte con el administrador',
          icon: 'error',
          confirmButtonColor: '#4D750F',
          confirmButtonText: AuthResource.Acept
        });

        //setError('Ha ocurrido un error contacte con el administrador')
      }
    }
  }, []);

  const obtenerPaises = useCallback(async () => {
    try {
      const response = await axios
        .get(`${baseApiUrl}personas/paises/get-list/`, {
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
      setDataPaisNacimiento(response.data.data);
    } catch (error: any) {
      if (typeof error === 'string') {
        Swal.fire({
          title: 'Error',
          text: error,
          icon: 'error',
          confirmButtonColor: '#4D750F',
          confirmButtonText: AuthResource.Acept
        });

        //setError(error)
      } else {
        Swal.fire({
          title: 'Error',
          text: 'Ha ocurrido un error contacte con el administrador',
          icon: 'error',
          confirmButtonColor: '#4D750F',
          confirmButtonText: AuthResource.Acept
        });

        //setError('Ha ocurrido un error contacte con el administrador')
      }
    }
  }, []);

  const obtenerTiposDocu = useCallback(async () => {
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
      setDataTypeDocument(response.data.data);
    } catch (error: any) {
      if (typeof error === 'string') {
        Swal.fire({
          title: 'Error',
          text: error,
          icon: 'error',
          confirmButtonColor: '#4D750F',
          confirmButtonText: AuthResource.Acept
        });

        //setError(error)
      } else {
        Swal.fire({
          title: 'Error',
          text: 'Ha ocurrido un error contacte con el administrador',
          icon: 'error',
          confirmButtonColor: '#4D750F',
          confirmButtonText: AuthResource.Acept
        });

        //setError('Ha ocurrido un error contacte con el administrador')
      }
    }
  }, []);

  const obtenerCiudad = useCallback(async (value: any, step: number) => {
    if (value !== '') {
      try {
        const response = await axios
          .get(`${baseApiUrl}personas/municipio/get-list/${value}/`, {
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
        if (step === 1) {
          setDataCiudad(response.data.data);
        } else if (step === 2) {
          setDataCiudadNotificacion(response.data.data);
        }
      } catch (error: any) {
        if (typeof error === 'string') {
          Swal.fire({
            title: 'Error',
            text: error,
            icon: 'error',
            confirmButtonColor: '#4D750F',
            confirmButtonText: AuthResource.Acept
          });

          //setError(error)
        } else {
          Swal.fire({
            title: 'Error',
            text: 'Ha ocurrido un error contacte con el administrador',
            icon: 'error',
            confirmButtonColor: '#4D750F',
            confirmButtonText: AuthResource.Acept
          });

          //setError('Ha ocurrido un error contacte con el administrador')
        }
      }
    }
  }, []);
  const getTiposComprador = async (): Promise<{ code: string; label: string }[]> => {
    try {
      const response = await axios.get(`${baseApiUrl}choices/tipo-comprador/`);
      
      if (response.data.success) {
        return response.data.data.map(([code, label]: [string, string]) => ({
          code,
          label
        }));
      } else {
        throw new Error('No se pudieron obtener los tipos de comprador');
      }
    } catch (error) {
      console.error('Error al obtener tipos de comprador:', error);
      throw error;
    }
  };


  const obtenerDepartamento = useCallback(async (value: any, step: number) => {
    if (value !== '') {
      try {
        const response = await axios
          .get(`${baseApiUrl}personas/departamento/get-list/${value}/`, {
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
        if (step === 1) {
          setDataDepartamento(response.data.data);
        } else if (step === 2) {
          setDataDepartamentoNotificacion(response.data.data);
        }
      } catch (error: any) {
        if (typeof error === 'string') {
          Swal.fire({
            title: 'Error',
            text: error,
            icon: 'error',
            confirmButtonColor: '#4D750F',
            confirmButtonText: AuthResource.Acept
          });

          //setError(error)
        } else {
          Swal.fire({
            title: 'Error',
            text: 'Ha ocurrido un error contacte con el administrador',
            icon: 'error',
            confirmButtonColor: '#4D750F',
            confirmButtonText: AuthResource.Acept
          });

          //setError('Ha ocurrido un error contacte con el administrador')
        }
      }
    }
  }, []);

  const getPersona = useCallback(async (value: any, docum: any) => {
    try {
      const response = await axios
        .get(`${baseApiUrl}personas/get-personas-by-document/${value}/${docum}/`, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
        .catch(function (error) {
          return error.response;
        });
      if (response.data.success === false) {
        return { id: null, name: null, value: true };
      }
      return {
        id: response.data.data.id_persona,
        name: response.data.data.nombre_completo,
        value: false
      };
    } catch (error: any) {
      if (typeof error === 'string') {
        Swal.fire({
          title: 'Error',
          text: error,
          icon: 'error',
          confirmButtonColor: '#4D750F',
          confirmButtonText: AuthResource.Acept
        });

        //setError(error)
      } else {
        Swal.fire({
          title: 'Error',
          text: 'Ha ocurrido un error contacte con el administrador',
          icon: 'error',
          confirmButtonColor: '#4D750F',
          confirmButtonText: AuthResource.Acept
        });

        //setError('Ha ocurrido un error contacte con el administrador')
      }
      return false;
    }
  }, []);

  const buscarPersona = async () => {
    let error: boolean = false;
    let title: string = '';
    setLoading(true);
    setPersona(false);
    setErrorUser('');
    setError('');
    setMessageUser('');
    if (typeDocument.value === '') {
      title = 'Revise el formulario';
      error = true;
      setTypeDocument({ value: '', error: true });
    }
    if (document.value === '') {
      title = 'Revise el formulario';
      error = true;
      setDocument({ value: '', error: true });
    }

    if (error) {
      Swal.fire({
        title: 'Error',
        text: title,
        icon: 'error',
        confirmButtonColor: '#4D750F',
        confirmButtonText: AuthResource.Acept
      });

      //setError(title)
      setLoading(false);
    } else {
      const data: any = await getPersona(typeDocument.value, document.value);
      if (!data.value) {
        Swal.fire({
          title: 'Información',
          text: 'Ya se encuentra registrado un usuario con los datos suministrados, por favor inicie sesión.',
          icon: 'info',
          confirmButtonColor: '#4D750F',
          confirmButtonText: AuthResource.Acept
        });

        //setErrorUser('Ya se encuentra registrado un usuario con los datos suministrados, por favor inicie sesión.')
      } else {
        Swal.fire({
          title: 'Información',
          text: 'Por favor diligenciar de manera correcta el formulario de registro',
          icon: 'info',
          confirmButtonColor: '#4D750F',
          confirmButtonText: AuthResource.Acept
        });

        //setMessageUser('Por favor diligenciar de manera correcta el formulario de registro')
      }
      setPersona(data.value);
      setLoading(false);
    }
  };

  const handleSelectChange = (e: any) => {
    const { value, name } = e.target;
    if (name === 'tipoPersona') {
      setTypePerson({ value: value, error: false });
    } else if (name === 'tipoDocumento') {
      setTypeDocument({ value: value, error: false });
    } else if (name === 'document') {
      setDocument({ value: value, error: false });
    }
    setPersona(false);
    setError('');
    setMessageUser('');
  };

  const handleModalPolitica = () => {
    setModalPolitica(!openModalPolitica);
  };

  const handleSubmit = async (data: any) => {
    setLoading(true);
    if (typePerson.value === 'N') {
      try {
        const response = await axios
          .post(`${baseApiUrl}personas/register-persona-natural-admin-personas/`, data, {
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
        setError('');

        Swal.fire({
          title: 'Información',
          text: response.data.detail,
          icon: 'success',
          confirmButtonColor: '#4D750F',
          confirmButtonText: AuthResource.Acept
        });

        //setMessage(response.data.detail)
        setCurrentStep((currentStep: number) => currentStep + 1);
      } catch (error: any) {
        if (typeof error === 'string') {
          Swal.fire({
            title: 'Error',
            text: error,
            icon: 'error',
            confirmButtonColor: '#4D750F',
            confirmButtonText: AuthResource.Acept
          });

          //setError(error)
        } else {
          Swal.fire({
            title: 'Error',
            text: 'Ha ocurrido un error contacte con el administrador',
            icon: 'error',
            confirmButtonColor: '#4D750F',
            confirmButtonText: AuthResource.Acept
          });

          //setError('Ha ocurrido un error contacte con el administrador')
        }
        setMessage('');
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    obtenerTiposDocu();
    obtenerPaises();
    obtenerGeneros();
  }, [obtenerTiposDocu, obtenerPaises, obtenerGeneros]);

  return (
    <form>
   
      {currentStep === 1 && (
        <div className="p-1">
          <div className="m-auto rounded-xl bg-slate-200 p-1">
            <div className="rounded-xl bg-white p-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label
                    className={
                      typeDocument.error
                        ? 'mb-2 block text-sm font-bold text-[#d60f30]'
                        : 'mb-2 block text-sm font-bold text-[#562707]'
                    }
                    htmlFor="typeDocument"
                  >
                    {AuthResource.RegisterTypeDocument}
                  </label>
                  <select
                    name="tipoDocumento"
                    value={typeDocument.value}
                    onChange={(e) => handleSelectChange(e)}
                    className={
                      typeDocument.error
                        ? 'block w-full rounded-lg border border-red-500 bg-red-50 p-2.5 text-red-900 placeholder-red-700 focus:border-red-500 focus:ring-red-500 dark:border-red-500 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500'
                        : 'w-full rounded-lg border border-[#562707] p-2 text-[#562707]'
                    }
                  >
                    <option value="">Seleccione una opción</option>
                    {dataTypeDocument.map((value: any, index: number) => (
                      <option key={index} value={value.cod_tipo_documento}>
                        {value.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className={
                      document.error
                        ? 'mb-2 block text-sm font-bold text-[#d60f30]'
                        : 'mb-2 block text-sm font-bold text-[#562707]'
                    }
                    htmlFor="document"
                  >
                    {AuthResource.RegisterDocument}
                  </label>
                  <input
                    type="number"
                    name="document"
                    id="document"
                    placeholder={AuthResource.Document}
                    value={document.value}
                    onChange={(e) => handleSelectChange(e)}
                    className={
                      document.error
                        ? 'block w-full rounded-lg border border-red-500 bg-red-50 p-2.5 text-red-900 placeholder-red-700 focus:border-red-500 focus:ring-red-500 dark:border-red-500 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500'
                        : 'w-full rounded-lg border border-[#562707] p-2 text-[#562707]'
                    }
                  />
                </div>
              </div>
            <Grid container spacing={2} className="mb-4 justify-center overflow-x-auto">
                    <Grid item  >
                  <button
                    onClick={() => buscarPersona()}
                    type="button"
                    className="float-right m-auto mt-6 mb-6 block rounded-full bg-[#4D750F] px-6 py-2 font-medium text-white shadow-xl"
                  >
                    Buscar
                    {loading && (
                      <span
                        className="loader"
                        style={{ width: '20px', height: '20px', marginLeft: '10px' }}
                      ></span>
                    )}
                  </button>
                </Grid>

                    <Grid item  >
                  <button
                    onClick={() => setEditar(false)}
                    type="button"
                    className="float-right m-auto mt-6 mb-6 block rounded-full bg-[#4D750F] px-6 py-2 font-medium text-white shadow-xl"
                  >
                    regresar
                   
                  </button>
                </Grid>
              </Grid>

              {errorUser && (
                <div
                  className="mb-4 flex items-center rounded-lg border-t-4 border-red-600 bg-red-50 p-4 text-center text-sm text-red-800 dark:border-red-800 dark:bg-gray-800 dark:text-red-400"
                  role="alert"
                >
                  <svg
                    className="me-3 inline h-4 w-4 shrink-0"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
                  </svg>
                  <span className="sr-only">Info</span>
                  <div>
                    <span className="text-center font-medium">¡Error!</span> {errorUser}{' '}
                    <a href="/auth/signin/" className="font-bold underline">
                      {' '}
                      CLICK AQUÍ
                    </a>
                  </div>
                </div>
              )}
              {messageUser && (
                <div
                  className="mb-4 flex items-center rounded-lg border-t-4 border-blue-600 bg-blue-50 p-4 text-sm text-blue-800 dark:bg-gray-800 dark:text-blue-400"
                  role="alert"
                >
                  <svg
                    className="me-3 inline h-4 w-4 shrink-0"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
                  </svg>
                  <span className="sr-only">Info</span>
                  <div>
                    <span className="font-medium">¡Información!</span> {messageUser}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {typePerson.value === 'N' && persona && (
        <RegisterNaturalForm
          document={document}
          setDocument={setDocument}
          setTypePerson={setTypePerson}
          setTypeDocument={setTypeDocument}
          currentStep={currentStep}
          dataPaisNacimiento={dataPaisNacimiento}
          dataGenero={dataGenero}
          dataDepartamento={dataDepartamento}
          dataCiudad={dataCiudad}
          obtenerDepartamento={obtenerDepartamento}
          obtenerCiudad={obtenerCiudad}
          setError={setError}
          setCurrentStep={setCurrentStep}
          typeDocument={typeDocument}
          typePerson={typePerson}
          dataCiudadNotificacion={dataCiudadNotificacion}
          dataDepartamentoNotificacion={dataDepartamentoNotificacion}
          handleModalPolitica={handleModalPolitica}
          loading={loading}
          handleSubmit={handleSubmit} 
          getTiposComprador={getTiposComprador}   
             />
      )}
      {openModalPolitica && (
        <Modal
          title=""
          button={
            <button
              type="button"
              className="float-right rounded-2xl bg-[#4D750F] px-6 py-2 text-sm text-white mr-4"
              onClick={handleModalPolitica}
            >
              Aceptar
            </button>
          }
        >
          <div style={{ width: '30%', float: 'left', height: '110px' }}>
            <Image width={150} height={32} src="/images/corporate/logo.png" alt="Logo" priority />
          </div>
          <div
            className="text-2xl font-bold text-[#562707]"
            style={{ width: '70%', float: 'right', height: '110px', textAlign: 'center' }}
          >
            <h3 className="">POLITICA DE TRATAMIENTO DE DATOS PERSONALES</h3>
          </div>
          <p style={{ marginBottom: '20px', textAlign: 'justify' }}>{MainResource.Politica1}</p>
          <p style={{ marginBottom: '20px', textAlign: 'justify' }}>{MainResource.Politica2}</p>
          <p style={{ marginBottom: '20px', textAlign: 'justify' }}>{MainResource.Politica3}</p>
          <p style={{ textAlign: 'justify' }}>{MainResource.Politica4}</p>
        </Modal>
      )}
    </form>
  );
};

export default RegisterAdminForm;
