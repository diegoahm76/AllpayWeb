'use client';

import ModalContainer from '@/presenters/components/ui/ModalContainer';
import AddIcon from '@mui/icons-material/Add'; // Ícono de agregar
import { Grid, IconButton } from '@mui/material';
import axios from 'axios';
import { signIn, useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import React, { useEffect, useState } from 'react';
import DocViewer, { DocViewerRenderers } from 'react-doc-viewer';
import Delet_icon from '../../shared/logo/logodelet';
import { Button } from '../../ui/AnimatedButton';
import AnimatedInput from '../../ui/AnimatedInput';
import AnimatedSelect from '../../ui/AnimatedSelect';
import AnimatedSwitch from '../../ui/AnimatedSwitch';
import DynamicTable from '../../ui/DynamicTable';
import Asignaciones from './Asignaciones';
import {
  asignarDocumentos,
  finalizarDocumento,
  generarDocumento,
  handleArchivoChange,
  handleVerificarCodigo,
  obtenerPersonasFirma,
  obtenerPlantillas,
  obtenerTiposDocumento,
  obtenerUsuarioActual
} from './services/services.service';

// import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import Swal from 'sweetalert2';
import { fetchAuthenticationMethodsg } from '@/app/api/auth/authenticationMethodsg';
import { useRouter } from 'next/navigation';

// Configura el worker para evitar errores
// pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js`;

interface GeneracionDocumentoProps {
  onSubmit?: (data: any) => void;
}

const GeneracionDocumento: React.FC<GeneracionDocumentoProps> = ({}) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });
  const valueSesion: any = session;

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  const [detalleSeleccionado, setDetalleSeleccionado] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    plantilla: '',
    radicado: false,
    tipodocumento: '',
    numerodocumento: '',
    nombre: ''
  });

  const baseApiUrl = process.env.BASE_API_URL;

  

  const [plantillas, setPlantillas] = useState<{ value: number; label: string }[]>([]);
  const [plantillasData, setPlantillasData] = useState<any[]>([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<any | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  const [file, setFile] = useState<string>('');
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;

    let parsedValue: string | boolean = value;

    // 👇 Solo convierte a boolean si el campo es 'radicado'
    if (name === 'radicado') {
      parsedValue = value === 'true';
    }

    setFormData((prev) => ({
      ...prev,
      [name]: parsedValue
    }));

    // Solo ejecutar lógica de plantilla si el select es de plantilla
    if (name === 'plantilla') {
      const plantilla = plantillasData.find((p) => p.id_plantilla_doc === Number(value));

      if (plantilla) {
        setPlantillaSeleccionada(plantilla);
        setFile(
          detalleSeleccionado?.id_documento_generado?.ruta_documento ?? plantilla.ruta_documento
        );
        setIdPlantillaDoc(plantilla.id_plantilla_doc);
      }
    }
  };

  const opcionesRadicado = [
    { key: 'true', value: 'true', title: 'Sí' },
    { key: 'false', value: 'false', title: 'No' }
  ];

  useEffect(() => {
    if (!valueSesion || !valueSesion.user || !valueSesion.user.tokens?.access) return;
    obtenerPlantillas({ setPlantillas, setPlantillasData, valueSesion });
  }, [valueSesion]);

  const buildPayload = () => {
    if (!plantillaSeleccionada) return;

    const finalVars: Record<string, string> = {};

    plantillaSeleccionada.variables.forEach((varName: string) => {
      finalVars[varName] = variableValues[varName]?.trim()
        ? variableValues[varName]
        : `{{ ${varName} }}`;
    });

    return {
      variable: 'B',
      // consecutivo: formData?.radicado,
      id_plantilla_doc: plantillaSeleccionada.id_plantilla_doc,
      variables: finalVars
    };
  };
  const handleVariableChange = (name: string, value: string) => {
    setVariableValues((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  const [idDocumentoGenerado, setIdDocumentoGenerado] = useState<number | null>(null);

  const handleLimpiarCampos = () => {
    const camposLimpios: Record<string, string> = {};

    plantillaSeleccionada?.variables?.forEach((varName: string) => {
      camposLimpios[varName] = '';
    });

    setVariableValues(camposLimpios);
  };
  const [idPlantillaDoc, setIdPlantillaDoc] = useState<number | null>(null);

  const [mostrarVariables, setMostrarVariables] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);

  useEffect(() => {
    if (!valueSesion || !valueSesion.user || !valueSesion.user.tokens?.access) return;
    obtenerTiposDocumento({
      setDocumentTypes,
      valueSesion
    });
  }, [valueSesion]);
  const token = valueSesion?.user?.tokens.access;
  const [id2faPersona, setId2faPersona] = useState<number | null>(null);
  const [openfirma, setOpenfirma] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [openModalAsignaciones, setOpenModalAsignaciones] = useState(false);

  const [countdown, setCountdown] = useState(300); // 5 minutos en segundos

  const validations = async () => {
    const has2fa = await fetchAuthenticationMethodsg(token);

    if (!has2fa || has2fa.success === false || !has2fa.data || has2fa.data.length === 0) {
      const errorMessage = has2fa?.detail || 'No se pudieron obtener los métodos de autenticación';

      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} 
            py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300 
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] 
            disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 
            outline-none focus:outline-none
          `
        },
        buttonsStyling: false
      });

      return true;
    }

    setId2faPersona(has2fa.data[0].id_2fa_persona);
    return false;
  };

  const [idVerificacion2FA, setIdVerificacion2FA] = useState<number | null>(); // Puedes poner esto dinámico si lo necesitas

  // Enviar código y abrir modal
  useEffect(() => {
    const sendVerificationCode = async () => {
      if (!id2faPersona || !token) return;

      try {
        const response = await axios.post(
          `${baseApiUrl}users/enviar-codigo-segundo-facto-autenticacion/${id2faPersona}/`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        setCountdown(300); // Reinicia contador
        setOpenfirma(true);
        setIdVerificacion2FA(response.data.data.id_verificacion_2fa);
      } catch (error) {
        console.error('Error al enviar código 2FA:', error);
      }
    };

    sendVerificationCode();
  }, [id2faPersona, token]);

  useEffect(() => {
    if (!openfirma || countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [openfirma, countdown]);

  const minutos = Math.floor(countdown / 60);
  const segundos = countdown % 60;

  const [codigo, setCodigo] = useState('');

  type PersonaFirma = {
    id_persona: number;
    tipo_persona: string;
    tipo_persona_desc: string;
    tipo_documento: string;
    numero_documento: string;
    nombres: string;
    apellidos: string;
    firma: boolean;
    puede_reasignar: boolean;
  };

  const [personasFirma, setPersonasFirma] = useState<PersonaFirma[]>([]);
  const [agregados, setAgregados] = useState<PersonaFirma[]>([]);

  useEffect(() => {
    if (!valueSesion || !valueSesion.user || !valueSesion.user.tokens?.access) return;
    obtenerPersonasFirma({
      formData,
      setPersonasFirma,
      valueSesion
    });
  }, [formData, valueSesion]);
  const actions = [
    {
      label: 'Agregar',
      render: (row: any) => (
        <IconButton
          onClick={() => handleAgregarPersona(row)}
          aria-label="Agregar"
          sx={{
            backgroundColor: 'rgb(var(--green))', // Color verde personalizado
            color: 'white',
            borderRadius: '16px', // Equivalente a rounded-2xl
            transition: 'all 0.3s',
            '&:hover': {
              backgroundColor: 'rgb(var(--green-80))' // Verde con 80% de opacidad
            },
            '&:disabled': {
              opacity: 0.5,
              cursor: 'not-allowed'
            },
            padding: '8px' // Ajusta según necesites
          }}
        >
          <AddIcon />
        </IconButton>
      )
    }
  ];
  const handleEliminarAgregado = (row: PersonaFirma) => {
    setAgregados((prev) => prev.filter((p) => p.id_persona !== row.id_persona));
  };
  const actionsAgregados = [
    {
      label: 'Eliminar',
      render: (row: PersonaFirma) => (
        <IconButton onClick={() => handleEliminarAgregado(row)}>
          <Delet_icon />
        </IconButton>
      )
    }
  ];
  const [idAsignacionAuto, setIdAsignacionAuto] = useState<number | null>(null);
  const [idPersonaAuto, setIdPersonaAuto] = useState<number | null>(null);

  useEffect(() => {
    if (valueSesion) {
      obtenerUsuarioActual({ setAgregados, valueSesion, setIdPersonaAuto });
    }
  }, [valueSesion]);

  const handleAgregarPersona = (persona: PersonaFirma) => {
    const yaExiste = agregados.some((p) => p.id_persona === persona.id_persona);
    if (!yaExiste) {
      setAgregados((prev) => [
        ...prev,
        {
          ...persona,
          firma: true, // o false por defecto
          puede_reasignar: false
        }
      ]);
    }
  };

  const columnsPersonas = [
    { key: 'tipo_documento', label: 'Tipo Documento' },
    { key: 'numero_documento', label: 'Número Documento' },
    { key: 'nombres', label: 'Nombres' },
    { key: 'apellidos', label: 'Apellidos' }
  ];
  const columnsAgregados = [
    { key: 'numero_documento', label: 'Nro Documento' },
    { key: 'tipo_documento', label: 'Tipo Documento' },
    { key: 'nombres', label: 'Nombres' },
    { key: 'apellidos', label: 'Apellidos' },
    {
      key: 'firma',
      label: 'Firma',
      render: (_: any, row: any) => (
        <AnimatedSwitch
          label="Activo"
          checked={row.firma}
          onChange={(checked: boolean) => {
            setAgregados((prev) =>
              prev.map((p) => (p.id_persona === row.id_persona ? { ...p, firma: checked } : p))
            );
          }}
          disabled={false}
          darkMode={isDarkMode}
        />
      )
    },
    {
      key: 'puede_reasignar',
      label: 'Puede Reasignar',
      render: (_: any, row: any) => (
        <AnimatedSwitch
          label="Activo"
          checked={row.puede_reasignar}
          onChange={(checked: boolean) => {
            setAgregados((prev) =>
              prev.map((p) =>
                p.id_persona === row.id_persona ? { ...p, puede_reasignar: checked } : p
              )
            );
          }}
          disabled={false}
          darkMode={isDarkMode}
        />
      )
    }
  ];

  useEffect(() => {
    if (detalleSeleccionado?.id_documento_generado?.id_plantilla_doc) {
      const plantillaId = detalleSeleccionado.id_documento_generado.id_plantilla_doc;
      const plantilla = plantillasData.find((p) => p.id_plantilla_doc === plantillaId);

      if (plantilla) {
        setFormData((prev) => ({
          ...prev,
          plantilla: plantillaId.toString()
        }));
        setPlantillaSeleccionada(plantilla);
        setFile(detalleSeleccionado.id_documento_generado.ruta_documento);
        setIdPlantillaDoc(plantilla.id_plantilla_doc);
      }

      // 👇 aquí se asigna el id del documento generado
      setIdDocumentoGenerado(detalleSeleccionado.id_documento_generado.id_documento_generado);
    }
  }, [detalleSeleccionado, plantillasData]);
  const handleLimpiar = () => {
    setFormData({
      plantilla: '',
      radicado: false,
      tipodocumento: '',
      numerodocumento: '',
      nombre: ''
    });
    setPlantillaSeleccionada(null);
    setFile('');
    setMostrarVariables(false);
    setIdPlantillaDoc(null);
    setIdDocumentoGenerado(null);
    setDetalleSeleccionado(null); // 👈 esto limpia por completo la selección
  };
  useEffect(() => {
    const aceptarAsignacion = async () => {
      if (!idAsignacionAuto) return;

      try {
        await axios.put(
          `${baseApiUrl}documentos/aceptar_rechazar_asignacion/`,
          {
            id_asignacion_doc: idAsignacionAuto,
            cod_estado_asignacion: 'Ac' // Estado "Aceptado"
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${valueSesion.user.tokens.access}`
            }
          }
        );

      } catch (error) {
        console.error('Error al aceptar asignación automática:', error);
      }
    };

    aceptarAsignacion();
  }, [idAsignacionAuto]); // 🔁 solo cuando cambia idAsignacionAuto
  useEffect(() => {
    setIdDocumentoGenerado(detalleSeleccionado?.id_documento_generado?.id_documento_generado);
    setMostrarVariables(false);
    handleLimpiarCampos();
  }, [detalleSeleccionado]);

  const fetchAllPersonas = async () => {
    try {
      await obtenerPersonasFirma({
        formData,
        setPersonasFirma,
        valueSesion
      });

      return {
        data: personasFirma,
        total_pages: 1
      };
    } catch (error) {
      console.error('Error al obtener datos de personas:', error);
      return {
        data: [],
        total_pages: 0
      };
    }
  };

  const fetchAllAgregados = async () => {
    try {
      return {
        data: agregados,
        total_pages: 1
      };
    } catch (error) {
      console.error('Error al obtener datos de agregados:', error);
      return {
        data: [],
        total_pages: 0
      };
    }
  };
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-full">
      <div
        className={`rounded-xl p-6 ${isDarkMode ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'}`}
      >
        <div className={`rounded-xl p-4 relative ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
          <button
            onClick={() => router.push('/')}
            className={`absolute top-2 right-4 text-2xl ${isDarkMode ? 'text-white hover:text-red-400' : 'text-[rgb(var(--brown))] hover:text-red-700'}`}
          >
            &times;
          </button>
          <h2
            className={`mt-6 mb-6 text-center text-xl sm:text-2xl lg:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}
          >
            GENERACIÓN DE DOCUMENTOS
          </h2>
          <div className="space-y-6">
            {/* Primera fila - Selects */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <AnimatedSelect
                label="Plantilla"
                name="plantilla"
                value={formData.plantilla}
                disabled={Boolean(formData.plantilla && idDocumentoGenerado)}
                onChange={handleSelectChange}
                darkMode={isDarkMode}
                options={plantillas.map((item, index) => ({
                  key: index,
                  value: item.value,
                  title: item.label
                }))}
              />

              <AnimatedSelect
                label="Consecutivo"
                name="radicado"
                disabled={Boolean(detalleSeleccionado)}
                value={formData.radicado.toString()} // 👈 aquí pasamos el booleano como string
                onChange={handleSelectChange}
                darkMode={isDarkMode}
                options={opcionesRadicado}
              />
            </div>
          </div>{' '}
          <Grid
            container
            direction="row"
            marginTop={2}
            spacing={2}
            sx={{
              justifyContent: 'flex-end',
              alignItems: 'center'
            }}
          >
            
          
            <div className="flex flex-col sm:flex-row gap-2 p-2 justify-center sm:justify-end items-center w-full">
              <Grid item>
                <Button
                  title={mostrarVariables ? 'Ocultar campos editables' : 'Ver campos editables'}
                  onClick={() => setMostrarVariables((prev) => !prev)}
                  disabled={!formData.plantilla}
                />
              </Grid>
            
              <Grid item>
                <Button
                  disabled={
                    !formData.plantilla || Boolean(detalleSeleccionado?.id_documento_generado)
                  }
                  title="Cargar Documento"
                  onClick={() => document.getElementById('upload-doc-input')?.click()}
                />

                <input
                  id="upload-doc-input"
                  type="file"
                  accept=".docx"
                  style={{ display: 'none' }}
                  onChange={(e) =>
                    handleArchivoChange({
                      e,
                      idPlantillaDoc,
                      idDocumentoGenerado,
                      setFile,
                      setIdDocumentoGenerado,
                      setPlantillaSeleccionada,
                      valueSesion
                    })
                  }
                />
              </Grid>
  
              <Grid item>
                <Button onClick={() => setOpenModalAsignaciones(true)} title="Ver Asignaciones" />
              </Grid>

              <Grid item>
                <Button title="Limpiar" onClick={handleLimpiar} />
              </Grid>

              <Grid item>
                <Button onClick={() => router.push('/')} title="Salir" />
              </Grid>
            </div>
          </Grid>
        </div>

        <ModalContainer
          isOpen={openModalAsignaciones}
          onClose={() => setOpenModalAsignaciones(false)}
          size="3xl"
        >
          <Asignaciones
            setOpenModalAsignaciones={setOpenModalAsignaciones}
            setDetalleSeleccionado={setDetalleSeleccionado}
            detalleSeleccionado={detalleSeleccionado}
          />
        </ModalContainer>

        <ModalContainer
          isOpen={openfirma}
          onClose={() => {
            setOpenfirma(false);
            setCodigo('');
            setId2faPersona(null);
          }}
        >
          <div className="space-y-5">
            <div>
              <h3
                className={`mb-4 text-center text-xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-[#562707]'
                }`}
              >
                Autenticación de firma de documento
              </h3>
            </div>

            <div
              className={`text-center text-lg font-medium ${
                isDarkMode ? 'text-white' : 'text-[#562707]'
              }`}
            >
              El código será válido durante:{' '}
              <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>
                {minutos}:{segundos.toString().padStart(2, '0')}
              </span>
            </div>

            <div className="mt-6 flex flex-col items-center space-y-4">
              <AnimatedInput
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                label={'Codigo'}
                name={'Codigo'}
                darkMode={isDarkMode}
              />
              <Button
                onClick={() =>
                  handleVerificarCodigo({
                    codigo,
                    idVerificacion2FA,
                    idDocumentoGenerado,
                    token,
                    setFile
                  })
                }
                title="Firma Documento"
              ></Button>
            </div>
          </div>
        </ModalContainer>
        <ModalContainer isOpen={openModal} onClose={() => setOpenModal(false)} size="3xl">
          <div className="space-y-5">
            <div>
              <h3
                className={`mb-4 text-center text-xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-[#562707]'
                }`}
              >
                Busqueda de personas
              </h3>
            </div>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <AnimatedSelect
                  name="tipodocumento"
                  label="Tipo de Documento"
                  value={formData.tipodocumento}
                  onChange={handleSelectChange}
                  darkMode={isDarkMode}
                  options={documentTypes.map((value: any, index: number) => ({
                    key: index,
                    value: value.cod_tipo_documento,
                    title: value.nombre
                  }))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <AnimatedInput
                  type="number"
                  name="numerodocumento"
                  label="Número de documento"
                  value={formData.numerodocumento}
                  onChange={handleSelectChange}
                  darkMode={isDarkMode}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <AnimatedInput
                  type="text"
                  name="nombre"
                  label="Nombre"
                  value={formData.nombre}
                  onChange={handleSelectChange}
                  darkMode={isDarkMode}
                />
              </Grid>
            </Grid>

            <Grid container direction="row" marginTop={2} justifyContent="center">
              <Button
                onClick={() =>
                  obtenerPersonasFirma({
                    formData,
                    setPersonasFirma,
                    valueSesion
                  })
                }
                title="Buscar"
              />
            </Grid>
            <DynamicTable
              columns={columnsPersonas}
              data={personasFirma}
              currentPage={1}
              totalPages={1}
              onPageChange={() => {}}
              actions={actions}
              fetchAllData={fetchAllPersonas}
              darkMode={isDarkMode}
            />
          </div>
        </ModalContainer>
        {mostrarVariables && (
          <div className={`mt-4 rounded-xl p-6 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
            <div>
              <h3
                className={`mb-10 text-center text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-[#562707]'
                }`}
              >
                Datos del documento
              </h3>
            </div>
            <Grid container spacing={2}>
              {/* {plantillaSeleccionada?.variables
                ?.filter(
                  (varName: string) => varName !== 'consecutivo' && !/^Firma_\d+$/.test(varName)
                )
                .map((varName: string) => (
                  <Grid item xs={12} sm={6} md={4} key={varName}>
                    <AnimatedInput
                      label={varName}
                      name={varName}
                      type="text"
                      value={variableValues[varName] || ''}
                      onChange={(e) => handleVariableChange(varName, e.target.value)}
                      darkMode={isDarkMode}
                    />
                  </Grid>
                ))} */}
              {(
                detalleSeleccionado?.id_documento_generado?.variables_por_llenar ??
                plantillaSeleccionada?.variables ??
                []
              )
                .filter(
                  (varName: string) => varName !== 'consecutivo' && !/^Firma_\d+$/.test(varName)
                )
                .map((varName: string) => (
                  <Grid item xs={12} sm={6} md={4} key={varName}>
                    <AnimatedInput
                      label={varName}
                      name={varName}
                      type="text"
                      value={variableValues[varName] || ''}
                      onChange={(e) => handleVariableChange(varName, e.target.value)}
                      darkMode={isDarkMode}
                    />
                  </Grid>
                ))}

              <Grid
                container
                direction="row"
                marginTop={2}
                sx={{
                  justifyContent: 'flex-end',
                  alignItems: 'center'
                }}
              >
                <Grid item>
                  <Button
                    onClick={() =>
                      generarDocumento({
                        buildPayload,
                        formData,
                        idDocumentoGenerado,
                        setIdDocumentoGenerado,
                        setFile,
                        setPlantillaSeleccionada,
                        valueSesion
                      })
                    }
                    title="Ver Borrador"
                  />
                </Grid>
              </Grid>
            </Grid>
          </div>
        )}
        {plantillaSeleccionada && file && (
          <>
            <div className={`mt-4 rounded-xl p-6 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
              <Grid
                item
                xs={12}
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflowY: 'auto',
                  py: 4
                }}
              >
                <Grid
                  container
                  direction="row"
                  spacing={2}
                  sx={{
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <Grid item xs={12} sm={2}>
                    <Button
                      // disabled={detalleSeleccionado?.firma === false
                      //    ||  !idAsignacionAuto
                      //   }
                      disabled={
                        detalleSeleccionado?.firma === false ||
                        (!detalleSeleccionado?.firma && !idAsignacionAuto)
                      }
                      onClick={validations}
                      className="w-full"
                      title="Firma Documento"
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Button
                      onClick={handleLimpiarCampos}
                      className="w-full"
                      title="Limpiar Plantilla"
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Button
                      onClick={() => window.open(file, '_blank')}
                      className="w-full"
                      title="Descargar"
                    />
                  </Grid>
                </Grid>
              </Grid>
              <Grid
                container
                direction="row"
                sx={{
                  minHeight: { xs: 'auto', md: '100vh' } // Responsive height
                }}
              >
                {/* {file} */}

                <Grid
                  item
                  xs={12}
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  {(file.includes('.docx') || file.includes('.doc')) && (
                    <DocViewer
                      pluginRenderers={DocViewerRenderers}
                      documents={[{ uri: file, fileType: 'docx' }]}
                      style={{
                        height: 1000,
                        width: '100%',
                        display: 'flex',
                        margin: 'auto'
                      }}
                    />
                  )}

                  {!file.includes('.docx') && !file.includes('.doc') && (
                    <embed
                      style={{ display: 'flex', margin: 'auto' }}
                      src={file}
                      type="application/pdf"
                      width="100%"
                      height="1080px"
                    />
                  )}
                </Grid>
              </Grid>
            </div>

            <div className={`mt-4 rounded-xl p-6 ${isDarkMode ? 'bg-[#260f00] border border-white/20' : 'bg-white'}`}>
              {/* Título */}
              <div>
                <h3
                  className={`mb-10 text-center text-2xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-[#562707]'
                  }`}
                >
                  Destinatario
                </h3>
              </div>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <AnimatedSelect
                    name="tipodocumento"
                    label="Tipo de Documento"
                    value={formData.tipodocumento}
                    onChange={handleSelectChange}
                    darkMode={isDarkMode}
                    options={documentTypes.map((value: any, index: number) => ({
                      key: index,
                      value: value.cod_tipo_documento,
                      title: value.nombre
                    }))}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <AnimatedInput
                    type="number"
                    name="numerodocumento"
                    label="Número de documento"
                    value={formData.numerodocumento}
                    onChange={handleSelectChange}
                    darkMode={isDarkMode}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <AnimatedInput
                    type="text"
                    name="nombre"
                    label="Nombre"
                    value={formData.nombre}
                    onChange={handleSelectChange}
                    darkMode={isDarkMode}
                  />
                </Grid>
                {/* Botón Ver Borrador */}

                <Grid item xs={12} sm={12}>
                  {agregados.length > 0 && (
                    <DynamicTable
                      columns={columnsAgregados}
                      data={agregados}
                      actions={actionsAgregados}
                      isLoading={false}
                      onPageChange={() => {}}
                      currentPage={0}
                      totalPages={0}
                      fetchAllData={fetchAllAgregados}
                      darkMode={isDarkMode}
                    />
                  )}
                </Grid>

                <Grid
                  container
                  direction="row"
                  marginTop={2}
                  spacing={2}
                  sx={{
                    justifyContent: 'flex-end',
                    alignItems: 'center'
                  }}
                >
                  {/* {idAsignacionAuto && <h1>ID Asignación Auto: {idAsignacionAuto}</h1>} */}
                  <Grid item>
                    <Button
                      onClick={() =>
                        finalizarDocumento({
                          idDocumentoGenerado,
                          valueSesion,
                          setFile
                        })
                      }
                      title="Finalizar Documento"
                    />
                  </Grid>

                  <Grid item>
                    <Button
                      disabled={
                        !idDocumentoGenerado ||
                        agregados.length === 0 ||
                        detalleSeleccionado?.puede_reasignar === false
                      }
                      onClick={async () => {
                        try {
                          let nuevoId = idDocumentoGenerado;

                          const tempSetId = (id: number) => {
                            nuevoId = id;
                            setIdDocumentoGenerado(id); // mantiene la lógica actual
                          };

                          await generarDocumento({
                            buildPayload,
                            formData,
                            idDocumentoGenerado,
                            setIdDocumentoGenerado: tempSetId,
                            setFile,
                            setPlantillaSeleccionada,
                            valueSesion
                          });

                          if (!nuevoId) {
                            console.error('No se pudo generar el documento');
                            return;
                          }

                          await asignarDocumentos({
                            agregados,
                            idDocumentoGenerado: nuevoId,
                            valueSesion,
                            idPersonaAuto,
                            setIdAsignacionAuto
                          });
                        } catch (err) {
                          console.error('Error en el proceso de envío:', err);
                        }
                      }}
                      title="Enviar"
                    />
                  </Grid>

                  <Grid item>
                    <Button
                      disabled={detalleSeleccionado?.puede_reasignar === false}
                      onClick={() => setOpenModal(true)}
                      title="Buscar"
                    />
                  </Grid>
                </Grid>
              </Grid>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GeneracionDocumento;
