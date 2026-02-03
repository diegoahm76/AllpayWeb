'use client';
import axios from 'axios';
import { signIn, useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useState } from 'react';
import '@/presenters/css/background.css';
import { useTheme } from 'next-themes';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import DynamicTable from '@/presenters/components/ui/DynamicTable';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import { useRouter } from 'next/navigation';
import { Grid } from '@mui/material';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import ModalAddress from '@/presenters/components/shared/ModalAddress';
import {
  buscarPersonasAll,
  handleActualizarPersonaTemporal,
  handleCrearPersonaTemporal,
  handleDownloadExcel,
  obtenerMunicipios
} from './services/identificacion.service';
import Editar from '@/presenters/components/shared/logo/LogoEditar';

const baseApiUrl = process.env.BASE_API_URL;
const Administracion_cargos: React.FC = () => {
  const router = useRouter();
  interface FormData {
    cod_tipo_documento: string;
    numero_documento: string;
    nombre: string;
    direccion: string;
    cod_municipio: string;
    cod_departamento: string;
    email: string;
    confirmar_email: string;
    tel_fijo: string;
    tel_celular: string;
    confirmar_tel_celular: string;
    nombre_contacto: any;
    apellido_contacto: any;
    numero_documento_contacto: any;
    nombre_persona_crea: any;
  }

  const initialFormData: FormData = {
    cod_tipo_documento: '',
    numero_documento: '',
    nombre: '',
    direccion: '',
    cod_municipio: '',
    cod_departamento: '',
    email: '',
    confirmar_email: '',
    tel_fijo: '',
    tel_celular: '',
    confirmar_tel_celular: '',
    nombre_contacto: '',
    apellido_contacto: '',
    numero_documento_contacto: '',
    nombre_persona_crea: ''
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | any>) => {
    const { name, value } = e.target;

    const updatedData = {
      ...formData,
      [name]: value
    };

    setFormData(updatedData);

    // Validación cruzada
    if (name === 'confirmar_email' || name === 'email') {
      const match = updatedData?.email === updatedData?.confirmar_email;
      setErrors((prev) => ({
        ...prev,
        confirmar_email: !match
      }));
      setCustomErrorMessages((prev) => ({
        ...prev,
        confirmar_email: match ? '' : 'Los correos no coinciden'
      }));
    }

    if (name === 'confirmar_tel_celular' || name === 'tel_celular') {
      const match = updatedData?.tel_celular === updatedData?.confirmar_tel_celular;
      setErrors((prev) => ({
        ...prev,
        confirmar_tel_celular: !match
      }));
      setCustomErrorMessages((prev) => ({
        ...prev,
        confirmar_tel_celular: match ? '' : 'Los teléfonos no coinciden'
      }));
    }
  };

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const valueSesion: any = session;

  const [user, setUser] = useState<any[]>([]);

  const columns = [
    { key: 'nombre_persona_crea', label: 'Persona que Creo' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'nombre_cod_documento', label: 'Tipo Documento' },
    { key: 'numero_documento', label: 'Documento' },
    { key: 'email', label: 'Email' },
    { key: 'tel_celular', label: 'Tel. Celular' },
    { key: 'direccion', label: 'Dirección' },
    { key: 'nombre_departamento', label: 'Departamento' },
    { key: 'nombre_municipio', label: 'Municipio' },
    { key: 'numero_documento_contacto', label: 'N Documento Contacto' },
    { key: 'nombre_contacto', label: 'Nombre del Contacto' },
    { key: 'apellido_contacto', label: 'Apellido del Contacto' },
    { key: 'fecha_creacion', label: 'Fecha' }
  ];
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Formatear datos
  const formattedData = user.map((item: any) => ({
    ...item,
    fecha_creacion: item.fecha_creacion
      ? new Date(item.fecha_creacion).toLocaleDateString('es-CO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      : ''
  }));

  // Calcular total de páginas (10 elementos por página)
  const itemsPerPage = 10;
  const totalPages = Math.ceil(formattedData.length / itemsPerPage);

  // Obtener los datos de la página actual
  const paginatedData = formattedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const actions = [
    {
      label: 'Editar',
      render: (row: any) => (
        <button
          onClick={() => {
            handleEdit(row);
            setShowModal(true);
            setConfigurar(!configurar);
          }}
          className="flex h-[27px] w-[27px] items-center justify-center p-[2px] transition hover:opacity-80"
        >
          <Editar width={21} height={20} />
        </button>
      )
    }
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    buscarPersonasAll({ setUser, setIsLoading, valueSesion, filters });
  }, [currentPage]);

  const [editId, setEditId] = useState<number | null>(null);

  const handleEdit = (row: any) => {
    setEditId(row.id_identificacion_temporal);

    setFormData({
      email: row?.email || '',
      nombre: row?.nombre || '',
      tel_fijo: row?.tel_fijo || '',
      direccion: row?.direccion || '',
      confirmar_email: row?.email || '',
      tel_celular: row?.tel_celular || '',
      cod_municipio: row?.cod_municipio || '',
      nombre_contacto: row?.nombre_contacto || '',
      cod_departamento: row?.cod_departamento || '',
      numero_documento: row?.numero_documento || '',
      confirmar_tel_celular: row?.tel_celular || '',
      apellido_contacto: row?.apellido_contacto || '',
      cod_tipo_documento: row?.cod_tipo_documento || '',
      nombre_persona_crea: row?.nombre_persona_crea || '',
      numero_documento_contacto: row?.numero_documento_contacto || ''
    });

    setShowModal(false); // si estás usando modal
  };

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!showModal) {
      setFormData((prev) => ({
        ...prev,
        nombre: ''
      }));
    }
  }, [showModal]);

  const [
    ,
    // errors
    setErrors
  ] = useState({
    confirmar_email: false,
    confirmar_tel_celular: false
  });

  const [
    ,
    // customErrorMessages
    setCustomErrorMessages
  ] = useState({
    confirmar_email: '',
    confirmar_tel_celular: ''
  });

  const [documentTypes, setDocumentTypes] = useState([]);
  const obtenerTiposDocumento = useCallback(async () => {
    try {
      const response = await axios
        .get(`${baseApiUrl}personas/tipos-documento/get-list/?activo=True`, {
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
      setDocumentTypes(response.data.data);
    } catch (error) {}
  }, []);

  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const obtenerDepartamentos = useCallback(async () => {
    try {
      const response = await axios.get(`${baseApiUrl}personas/departamento/get-list/CO/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

      if (response.data.success === false) {
        throw response.data.detail;
      }

      setDepartamentos(response.data.data);
    } catch (error) {
      console.error('Error al obtener departamentos:', error);
    }
  }, []);

  useEffect(() => {
    obtenerDepartamentos();
    obtenerTiposDocumento();
  }, [obtenerTiposDocumento, obtenerDepartamentos]);
  const [municipios, setMunicipios] = useState<any[]>([]);

  useEffect(() => {
    obtenerMunicipios({
      cod_departamento: formData?.cod_departamento,
      setMunicipios
    });
  }, [formData?.cod_departamento, obtenerMunicipios]);

  const [openModalAddress, setModalAddress] = useState(false);

  const handleModal = () => {
    setModalAddress(!openModalAddress); // Alterna entre abrir/cerrar
  };
  const [formDataa, setFormDataa] = useState<any>({
    addressData: {
      location: { value: '' },
      ubicacion: { value: '' },
      nombreVia: { value: '' },
      complemento: { value: '' },
      coordenadaX: { value: '' },
      coordenadaY: { value: '' },
      viaPrincipal: { value: '' },
      viaTerciaria: { value: '' },
      viaSecundaria: { value: '' },
      letraPrincipal: { value: '' },
      letraTerciaria: { value: '' },
      letraPrincipal2: { value: '' },
      letraTerciaria2: { value: '' },
      letraSecundaria: { value: '' },
      letraSecundaria2: { value: '' },
      nombreViaTerciaria: { value: '' },
      cordenadaPrincipal: { value: '' },
      cordenadaTerciaria: { value: '' },
      prefijoBisPrincipal: { value: '' },
      cordenadaSecundaria: { value: '' },
      prefijoBisTerciaria: { value: '' },
      nombreViaSecundaria: { value: '' },
      prefijoBisSecundaria: { value: '' }
    }
  });

  const getGeneratedAddress = (addressData: any) => {
    const addressParts = Object.values(addressData)
      .map((field: any) => field.value)
      .filter((val) => val !== '') // Filtra valores vacíos
      .join(' '); // Une todos los valores

    return addressParts.replace(/\s+/g, ' ').trim(); // Limpia espacios
  };
  const generatedAddress = getGeneratedAddress(formDataa.addressData);
  useEffect(() => {
    if (
      generatedAddress &&
      generatedAddress !== formData.direccion // evita sobreescribir manual
    ) {
      setFormData((prevData: any) => ({
        ...prevData,
        direccion: generatedAddress
      }));
    }
  }, [generatedAddress]);

  const [configurar, setConfigurar] = useState(true);
  const isDarkMode = mounted && theme === 'dark';

  const handleClick = () => {
    setConfigurar(!configurar); // cambia entre vista y formulario

    // limpiar solo si se está saliendo del formulario
    if (!configurar) {
      setFormData(initialFormData);
      setEditId(null);
    }
  };
  const [filters, setFilters] = useState({
    cod_tipo_documento: '',
    numero_documento: '',
    fecha_inicio: '',
    fecha_fin: ''
  });
  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (!editId) {
      setFormData((prev) => ({
        ...prev,
        nombre_persona_crea: valueSesion?.user?.nombre || ''
      }));
    }
  }, [editId, valueSesion, configurar]);

  const initialFormDataa = {
    addressData: {
      location: { value: '' },
      ubicacion: { value: '' },
      nombreVia: { value: '' },
      complemento: { value: '' },
      coordenadaX: { value: '' },
      coordenadaY: { value: '' },
      viaPrincipal: { value: '' },
      viaTerciaria: { value: '' },
      viaSecundaria: { value: '' },
      letraPrincipal: { value: '' },
      letraTerciaria: { value: '' },
      letraPrincipal2: { value: '' },
      letraTerciaria2: { value: '' },
      letraSecundaria: { value: '' },
      letraSecundaria2: { value: '' },
      nombreViaTerciaria: { value: '' },
      cordenadaPrincipal: { value: '' },
      cordenadaTerciaria: { value: '' },
      prefijoBisPrincipal: { value: '' },
      cordenadaSecundaria: { value: '' },
      prefijoBisTerciaria: { value: '' },
      nombreViaSecundaria: { value: '' },
      prefijoBisSecundaria: { value: '' }
    }
  };
  useEffect(() => {
    setFilters({
      cod_tipo_documento: '',
      numero_documento: '',
      fecha_inicio: '',
      fecha_fin: ''
    });
    // cada vez que "configurar" cambie, vaciamos todo
    setFormDataa(initialFormDataa);
  }, [configurar]);

  useEffect(() => {
    if (configurar) {
      setCurrentPage(1);
      buscarPersonasAll({ setUser, setIsLoading, valueSesion, filters });
    }
  }, [configurar]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="w-full">
      {configurar ? (
        <>
          <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
            <div className="w-full p-1">
              <div
                className={`m-auto w-full rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}
              >
                <div
                  className={`relative rounded-xl p-4 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}
                >
                  <button
                    onClick={() => router.push('/')}
                    className={`absolute top-2 right-4 text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
                  >
                    &times;
                  </button>

                  <div className="relative mt-[39px] flex items-center justify-center">
                    <h3
                      className={`text-center  text-xl sm:text-2xl lg:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                    >
                      IDENTIFICACIÓN DE USUARIOS
                    </h3>
                  </div>

                  <Grid container spacing={2} marginTop={2}>
                    <Grid item xs={12} sm={4}>
                      <AnimatedSelect
                        name="cod_tipo_documento"
                        label="Tipo de Documento"
                        value={filters.cod_tipo_documento}
                        onChange={(e: any) =>
                          handleFilterChange('cod_tipo_documento', e.target.value)
                        }
                        options={documentTypes.map((value: any, index: number) => ({
                          key: index,
                          value: value.cod_tipo_documento,
                          title: value.nombre
                        }))}
                        darkMode={isDarkMode}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        type="number"
                        name="numero_documento"
                        id="numero_documento"
                        label="Número de Documento"
                        value={filters.numero_documento}
                        onChange={(e) => handleFilterChange('numero_documento', e.target.value)}
                        darkMode={isDarkMode}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        type="date"
                        name="fecha_inicio"
                        label="Fecha Inicio"
                        value={filters.fecha_inicio}
                        onChange={(e) => handleFilterChange('fecha_inicio', e.target.value)}
                        darkMode={isDarkMode}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        type="date"
                        name="fecha_fin"
                        label="Fecha Fin"
                        value={filters.fecha_fin}
                        onChange={(e) => handleFilterChange('fecha_fin', e.target.value)}
                        darkMode={isDarkMode}
                      />
                    </Grid>
                  </Grid>

                  <Grid
                    container
                    direction="row"
                    spacing={2}
                    marginTop={1}
                    sx={{
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <Grid item>
                      <Button
                        title="Buscar"
                        onClick={() => {
                          setCurrentPage(1);
                          buscarPersonasAll({ setUser, setIsLoading, valueSesion, filters });
                        }}
                      />
                    </Grid> 
                    <Grid item>
                      <Button
                        title="Limpiar"
                        onClick={() =>
                          setFilters({
                            cod_tipo_documento: '',
                            numero_documento: '',
                            fecha_inicio: '',
                            fecha_fin: ''
                          })
                        }
                      />
                    </Grid>{' '}
                   <Grid item>
                      <Button onClick={() => router.push('/')} title="Salir" />
                    </Grid>
                  </Grid>

                  <DynamicTable
                    columns={columns}
                    data={paginatedData}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    actions={actions}
                    isLoading={isLoading}
                    fetchAllData={async (_page) => {
                      const data = await handleDownloadExcel({
                        filters,
                        valueSesion
                      });
                      return {
                        data,
                        total_pages: 1
                      };
                    }}
                  />

                  <div className="mt-6 flex justify-center space-x-4">
                    <div>{/* <Button onClick={() => router.push('/')} title="Salir" /> */}</div>
                    <div>
                      <Button onClick={handleClick} title="Crear" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
            <div className="w-full p-1">
              <div
                className={`m-auto w-full rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}
              >
                <div
                  className={`relative rounded-xl p-4 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'}`}
                >
                  <button
                    onClick={() => router.push('/')}
                    className={`absolute top-2 right-4 text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
                  >
                    &times;
                  </button>

                  <div className="space-y-4">
                    <h3
                      className={`mt-4 mb-4 text-center text-xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                    >
                      Identificación
                    </h3>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <AnimatedSelect
                          name="cod_tipo_documento"
                          label="Tipo de Documento"
                          value={formData.cod_tipo_documento}
                          onChange={handleChange}
                          options={documentTypes.map((value: any, index: number) => ({
                            key: index,
                            value: value.cod_tipo_documento,
                            title: value.nombre
                          }))}
                        darkMode={isDarkMode}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <AnimatedInput
                          type="number"
                          name="numero_documento"
                          id="numero_documento"
                          label="Número de Documento"
                          value={formData.numero_documento}
                          onChange={handleChange}
                        darkMode={isDarkMode}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <AnimatedInput
                          type="text"
                          name="nombre"
                          id="nombre"
                          label="Nombre"
                          value={formData.nombre}
                          onChange={handleChange}
                        darkMode={isDarkMode}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <AnimatedSelect
                          label="Departamento"
                          value={formData.cod_departamento}
                          name="cod_departamento"
                          onChange={handleChange}
                          options={departamentos.map((dep: any) => ({
                            key: dep.cod_departamento,
                            value: dep.cod_departamento,
                            title: dep.nombre
                          }))}
                        darkMode={isDarkMode}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <AnimatedSelect
                          label="Municipio"
                          name="cod_municipio"
                          value={formData.cod_municipio}
                          onChange={handleChange}
                          options={municipios.map((mun: any) => ({
                            key: mun.cod_municipio,
                            value: mun.cod_municipio,
                            title: mun.nombre
                          }))}
                        darkMode={isDarkMode}
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <AnimatedInput
                          type="text"
                          name="direccion"
                          id="direccion"
                          disabled={true}
                          label="Dirección"
                          value={formData.direccion}
                          onChange={handleChange}
                        darkMode={isDarkMode}
                        />
                      </Grid>

                      <Grid
                        container
                        marginTop={3}
                        direction="row"
                        sx={{
                          justifyContent: 'flex-end',
                          alignItems: 'center'
                        }}
                      >
                        <Grid item xs={12} sm={6} md={6} lg={6} xl={6} marginTop={-2}>
                          <button
                            onClick={() => handleModal()}
                            type="button"
                            className="float-right m-auto mt-1 mb-6 block rounded-full bg-[#4D750F] px-6 py-2 font-medium text-white shadow-xl"
                          >
                            Generar Dirección
                          </button>
                        </Grid>
                      </Grid>
                      {openModalAddress && (
                        <ModalAddress
                          title="Generador de direcciones"
                          onClose={handleModal}
                          formData={formDataa}
                          setFormData={setFormDataa}
                        />
                      )}
                    </Grid>
                  </div>
                </div>

                <div
                  className={`mt-6 rounded-xl p-4 ${isDarkMode ? 'bg-[#260f00] text-white border border-white/20' : 'bg-white'} relative`}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={12}>
                      <h3
                        className={`mb-4 text-center text-xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
                      >
                        Datos de Contacto
                      </h3>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        type="number"
                        name="numero_documento_contacto"
                        id="numero_documento_contacto"
                        label="Número de Documento de Contacto"
                        value={formData.numero_documento_contacto}
                        onChange={handleChange}
                        darkMode={isDarkMode}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        name="nombre_contacto"
                        id="nombre_contacto"
                        label="Nombre de Contacto"
                        value={formData.nombre_contacto}
                        onChange={handleChange}
                        darkMode={isDarkMode}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        name="apellido_contacto"
                        id="apellido_contacto"
                        label="Apellido de Contacto"
                        value={formData.apellido_contacto}
                        onChange={handleChange}
                        darkMode={isDarkMode}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        type="email"
                        name="email"
                        id="email"
                        label="Correo Electrónico"
                        value={formData.email}
                        onChange={handleChange}
                        darkMode={isDarkMode}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        type="email"
                        name="confirmar_email"
                        id="confirmar_email"
                        label="Confirmar Correo Electrónico"
                        value={formData.confirmar_email}
                        onChange={handleChange}
                        darkMode={isDarkMode}
                        // error={errors.confirmar_email}
                      />
                      {/* {errors.confirmar_email && (
                        <p className="mt-1 text-sm text-red-500">
                          {customErrorMessages.confirmar_email}
                        </p>
                      )} */}
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        type="number"
                        name="tel_fijo"
                        id="tel_fijo"
                        label="Teléfono Fijo"
                        value={formData.tel_fijo}
                        onChange={handleChange}
                        darkMode={isDarkMode}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        type="number"
                        name="tel_celular"
                        id="tel_celular"
                        label="Teléfono Celular"
                        value={formData.tel_celular}
                        onChange={handleChange}
                        darkMode={isDarkMode}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        type="number"
                        name="confirmar_tel_celular"
                        id="confirmar_tel_celular"
                        label="Confirmar Teléfono Celular"
                        value={formData.confirmar_tel_celular}
                        onChange={handleChange}
                        darkMode={isDarkMode}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <AnimatedInput
                        disabled
                        name="nombre_persona_crea"
                        id="nombre_persona_crea"
                        label="Persona que Registro"
                        value={formData.nombre_persona_crea}
                        onChange={handleChange}
                        darkMode={isDarkMode}
                      />
                    </Grid>

                    <Grid
                      container
                      direction="row"
                      sx={{
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <div className="mt-6 flex justify-center space-x-4">
                        <Button
                          title={editId ? 'Actualizar' : 'Crear'}
                          onClick={() =>
                            editId
                              ? handleActualizarPersonaTemporal({
                                  editId,
                                  formData,
                                  setFormData,
                                  initialFormData,
                                  valueSesion,
                                  setEditId,
                                  setConfigurar,
                                  setUser,
                                  setIsLoading,
                                  buscarPersonasAll: (args) =>
                                    buscarPersonasAll({ ...args, filters })
                                })
                              : handleCrearPersonaTemporal({
                                  formData,
                                  setConfigurar,
                                  setFormData,
                                  initialFormData,
                                  valueSesion,
                                  setUser,
                                  setIsLoading,
                                  buscarPersonasAll: (args) =>
                                    buscarPersonasAll({ ...args, filters })
                                })
                          }
                        />

                        <Button title="Cancelar" onClick={handleClick}></Button>
                      </div>
                    </Grid>
                  </Grid>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Administracion_cargos;
