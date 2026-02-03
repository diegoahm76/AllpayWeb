'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useSession, signIn } from 'next-auth/react';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import { useTypeDni } from '@/application/dni/useTypeDni';
import useGetDepartments from '@/application/address/useGetDepartments';
import { useGetCities } from '@/application/address/useGetCities';
import { JuridicaPayload, NaturalPayload } from '@/adapters/user/provider/provider.create';
import { createProvider } from '@/adapters/user/provider/provider.create';

// notificaciones
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';

interface CrearProveedorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface AddressData {
  ubicacion: { value: string; error: boolean };
  viaPrincipal: { value: string; error: boolean };
  nombreVia: { value: string; error: boolean };
  letraPrincipal: { value: string; error: boolean };
  letraPrincipal2: { value: string; error: boolean };
  prefijoBisPrincipal: { value: string; error: boolean };
  cordenadaPrincipal: { value: string; error: boolean };
  viaSecundaria: { value: string; error: boolean };
  nombreViaSecundaria: { value: string; error: boolean };
  letraSecundaria: { value: string; error: boolean };
  letraSecundaria2: { value: string; error: boolean };
  prefijoBisSecundaria: { value: string; error: boolean };
  cordenadaSecundaria: { value: string; error: boolean };
  viaTerciaria: { value: string; error: boolean };
  nombreViaTerciaria: { value: string; error: boolean };
  letraTerciaria: { value: string; error: boolean };
  letraTerciaria2: { value: string; error: boolean };
  prefijoBisTerciaria: { value: string; error: boolean };
  cordenadaTerciaria: { value: string; error: boolean };
  complemento: { value: string; error: boolean };
  location: { value: boolean; error: boolean };
  coordenadaX: { value: number; error: boolean };
  coordenadaY: { value: number; error: boolean };
}

interface FormData {
  tipo_persona: { value: 'N' | 'J'; error: boolean };
  tipo_documento: { value: string; error: boolean };
  numero_documento: { value: string; error: boolean };
  cod_municipio_expedicion_id: { value: string; error: boolean };
  municipio_residencia: { value: string; error: boolean };
  cod_municipio_laboral_nal: { value: string; error: boolean };
  email: { value: string; error: boolean };
  direccion_notificaciones: { value: string; error: boolean };
  coordenada_x: { value: string; error: boolean };
  coordenada_y: { value: string; error: boolean };
  primer_nombre: { value: string; error: boolean };
  segundo_nombre: { value: string; error: boolean };
  primer_apellido: { value: string; error: boolean };
  segundo_apellido: { value: string; error: boolean };
  telefono_celular: { value: string; error: boolean };
  nombre_comercial: { value: string; error: boolean };
  razon_social: { value: string; error: boolean };
  telefono_celular_empresa: { value: string; error: boolean };
  addressData: AddressData;
  address: { value: string; error: boolean };
  addressComplete: { value: string; error: boolean };
  coordenadaX: { value: string; error: boolean };
  coordenadaY: { value: string; error: boolean };
  departamento?: { value: string; error: boolean };
  municipio?: { value: string; error: boolean };
}

const CrearProveedorModal: React.FC<CrearProveedorModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const valueSesion: any = session;

  const { types, isLoading, fetchTypes } = useTypeDni();
  const [hasFetchedTypes, setHasFetchedTypes] = useState(false);

  // Estados para departamentos y ciudades
  const [hasLoadedDepartments, setHasLoadedDepartments] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);

  const { departments, fetchDepartments } = useGetDepartments();

  const { cities } = useGetCities({
    departamentoId: selectedDepartment || 0,
    token: valueSesion?.user?.tokens?.access || ''
  });

  const [formData, setFormData] = useState<FormData>({
    tipo_persona: { value: 'N', error: false },
    tipo_documento: { value: 'CC', error: false },
    numero_documento: { value: '', error: false },
    cod_municipio_expedicion_id: { value: '', error: false },
    municipio_residencia: { value: '', error: false },
    cod_municipio_laboral_nal: { value: '', error: false },
    email: { value: '', error: false },
    direccion_notificaciones: { value: '', error: false },
    coordenada_x: { value: '', error: false },
    coordenada_y: { value: '', error: false },
    primer_nombre: { value: '', error: false },
    segundo_nombre: { value: '', error: false },
    primer_apellido: { value: '', error: false },
    segundo_apellido: { value: '', error: false },
    telefono_celular: { value: '', error: false },
    nombre_comercial: { value: '', error: false },
    razon_social: { value: '', error: false },
    telefono_celular_empresa: { value: '', error: false },
    addressData: {
      ubicacion: { value: '', error: false },
      viaPrincipal: { value: '', error: false },
      nombreVia: { value: '', error: false },
      letraPrincipal: { value: '', error: false },
      letraPrincipal2: { value: '', error: false },
      prefijoBisPrincipal: { value: '', error: false },
      cordenadaPrincipal: { value: '', error: false },
      viaSecundaria: { value: '', error: false },
      nombreViaSecundaria: { value: '', error: false },
      letraSecundaria: { value: '', error: false },
      letraSecundaria2: { value: '', error: false },
      prefijoBisSecundaria: { value: '', error: false },
      cordenadaSecundaria: { value: '', error: false },
      viaTerciaria: { value: '', error: false },
      nombreViaTerciaria: { value: '', error: false },
      letraTerciaria: { value: '', error: false },
      letraTerciaria2: { value: '', error: false },
      prefijoBisTerciaria: { value: '', error: false },
      cordenadaTerciaria: { value: '', error: false },
      complemento: { value: '', error: false },
      location: { value: false, error: false },
      coordenadaX: { value: 4.7, error: false },
      coordenadaY: { value: -74.09, error: false }
    },
    address: { value: '', error: false },
    addressComplete: { value: '', error: false },
    coordenadaX: { value: '', error: false },
    coordenadaY: { value: '', error: false }
  });
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');
  const [isLoadingAlert, setIsLoadingAlert] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  // Cargar tipos de documento
  useEffect(() => {
    if (valueSesion?.user?.tokens?.access && !hasFetchedTypes && isOpen) {
      fetchTypes(valueSesion.user.tokens.access);
      setHasFetchedTypes(true);
    }
  }, [valueSesion, isOpen, hasFetchedTypes, fetchTypes]);

  // Cargar departamentos (una sola vez)
  useEffect(() => {
    const loadDepartments = async () => {
      if (!hasLoadedDepartments && isOpen) {
        try {
          await fetchDepartments();
          setHasLoadedDepartments(true);
        } catch (error) {
          console.error('Error fetching departments:', error);
        }
      }
    };
    loadDepartments();
  }, [hasLoadedDepartments, fetchDepartments, isOpen]);

  // Manejo de selección de departamento
  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    handleChange(e);
    setSelectedDepartment(value ? parseInt(value) : null);
  };

  // Opciones de departamento
  const getDepartmentOptions = () => {
    return departments
      .slice()
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
      .map(dept => ({
        key: dept.cod_departamento,
        value: dept.cod_departamento,
        title: dept.nombre
      }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'tipo_persona') {
      const newTipoDocumento = value === 'J' ? 'NT' : 'CC';
      setFormData(prev => ({
        ...prev,
        [name]: { value: value as 'N' | 'J', error: false },
        tipo_documento: { value: newTipoDocumento, error: false }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: { value, error: false }
      }));
    }
  };

  const getFilteredDocumentTypes = () => {
    if (isLoading) return [];

    if (formData.tipo_persona.value === 'N') {
      return types.filter(type => type.nombre !== 'NIT').map(type => ({
        key: type.cod_tipo_documento,
        value: type.cod_tipo_documento,
        title: type.nombre
      }));
    } else if (formData.tipo_persona.value === 'J') {
      return types.filter(type => type.nombre === 'NIT').map(type => ({
        key: type.cod_tipo_documento,
        value: type.cod_tipo_documento,
        title: type.nombre
      }));
    }

    return types.map(type => ({
      key: type.cod_tipo_documento,
      value: type.cod_tipo_documento,
      title: type.nombre
    }));
  };

  const handleSave = async () => {
    try {
      if (!valueSesion?.user?.tokens?.access) {
        throw new Error('No hay token de acceso disponible');
      }

      setIsLoadingAlert(true);
      setLoadingText('Registrando proveedor');

      const newFormData = { ...formData };
      let hasErrors = false;

      if (!formData.tipo_persona.value) {
        newFormData.tipo_persona.error = true;
        hasErrors = true;
      }
      if (!formData.tipo_documento.value) {
        newFormData.tipo_documento.error = true;
        hasErrors = true;
      }
      if (!formData.numero_documento.value) {
        newFormData.numero_documento.error = true;
        hasErrors = true;
      }
     
      if (formData.tipo_persona.value === 'N') {
        if (!formData.primer_nombre.value) {
          newFormData.primer_nombre.error = true;
          hasErrors = true;
        }
        if (!formData.primer_apellido.value) {
          newFormData.primer_apellido.error = true;
          hasErrors = true;
        }
      } else if (formData.tipo_persona.value === 'J') {
        if (!formData.nombre_comercial.value) {
          newFormData.nombre_comercial.error = true;
          hasErrors = true;
        }
        if (!formData.razon_social.value) {
          newFormData.razon_social.error = true;
          hasErrors = true;
        }
      }

      if (hasErrors) {
        setIsLoadingAlert(false);
        setFormData(newFormData);
        setIsError(true);
        setErrorText('Por favor complete todos los campos requeridos');
        return;
      }

      const payload = {
        tipo_persona: formData.tipo_persona.value,
        tipo_documento: formData.tipo_documento.value,
        numero_documento: formData.numero_documento.value,
        cod_municipio_expedicion_id: formData.municipio?.value || '',
        email: formData.email.value,
        direccion_notificaciones: formData.direccion_notificaciones.value,
        coordenada_x: formData.coordenada_x.value,
        coordenada_y: formData.coordenada_y.value,
        ...(formData.tipo_persona.value === 'N' ? {
          primer_nombre: formData.primer_nombre.value,
          segundo_nombre: formData.segundo_nombre.value,
          primer_apellido: formData.primer_apellido.value,
          segundo_apellido: formData.segundo_apellido.value,
          telefono_celular: formData.telefono_celular.value,
          municipio_residencia: formData.municipio?.value || ''
        } : {
          nombre_comercial: formData.nombre_comercial.value,
          razon_social: formData.razon_social.value,
          telefono_celular_empresa: formData.telefono_celular_empresa.value,
          cod_municipio_laboral_nal: formData.municipio?.value || ''
        })
      } as NaturalPayload | JuridicaPayload;

      await createProvider(payload, valueSesion?.user?.tokens?.access || '');

      setIsLoadingAlert(false);
      setIsSuccess(true);
      setSuccessText('El proveedor se ha creado exitosamente.');

    } catch (error: any) {
      setIsLoadingAlert(false);
      console.error('Error al crear proveedor:', error);
      setIsError(true);
      setErrorText(error.message || 'Ocurrió un error al crear el proveedor.');
    }
  };

  const handleSuccessClose = () => {
    setIsSuccess(false);
    if (onSuccess) onSuccess();
    onClose();
  };

  const handleClean = () => {
    setFormData({
      tipo_persona: { value: 'N', error: false },
      tipo_documento: { value: 'CC', error: false },
      numero_documento: { value: '', error: false },
      cod_municipio_expedicion_id: { value: '', error: false },
      municipio_residencia: { value: '', error: false },
      cod_municipio_laboral_nal: { value: '', error: false },
      email: { value: '', error: false },
      direccion_notificaciones: { value: '', error: false },
      coordenada_x: { value: '', error: false },
      coordenada_y: { value: '', error: false },
      primer_nombre: { value: '', error: false },
      segundo_nombre: { value: '', error: false },
      primer_apellido: { value: '', error: false },
      segundo_apellido: { value: '', error: false },
      telefono_celular: { value: '', error: false },
      nombre_comercial: { value: '', error: false },
      razon_social: { value: '', error: false },
      telefono_celular_empresa: { value: '', error: false },
      addressData: {
        ubicacion: { value: '', error: false },
        viaPrincipal: { value: '', error: false },
        nombreVia: { value: '', error: false },
        letraPrincipal: { value: '', error: false },
        letraPrincipal2: { value: '', error: false },
        prefijoBisPrincipal: { value: '', error: false },
        cordenadaPrincipal: { value: '', error: false },
        viaSecundaria: { value: '', error: false },
        nombreViaSecundaria: { value: '', error: false },
        letraSecundaria: { value: '', error: false },
        letraSecundaria2: { value: '', error: false },
        prefijoBisSecundaria: { value: '', error: false },
        cordenadaSecundaria: { value: '', error: false },
        viaTerciaria: { value: '', error: false },
        nombreViaTerciaria: { value: '', error: false },
        letraTerciaria: { value: '', error: false },
        letraTerciaria2: { value: '', error: false },
        prefijoBisTerciaria: { value: '', error: false },
        cordenadaTerciaria: { value: '', error: false },
        complemento: { value: '', error: false },
        location: { value: false, error: false },
        coordenadaX: { value: 4.7, error: false },
        coordenadaY: { value: -74.09, error: false }
      },
      address: { value: '', error: false },
      addressComplete: { value: '', error: false },
      coordenadaX: { value: '', error: false },
      coordenadaY: { value: '', error: false }
    });
  };


  useEffect(() => {
    if (formData.address && formData.address.value) {
      setFormData(prev => ({
        ...prev,
        direccion_notificaciones: { value: formData.address.value, error: false }
      }));
    }

    if (formData.addressComplete && formData.addressComplete.value) {
      setFormData(prev => ({
        ...prev,
        complemento: { value: formData.addressComplete.value, error: false }
      }));
    }

    if (formData.coordenadaX && formData.coordenadaX.value) {
      setFormData(prev => ({
        ...prev,
        coordenada_x: { value: formData.coordenadaX.value, error: false }
      }));
    }

    if (formData.coordenadaY && formData.coordenadaY.value) {
      setFormData(prev => ({
        ...prev,
        coordenada_y: { value: formData.coordenadaY.value, error: false }
      }));
    }
  }, [formData.address, formData.addressComplete, formData.coordenadaX, formData.coordenadaY]);

  // Determinar si está en modo oscuro
  const isDarkMode = mounted && theme === 'dark';

  if (!mounted) {
    return null;
  }

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} size="lg">

      <AlertSuccess
        isOpen={isSuccess}
        message={successText}
        onClose={handleSuccessClose}
      />

      <AlertError
        isOpen={isError}
        onClose={() => setIsError(false)}
        message={errorText}
      />

      <AlertLoader
        isOpen={isLoadingAlert}
        loadingText={loadingText}
      />

      <h2 className={`mb-6 text-xl font-bold text-center ${isDarkMode ? 'text-white' : 'text-[#562707]'}`}>CREAR NUEVO PROVEEDOR</h2>

      {/* Tipo de Persona */}
      <div className="mb-4">
        <AnimatedSelect
          label="Tipo de Persona"
          name="tipo_persona"
          value={formData.tipo_persona.value}
          onChange={(e) => handleChange(e)}
          options={[
            { key: 'N', value: 'N', title: 'Natural' },
            { key: 'J', value: 'J', title: 'Jurídica' }
          ]}
          error={!!formData.tipo_persona.error}
          darkMode={isDarkMode}
        />
      </div>

      {/* Tipo de Documento */}
      <div className="mb-4">
        <AnimatedSelect
          label="Tipo de Documento"
          name="tipo_documento"
          value={formData.tipo_documento.value}
          onChange={(e) => handleChange(e)}
          options={getFilteredDocumentTypes()}
          error={!!formData.tipo_documento.error}
          darkMode={isDarkMode}
        />
      </div>

      {/* Número de Documento */}
      <div className="mb-4">
        <AnimatedInput
          label="Número de Documento *"
          name="numero_documento"
          value={formData.numero_documento.value}
          onChange={(e) => handleChange(e)}
          type="number"
          error={!!formData.numero_documento.error}
          darkMode={isDarkMode}
        />

        {formData.tipo_documento.value === 'NT' && (
          <p className={`text-sm mb-4 mt-1 ml-2 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}>Sin dígito de verificación</p>
        )}
      </div>

      {/* Campos específicos para persona natural */}
      {formData.tipo_persona.value === 'N' && (
        <>
          <div className="grid mb-4 gap-4 md:grid-cols-2">
            <AnimatedInput
              label="Primer Nombre *"
              name="primer_nombre"
              value={formData.primer_nombre.value}
              onChange={(e) => handleChange(e)}
              type="text"
              error={!!formData.primer_nombre.error}
              darkMode={isDarkMode}
            />
            <AnimatedInput
              label="Segundo Nombre"
              name="segundo_nombre"
              value={formData.segundo_nombre.value}
              onChange={(e) => handleChange(e)}
              type="text"
              darkMode={isDarkMode}
            />
          </div>

          <div className="grid mb-4 gap-4 md:grid-cols-2">
            <AnimatedInput
              label="Primer Apellido *"
              name="primer_apellido"
              value={formData.primer_apellido.value}
              onChange={(e) => handleChange(e)}
              type="text"
              error={!!formData.primer_apellido.error}
              darkMode={isDarkMode}
            />
            <AnimatedInput
              label="Segundo Apellido"
              name="segundo_apellido"
              value={formData.segundo_apellido.value}
              onChange={(e) => handleChange(e)}
              type="text"
              darkMode={isDarkMode}
            />
          </div>

          <div className="mb-4">
            <AnimatedInput
              label="Teléfono Celular"
              name="telefono_celular"
              value={formData.telefono_celular.value}
              onChange={(e) => handleChange(e)}
              type="number"
              error={!!formData.telefono_celular.error}
              darkMode={isDarkMode}
            />
          </div>
        </>
      )}

      {/* Campos específicos para persona jurídica */}
      {formData.tipo_persona.value === 'J' && (
        <>
          <div className="mb-4">
            <AnimatedInput
              label="Nombre Comercial *"
              name="nombre_comercial"
              value={formData.nombre_comercial.value}
              onChange={(e) => handleChange(e)}
              type="text"
              error={!!formData.nombre_comercial.error}
              darkMode={isDarkMode}
            />
          </div>

          <div className="mb-4">
            <AnimatedInput
              label="Razón Social *"
              name="razon_social"
              value={formData.razon_social.value}
              onChange={(e) => handleChange(e)}
              type="text"
              error={!!formData.razon_social.error}
              darkMode={isDarkMode}
            />
          </div>

          <div className="mb-4">
            <AnimatedInput
              label="Teléfono Celular Empresa"
              name="telefono_celular_empresa"
              value={formData.telefono_celular_empresa.value}
              onChange={(e) => handleChange(e)}
              type="number"
              error={!!formData.telefono_celular_empresa.error}
              darkMode={isDarkMode}
            />
          </div>
        </>
      )}

      {/* Campos comunes */}
      <div className="mb-4">
        <AnimatedInput
          label="Email"
          name="email"
          value={formData.email.value}
          onChange={(e) => handleChange(e)}
          type="email"
          error={!!formData.email.error}
          darkMode={isDarkMode}
        />
      </div>

      {/* Departamentos y Ciudades */}
      <div className="grid mb-4 gap-4 md:grid-cols-2">
        <AnimatedSelect
          label="Departamento"
          name="departamento"
          value={formData.departamento?.value || ''}
          onChange={handleDepartmentChange}
          error={!!formData.departamento?.error}
          options={getDepartmentOptions()}
          darkMode={isDarkMode}
        />

        <AnimatedSelect
          label="Ciudad"
          name="municipio"
          value={formData.municipio?.value || ''}
          onChange={(e) => handleChange(e)}
          options={cities.map(city => ({
            key: city.cod_municipio,
            value: city.cod_municipio,
            title: city.nombre
          }))}
          disabled={!selectedDepartment}
          error={!!formData.municipio?.error}
          darkMode={isDarkMode}
        />
      </div>

      {/* Botones de acción */}
      <div className="mt-6 flex justify-center space-x-4">
        <Button onClick={handleSave} title="Guardar" />
        <Button onClick={handleClean} title="Limpiar" />  
      </div>

    </ModalContainer>
  );
};

export default CrearProveedorModal;

