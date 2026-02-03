'use client';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedMultiSelect from '@/presenters/components/ui/AnimatedMultiSelectProps';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import '@/presenters/css/background.css';
import { Grid } from '@mui/material';
import axios from 'axios';
import { signIn, useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import Usuarioadmi from '../admiusuario/admiusuario';
import AdmiusuarioJuridico from '../admiusuario/admiusuarioJuridico';

const baseApiUrl = process.env.BASE_API_URL;

const UsuarioConfi: React.FC<{
  tipoUsuario: any;
  selectedUser: any;
  setEditar: any;
  tipousuario: any;
  isSuperUsuario: any;
  setIsSuperUsuario: any;
}> = ({
  selectedUser,
  setEditar,
  tipousuario,
  // setIsSuperUsuario,
  isSuperUsuario,
  tipoUsuario
}) => {
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });
  useEffect(() => {
    if (selectedUser) {
      setFormData((prevData) => ({
        ...prevData,
        Activo: selectedUser.is_active // Esto es boolean
      }));
    }
  }, [selectedUser]);
  const { theme } = useTheme();
  useEffect(() => {
    if (selectedUser?.tipo_usuario) {
      const tipo = selectedUser.tipo_usuario === 'Interno' ? 'I' : 'E';
      setFormData((prev) => ({
        ...prev,
        tipoUsuario: tipo
      }));
    }
  }, [selectedUser]);

  const valueSesion: any = session;

  // const [documentTypes, setDocumentTypes] = useState<any[]>([]);

  const [userRoles, setUserRoles] = useState<any[]>([]);

  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]); // Importante que sea tipo number[]
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const obtenerTodosLosRoles = useCallback(async () => {
    try {
      const response = await axios.get(`${baseApiUrl}roles/get-list/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

      if (response.data.success) {
        setAllRoles(response.data.data);
      }
    } catch (error) {
    }
  }, []);

  const buscarPersonasAll = useCallback(
    async (value: any) => {
      if (value.consultar) {
        try {
          const response = await axios.get(
            `${baseApiUrl}roles/get-roles-by-persona/${selectedUser?.id_persona}/`,
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${valueSesion.user.tokens.access}`
              }
            }
          );

          if (response.data.success === false) {
            throw response.data.detail;
          }

          const roles = response.data.roles;
          setUserRoles(roles); // Guardamos roles completos

          const allRoleIds = roles.map((role: any) => role.id_rol);
          setSelectedDocuments(allRoleIds);
        } catch (error) {
          console.log(error as string);
        }
      } 
    },
    [selectedUser?.id_persona, valueSesion.user.tokens.access]
  );

  const mergedRoles = useMemo(() => {
    // Combinar roles del get-list y userRoles
    const combined = [...allRoles];

    userRoles.forEach((userRole) => {
      const exists = allRoles.some((role) => role.id_rol === userRole.id_rol);
      if (!exists) {
        combined.push(userRole);
      }
    });

    return combined;
  }, [allRoles, userRoles]);

  useEffect(() => {
    obtenerTodosLosRoles();
    buscarPersonasAll({ consultar: true });
  }, [obtenerTodosLosRoles, buscarPersonasAll]);

  const updateRolesByPersona = async () => {
    try {
      const rolUsuariosWeb = mergedRoles.find((role) => role.nombre_rol === 'Rol Usuarios Web');

      const filteredRoles = selectedDocuments.filter((rolId) => rolId !== rolUsuariosWeb?.id_rol);

      const response = await axios.put(
        `${baseApiUrl}roles/update-role-by-persona/${selectedUser?.id_persona}/`,
        {
          roles: filteredRoles
        },
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
          title: 'Actualización Exitosa',
          text: 'Los roles fueron actualizados correctamente.',
          confirmButtonText: 'Aceptar',
          customClass: {
            confirmButton: `
              ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
              flex items-center justify-center gap-2 outline-none focus:outline-none
            `
          },
          buttonsStyling: false
        });
        return true;
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Error en la solicitud',
          text: response.data.detail || 'Ocurrió un problema al intentar actualizar los roles.',
          confirmButtonText: 'Aceptar',
          customClass: {
            confirmButton: `
              ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
              flex items-center justify-center gap-2 outline-none focus:outline-none
            `
          },
          buttonsStyling: false
        });
        return false;
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || 'Ocurrió un problema al intentar actualizar los roles.';

      await Swal.fire({
        icon: 'error',
        title: 'Error en la solicitud',
        text: errorMessage,
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2 outline-none focus:outline-none
          `
        },
        buttonsStyling: false
      });

      return false;
    }
  };

  const actualizarEstadoUsuario = async () => {
    const currentValues = {
      is_active: formData.Activo,
      justificacion_activacion: formData.cambiouno
    };

    try {
      await axios.patch(
        `${baseApiUrl}roles/usuarios/actualizar-estado/${selectedUser?.id_persona}/`,
        currentValues,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${valueSesion.user.tokens.access}`
          }
        }
      );

      await Swal.fire({
        icon: 'success',
        title: 'Actualización Exitosa',
        text: 'El estado del usuario fue actualizado correctamente.',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2 outline-none focus:outline-none
          `
        },
        buttonsStyling: false
      });

      return true; // Hubo cambios
    } catch (error: unknown) {
      console.error('Error actualizando estado:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Error en la solicitud',
        text: 'Ocurrió un problema al intentar actualizar el estado del usuario.',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2 outline-none focus:outline-none
          `
        },
        buttonsStyling: false
      });

      return false; // Error
    }
  };

  const [, setDataTypePerson] = useState([]);

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
    } catch (error) {}
  }, []);

  // const [dataTypePersonn, setDataTypePersonn] = useState('');
  const [, setOriginalEstado] = useState({
    is_blocked: false,
    is_active: false
  });

  const obtenerAuditoriasActualizacion = useCallback(async () => {
    try {
      const response = await axios
        .get(`${baseApiUrl}roles/auditorias/actualizaciones/${selectedUser?.id_persona}/`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${valueSesion.user.tokens.access}`
          }
        })
        .catch((error) => error.response);

      if (!response || response.data.success === false) {
        const detail = response?.data?.detail || 'Error al obtener auditorías';
        console.warn('Auditorías no disponibles:', detail); // Solo lo logueas
        return;
      }

      const auditorias = response.data.data;
      if (!auditorias || auditorias.length === 0) {
        console.warn('No hay auditorías disponibles.');
        return;
      }

      const auditoriaReciente = auditorias[0];

      const valoresActualizados = auditoriaReciente.valores_actualizados?.update || {};
      const nuevoEstado = valoresActualizados.Nuevo?.is_blocked ?? false;
      const estadoAnterior = valoresActualizados.Anterior?.is_blocked ?? false;

      setOriginalEstado({
        is_blocked: nuevoEstado,
        is_active: estadoAnterior
      });
    } catch (error) {
      console.error('Error obteniendo auditorías de actualización:', error);
    }
  }, [selectedUser?.id_persona, valueSesion.user.tokens.access]);

  useEffect(() => {
    obtenerAuditoriasActualizacion();
  }, []);

  useEffect(() => {
    obtenerTiposPersona();
  }, [obtenerTiposPersona]);

  interface FormData {
    Tipousuario: any;
    Activo: any;
    ultimocambiouno: any;
    cambiouno: any;
    bloqueo: any;
    ultimocambiodos: any;
    cambiodos: any;
    fechacreacion: any;
    fechaactivacion: any;
    creadoportal: any;
    creausuario: any;
    superusuario: any;
    tipodocumentosuper: any;
    numerodocumetosuper: any;
    nombresuper: any;
    fecha_nacimiento: any;
    tipoUsuarioo: any;
    fecha_inicio_cargo_actual: any;
    fecha_a_finalizar_cargo_actual: any;
    id_cargo: any;
  }

  const initialFormData: FormData = {
    fecha_inicio_cargo_actual: '',
    fecha_a_finalizar_cargo_actual: '',
    // tipoUsuarioo: '',
    tipoUsuarioo: selectedUser?.tipo_usuario === 'Interno' ? 'I' : 'E',

    Activo: null,
    bloqueo: true,
    Tipousuario: '',
    ultimocambiouno: new Date().toISOString().split('T')[0],
    cambiouno: '',
    ultimocambiodos: new Date().toISOString().split('T')[0],
    cambiodos: '',
    fechacreacion: '',
    fechaactivacion: '',
    creadoportal: '',
    creausuario: '',
    superusuario: '',
    tipodocumentosuper: '',
    numerodocumetosuper: '',
    nombresuper: '',
    fecha_nacimiento: '',
    id_cargo: ''
  };

  const fieldTypes: { [key: string]: 'string' | 'file' | 'boolean' } = {
    fecha_inicio_cargo_actual: 'string',
    fecha_a_finalizar_cargo_actual: 'string',
    bloqueo: 'boolean',
    Activo: 'boolean',
    fecha_nacimiento: 'string',
    Tipousuario: 'string',
    tipoUsuarioo: 'string',
    ultimocambiouno: 'string',
    cambiouno: 'string',
    ultimocambiodos: 'string',
    cambiodos: 'string',
    fechacreacion: 'string',
    fechaactivacion: 'string',
    creadoportal: 'string',
    creausuario: 'string',
    superusuario: 'string',
    tipodocumentosuper: 'string',
    numerodocumetosuper: 'string',
    nombresuper: 'string',
    id_cargo: 'string'
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | any>) => {
    const { name, value, files } = e.target;
    let newValue: string | File | boolean = value;

    if (fieldTypes[name] === 'file' && files) {
      newValue = files[0];
    } else if (fieldTypes[name] === 'boolean') {
      newValue = value === 'true';
      newValue = value === 'true';
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: newValue
    }));
  };

  const options = [
    { label: 'Activo', value: true },
    { label: 'Inactivo', value: false }
  ];

  const [currentStep, setCurrentStep] = useState(1);

  const cambiarSuperUsuario = async () => {
    try {
      const response = await axios.put(
        `${baseApiUrl}users/change-superuser/${selectedUser?.id_persona}/`,
        {}, // Si no necesitas enviar un body, dejamos un objeto vacío
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${valueSesion?.user?.tokens?.access}`
          }
        }
      );

      if (response?.data?.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Superusuario actualizado',
          text: response.data.message || 'Cambio realizado correctamente.',
          confirmButtonText: 'Aceptar',
          customClass: {
            confirmButton: `
              ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
              flex items-center justify-center gap-2 outline-none focus:outline-none
            `
          },
          buttonsStyling: false
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: response.data.message || 'No se pudo actualizar el superusuario.',
          confirmButtonText: 'Aceptar',
          customClass: {
            confirmButton: `
              ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
              flex items-center justify-center gap-2 outline-none focus:outline-none
            `
          },
          buttonsStyling: false
        });
      }
    } catch (error) {
      console.error('Error al cambiar superusuario:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Error en la solicitud',
        text: 'Ocurrió un problema al intentar actualizar el superusuario.',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2 outline-none focus:outline-none
          `
        },
        buttonsStyling: false
      });
    }
  };

  const totalSteps = isSuperUsuario ? 3 : 2;

  const steps = ['Tipo de usuario', 'Administración de roles'];

  if (isSuperUsuario) {
    steps.push('Super Usuario');
  }

  const nextStep = () => {
    setCurrentStep((prevStep) => (prevStep < totalSteps ? prevStep + 1 : prevStep));
  };

  const prevStep = () => {
    setCurrentStep((prevStep) => (prevStep > 1 ? prevStep - 1 : prevStep));
  };

  const handleChangee = (event: { target: { value: any } }) => {
    const {
      target: { value }
    } = event;

    const selectedValues =
      typeof value === 'string'
        ? value.split(',').map((val: string) => Number(val))
        : Array.isArray(value)
          ? value.map((val: string | number) => Number(val))
          : [];

    setSelectedDocuments(selectedValues);
  };

  // Lógica antes del return:
  const isTextFieldDisabled = selectedUser?.is_active === formData.Activo;

  const [tiposUsuario, setTiposUsuario] = useState<{ value: string; label: string }[]>([]);

  const obtenerTiposUsuario = useCallback(async () => {
    try {
      const response = await axios.get(`${baseApiUrl}choices/tipo-usuario/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

      if (response.data.success) {
        const options = response.data.data.map(([value, label]: [string, string]) => ({
          value,
          label
        }));
        setTiposUsuario(options);
      }
    } catch (error) {
      console.error('Error al obtener los tipos de usuario:', error);
    }
  }, []);
  useEffect(() => {
    obtenerTiposUsuario();
  }, []);
  const esExterno = formData.tipoUsuarioo === 'E';
  useEffect(() => {
    if (formData.tipoUsuarioo === 'E') {
      setFormData((prev) => ({
        ...prev,
        fecha_inicio_cargo_actual: '',
        fecha_a_finalizar_cargo_actual: ''
      }));
    }
  }, [formData.tipoUsuarioo]);
  const actualizarTipoUsuario = async () => {
    const { tipoUsuarioo, fecha_inicio_cargo_actual, fecha_a_finalizar_cargo_actual, id_cargo } =
      formData;

    if (tipoUsuarioo === 'I' && (!fecha_inicio_cargo_actual || !fecha_a_finalizar_cargo_actual)) {
      await Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: "'Fecha inicio cargo actual' y 'fecha a finalizar cargo actual' son obligatorias para usuarios internos.",
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2 outline-none focus:outline-none
          `
        },
        buttonsStyling: false
      });
      return;
    }

    if (fecha_inicio_cargo_actual && fecha_a_finalizar_cargo_actual) {
      const fechaInicio = new Date(fecha_inicio_cargo_actual);
      const fechaFin = new Date(fecha_a_finalizar_cargo_actual);

      if (fechaFin < fechaInicio) {
        await Swal.fire({
          icon: 'warning',
          title: 'Rango de fechas inválido',
          text: 'La fecha de finalización no puede ser anterior a la fecha de inicio.',
          confirmButtonText: 'Aceptar',
          customClass: {
            confirmButton: `
              ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
              flex items-center justify-center gap-2 outline-none focus:outline-none
            `
          },
          buttonsStyling: false
        });
        return;
      }
    }

    try {
      const payload = {
        tipo_usuario: tipoUsuarioo,
        fecha_inicio_cargo_actual,
        fecha_a_finalizar_cargo_actual,
        id_cargo: id_cargo || null
      };

      const response = await axios.patch(
        `${baseApiUrl}roles/usuarios/actualizar-tipo-usuario/${selectedUser?.id_persona}/`,
        payload,
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
          title: '¡Éxito!',
          text: 'El tipo de usuario ha sido actualizado correctamente.',
          confirmButtonText: 'Aceptar',
          customClass: {
            confirmButton: `
              ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
              flex items-center justify-center gap-2 outline-none focus:outline-none
            `
          },
          buttonsStyling: false
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: response.data.detail || 'Ocurrió un error inesperado.',
          confirmButtonText: 'Aceptar',
          customClass: {
            confirmButton: `
              ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
              hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
              flex items-center justify-center gap-2 outline-none focus:outline-none
            `
          },
          buttonsStyling: false
        });
      }
    } catch (error: any) {
      const detail =
        error?.response?.data?.detail ||
        'Ocurrió un error al intentar actualizar el tipo de usuario.';
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: detail,
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: `
            ${'Aceptar'.trim().split(/\s+/).length === 1 ? 'w-[120px]' : 'px-6'} py-2 rounded-2xl bg-[rgb(var(--green))] text-white transition-all duration-300
            hover:bg-[rgb(var(--green-80))] disabled:bg-[rgb(var(--gray-40))] disabled:cursor-not-allowed cursor-pointer
            flex items-center justify-center gap-2 outline-none focus:outline-none
          `
        },
        buttonsStyling: false
      });
    }
  };

  const [cargos, setCargos] = useState<{ value: number; label: string }[]>([]);

  const obtenerCargos = useCallback(async () => {
    try {
      const response = await axios.get(`${baseApiUrl}personas/cargos/get-list/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

      if (response.data.success) {
        const options = response.data.data.map((item: any) => ({
          value: item.id_cargo,
          label: item.nombre
        }));
        setCargos(options);
      }
    } catch (error) {
      console.error('Error al obtener los cargos:', error);
    }
  }, []);

  const getDatosTipoUsuario = useCallback(async () => {
    try {
      const response = await axios.get(
        `${baseApiUrl}roles/usuarios/get-tipo-usuario/${selectedUser?.id_persona}/`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${valueSesion.user.tokens.access}`
          }
        }
      );

      if (response.data.success) {
        const data = response.data.data;

        setFormData((prev) => ({
          ...prev,
          tipoUsuarioo: data.tipo_usuario ?? '',
          id_cargo: data.id_cargo?.toString() ?? '',
          fecha_inicio_cargo_actual: data.fecha_inicio_cargo_actual ?? '',
          fecha_a_finalizar_cargo_actual: data.fecha_a_finalizar_cargo_actual ?? ''
        }));
      }
    } catch (error) {
      console.error('Error al obtener los datos del usuario:', error);
    }
  }, []);

  useEffect(() => {
    obtenerCargos();
    getDatosTipoUsuario();
  }, []);

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-center md:w-4/4 lg:w-2/2">
        <div className="w-full p-1">
          <div
            className={`m-auto w-full rounded-xl p-6 ${
              theme === 'dark' ? 'bg-opacity-10 bg-[#78390e]' : 'bg-slate-200'
            }`}
          >
            <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-[#260f00] text-white' : 'bg-white'}`}>
              <div
                data-dui-stepper-container
                data-dui-initial-step="1"
                className="mt-[55px] w-full"
              >
                {/* ✅ Contenedor centrado y responsivo */}
                <div
                  className={`mb-15 flex w-full flex-wrap justify-center gap-4 md:gap-1`} // ✅ Se adapta al ancho disponible
                >
                  <>
                    {steps?.map((step, i) => (
                      <div
                        key={i}
                        aria-disabled="false"
                        data-dui-step
                        className={`group flex items-center ${currentStep === i + 1 ? 'data-[active=true]' : ''} ${currentStep > i + 1 ? 'data-[completed=true]' : ''}`}
                      >
                        {/* ✅ Contenedor del círculo del paso */}
                        <div className="relative flex justify-center">
                          <span
                            className={`relative grid h-5 w-5 place-items-center rounded-full bg-[#4D750F] md:h-6 md:w-6 ${
                              currentStep === i + 1 ? 'text-white' : ''
                            } ${currentStep > i + 1 ? 'text-white' : ''}`}
                          >
                            {/* Icono de check si el paso está completado */}
                            {currentStep > i + 1 && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="15"
                                height="15"
                                viewBox="0,0,256,256"
                              >
                                <g fill="#ffffff">
                                  <g transform="scale(8.53333,8.53333)">
                                    <path d="M26.98047,5.99023c-0.2598,0.00774 -0.50638,0.11632 -0.6875,0.30273l-15.29297,15.29297l-6.29297,-6.29297c-0.25082,-0.26124 -0.62327,-0.36647 -0.97371,-0.27511c-0.35044,0.09136 -0.62411,0.36503 -0.71547,0.71547c-0.09136,0.35044 0.01388,0.72289 0.27511,0.97371l7,7c0.39053,0.39037 1.02353,0.39037 1.41406,0l16,-16c0.29576,-0.28749 0.38469,-0.72707 0.22393,-1.10691c-0.16075,-0.37985 -0.53821,-0.62204 -0.9505,-0.60988z"></path>
                                  </g>
                                </g>
                              </svg>
                            )}
                            {/* Círculo vacío si el paso aún no está completado */}
                            {currentStep < i + 1 && (
                              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="50" cy="50" r="30" fill="#ffffff" />
                              </svg>
                            )}
                          </span>
                          {/* Nombre del paso */}
                          <span
                            className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-sm whitespace-nowrap ${
                              theme === 'dark' ? 'text-white' : 'text-[#562707]'
                            }`}
                          >
                            <span className="hidden md:block">{step}</span>
                          </span>
                        </div>

                        {/* ✅ Línea entre pasos (responsive) */}
                        {i < steps.length - 1 && (
                          <div
                            className={`h-1 w-[60px] bg-[#4D750F] md:w-[300px] ${
                              currentStep > i + 1 ? 'bg-[#4D750F]' : 'bg-gray-300'
                            }`}
                          ></div>
                        )}
                      </div>
                    ))}
                  </>
                </div>
              </div>
            </div>

            <div>
              {/* STEP CONTENT */}
              <div>
                {currentStep === 1 && (
                  <>
                    <>
                      <div className="mt-3 [&>*]:bg-transparent [&>*]:!p-0 [&>*]:[background:none]">
                        {(selectedUser as any)?.tipo_persona === 'J' ? (
                          <AdmiusuarioJuridico
                            tipoUsuario={tipoUsuario}
                            tipousuario={tipousuario}
                            selectedUser={selectedUser}
                            setconfigurar={setEditar}
                            setEditar={setEditar}
                          />
                        ) : (
                          <Usuarioadmi
                            tipoUsuario={tipoUsuario}
                            tipousuario={tipousuario}
                            selectedUser={selectedUser}
                            setconfigurar={setEditar}
                            setEditar={setEditar}
                          />
                        )}
                      </div>
                    </>
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <div
                      className={`mt-4 rounded-xl p-4 ${theme === 'dark' ? 'bg-[#260f00] text-white' : 'bg-white'}`}
                    >
                      <>
                        <>
                          <div>
                            <h3
                              className={`mt-[15px] mb-10 text-center text-3xl font-bold ${
                                theme === 'dark' ? 'text-white' : 'text-[#562707]'
                              }`}
                            >
                              Administración de usuarios
                            </h3>
                          </div>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
                              <AnimatedMultiSelect
                                label="Rol"
                                name="rol"
                                value={selectedDocuments}
                                onChange={handleChangee}
                                options={mergedRoles.map((role) => ({
                                  key: role.id_rol,
                                  value: role.id_rol,
                                  title: role.nombre_rol
                                }))}
                                theme={theme === 'dark' ? 'dark' : 'light'}
                              />
                            </Grid>
                          </Grid>
                          <Grid
                            container
                            spacing={2}
                            // marginTop={2}
                            className="justify-end overflow-x-auto"
                          >
                            <Grid item>
                              <Button
                                title="Actualizar Rol"
                                onClick={() => updateRolesByPersona()}
                              ></Button>
                            </Grid>
                          </Grid>

                          <Grid container spacing={2}>
                            <Grid item>
                              <div>
                                <h3
                                  className={`mb-10 text-center text-2xl font-bold ${
                                    theme === 'dark' ? 'text-white' : 'text-[#562707]'
                                  }`}
                                >
                                  Vinculación
                                </h3>
                              </div>
                            </Grid>
                          </Grid>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                              <AnimatedSelect
                                label="Tipo de usuario"
                                name="tipoUsuarioo"
                                value={formData.tipoUsuarioo}
                                onChange={handleChange}
                                options={tiposUsuario.map((item, index) => ({
                                  key: index,
                                  value: item.value,
                                  title: item.label
                                }))}
                                darkMode={theme === 'dark'}
                              />
                            </Grid>

                            <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                              <AnimatedSelect
                                label="Cargo"
                                name="id_cargo"
                                value={formData.id_cargo}
                                onChange={handleChange}
                                options={cargos.map((cargo, index) => ({
                                  key: index,
                                  value: cargo.value,
                                  title: cargo.label
                                }))}
                                darkMode={theme === 'dark'}
                              />
                            </Grid>

                            <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                              <AnimatedInput
                                name="fecha_inicio_cargo_actual"
                                value={formData.fecha_inicio_cargo_actual}
                                onChange={handleChange}
                                id="fecha_inicio_cargo_actual"
                                type="date"
                                label="Fecha de inicio del cargo actual"
                                disabled={esExterno}
                                darkMode={theme === 'dark'}
                              />
                            </Grid>

                            <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                              <AnimatedInput
                                name="fecha_a_finalizar_cargo_actual"
                                value={formData.fecha_a_finalizar_cargo_actual}
                                onChange={handleChange}
                                id="fecha_a_finalizar_cargo_actual"
                                type="date"
                                label="Fecha a finalizar el cargo actual"
                                disabled={esExterno}
                                darkMode={theme === 'dark'}
                              />
                            </Grid>
                            <Grid
                              container
                              spacing={2}
                              marginTop={2}
                              className="justify-end overflow-x-auto"
                            >
                              <Grid item>
                                <Button title="Vincular" onClick={actualizarTipoUsuario}>
                                  Actualizar Tipo de Usuario
                                </Button>
                              </Grid>
                            </Grid>
                          </Grid>

                          <Grid container spacing={2}>
                            <Grid item>
                              <div>
                                <h3
                                  className={`text-center text-2xl font-bold ${
                                    theme === 'dark' ? 'text-white' : 'text-[#562707]'
                                  }`}
                                >
                                  Estado activo inactivo
                                </h3>
                              </div>
                            </Grid>
                          </Grid>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={6} lg={6} xl={6} marginTop={3.6}>
                              <AnimatedSelect
                                label="Activo"
                                name="Activo"
                                value={formData.Activo.toString()}
                                onChange={handleChange}
                                options={options.map((value: any, index: number) => ({
                                  key: index,
                                  value: value.value,
                                  title: value.label
                                }))}
                                darkMode={theme === 'dark'}
                              />
                            </Grid>

                            <Grid item xs={12} sm={6} md={6} lg={6} xl={6} marginTop={3.6}>
                              <div>
                                <AnimatedInput
                                  name="ultimocambiouno"
                                  value={formData.ultimocambiouno}
                                  onChange={handleChange}
                                  id="ultimocambiouno"
                                  type="date"
                                  disabled={true}
                                  label="fecha ultimo cambio"
                                  darkMode={theme === 'dark'}
                                />
                              </div>
                            </Grid>

                            <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
                              <div>
                                <AnimatedInput
                                  id="cambiouno"
                                  name="cambiouno"
                                  label="Justificación"
                                  required
                                  value={formData.cambiouno}
                                  onChange={handleChange}
                                  type="text"
                                  disabled={isTextFieldDisabled}
                                  darkMode={theme === 'dark'}
                                />
                              </div>
                            </Grid>
                          </Grid>
                          <Grid
                            container
                            spacing={2}
                            marginTop={2}
                            sx={{
                              justifyContent: 'center',
                              alignItems: 'center'
                            }}
                          >
                            <Grid item>
                              <Button title="Salir" onClick={() => setEditar(false)}>
                                {' '}
                              </Button>
                            </Grid>
                            <Grid item>
                              <Button
                                title=" Actualizar estado"
                                onClick={() => actualizarEstadoUsuario()}
                                disabled={isTextFieldDisabled || formData.cambiouno.trim() === ''}
                              ></Button>
                            </Grid>
                          </Grid>
                        </>
                      </>
                    </div>
                  </>
                )}

                {currentStep === 3 && isSuperUsuario && (
                  <div className={`mt-4 rounded-xl p-4 ${theme === 'dark' ? 'bg-[#260f00] text-white' : 'bg-white'}`}>
                    <>
                      <div>
                        <h3
                          className={`mt-[15px] mb-10 text-center text-3xl font-bold ${
                            theme === 'dark' ? 'text-white' : 'text-[rgb(var(--brown))]'
                          }`}
                        >
                          Delegación de superusuario
                        </h3>
                      </div>

                      <Grid container spacing={2} className="mb-4">
                        <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                          <AnimatedInput
                            disabled={true}
                            id="nombreusuario"
                            name="nombreusuario"
                            label="Número de documento"
                            type="text"
                            value={selectedUser.numero_documento}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                          <div>
                            <AnimatedInput
                              disabled={true}
                              id="primerNombre"
                              name="primerNombre"
                              label="Primer Nombre"
                              type="text"
                              value={selectedUser.primer_nombre}
                            />
                          </div>
                        </Grid>

                        <Grid item xs={12} sm={4} md={4} lg={4} xl={4}>
                          <div>
                            <AnimatedInput
                              disabled={true}
                              id="segundoNombre"
                              name="segundoNombre"
                              label="Segundo Nombre"
                              type="text"
                              value={selectedUser.segundo_nombre}
                            />
                          </div>
                        </Grid>

                        <Grid item xs={12} sm={4} md={4} lg={4} xl={4}>
                          <div>
                            <AnimatedInput
                              type="text"
                              disabled={true}
                              id="primerApellido"
                              name="primerApellido"
                              label="Primer Apellido"
                              value={selectedUser.primer_apellido}
                            />
                          </div>
                        </Grid>

                        <Grid item xs={12} sm={4} md={4} lg={4} xl={4}>
                          <div>
                            <AnimatedInput
                              disabled={true}
                              id="segundoApellido"
                              name="segundoApellido"
                              label="Segundo Apellido"
                              type="text"
                              value={selectedUser.segundo_apellido}
                            />
                          </div>
                        </Grid>

                        <Grid
                          container
                          direction="row"
                          marginTop={2}
                          spacing={2}
                          sx={{
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                        >
                          <Grid item>
                            <Button title=" Salir     " onClick={() => setEditar(false)}></Button>
                          </Grid>

                          <Grid item>
                            <Button
                              title="  Delegar Superusuario     "
                              onClick={() => cambiarSuperUsuario()}
                            ></Button>
                          </Grid>
                        </Grid>
                      </Grid>
                    </>
                  </div>
                )}
              </div>
            </div>
            <div className={`mt-4 rounded-xl p-4 ${theme === 'dark' ? 'dark' : 'bg-white'}`}>
                      <div className="mt-4 flex justify-between gap-4">
                <Button title="Anterior" onClick={prevStep} disabled={currentStep === 1} />

                <Button
                  title="Siguiente"
                  onClick={nextStep}
                  disabled={currentStep === totalSteps} // 🔥 Aquí se deshabilita si es el último paso
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsuarioConfi;
