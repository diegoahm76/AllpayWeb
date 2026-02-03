'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useTheme } from 'next-themes';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import ModalContainer from '@/presenters/components/ui/ModalContainer';
import useGetDepartments from '@/application/address/useGetDepartments';
import { useGetCities } from '@/application/address/useGetCities';
import { useUpdateProveedor } from '../hooks/useUpdateProveedor';
import { Proveedor, UpdateProveedorPayload } from '../models/proveedor.model';
import { useTypeDni } from '@/application/dni/useTypeDni';

// notificaciones
import AlertSuccess from '@/presenters/components/recaudadores/AlertSuccess';
import AlertError from '@/presenters/components/recaudadores/AlertError';
import AlertLoader from '@/presenters/components/recaudadores/AlertLoader';

interface EditarProveedorModalProps {
  isOpen: boolean;
  onClose: () => void;
  proveedor: Proveedor | null;
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
  tipo_documento: { value: string; error: boolean };
  numero_documento: { value: string; error: boolean };
  email: { value: string; error: boolean };
  direccion_notificaciones: { value: string; error: boolean };
  coordenada_x: { value: string; error: boolean };
  coordenada_y: { value: string; error: boolean };
  // Campos para persona natural
  primer_nombre: { value: string; error: boolean };
  segundo_nombre: { value: string; error: boolean };
  primer_apellido: { value: string; error: boolean };
  segundo_apellido: { value: string; error: boolean };
  telefono_celular: { value: string; error: boolean };
  direccion_residencia: { value: string; error: boolean };
  municipio_residencia: { value: string; error: boolean };
  // Campos para persona jurídica
  nombre_comercial: { value: string; error: boolean };
  razon_social: { value: string; error: boolean };
  telefono_celular_empresa: { value: string; error: boolean };
  cod_municipio_expedicion_id: { value: string; error: boolean };
  cod_municipio_laboral_nal: { value: string; error: boolean };
  addressData: AddressData;
  address: { value: string; error: boolean };
  addressComplete: { value: string; error: boolean };
  coordenadaX: { value: string; error: boolean };
  coordenadaY: { value: string; error: boolean };
  departamento: { value: string; error: boolean };
  municipio: { value: string; error: boolean };
}

const EditarProveedorModal: React.FC<EditarProveedorModalProps> = ({ isOpen, onClose, proveedor, onSuccess }) => {
  const { theme } = useTheme();

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const valueSesion: any = session;
  const token = valueSesion?.user?.tokens?.access;

  const { update, loading: updating, error: updateError } = useUpdateProveedor();

  // Estados para departamentos y ciudades
  const [hasLoadedDepartments, setHasLoadedDepartments] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);

  // Cargar tipos de documento
  const { types, fetchTypes } = useTypeDni();
  const [hasFetchedTypes, setHasFetchedTypes] = useState(false);

  const { departments, fetchDepartments } = useGetDepartments();

  const { cities } = useGetCities({
    departamentoId: selectedDepartment || 0,
    token: token || ''
  });

  const [formData, setFormData] = useState<FormData>({
    tipo_documento: { value: '', error: false },
    numero_documento: { value: '', error: false },
    email: { value: '', error: false },
    direccion_notificaciones: { value: '', error: false },
    coordenada_x: { value: '', error: false },
    coordenada_y: { value: '', error: false },
    // Campos persona natural
    primer_nombre: { value: '', error: false },
    segundo_nombre: { value: '', error: false },
    primer_apellido: { value: '', error: false },
    segundo_apellido: { value: '', error: false },
    telefono_celular: { value: '', error: false },
    direccion_residencia: { value: '', error: false },
    municipio_residencia: { value: '', error: false },
    // Campos persona jurídica
    nombre_comercial: { value: '', error: false },
    razon_social: { value: '', error: false },
    telefono_celular_empresa: { value: '', error: false },
    cod_municipio_expedicion_id: { value: '', error: false },
    cod_municipio_laboral_nal: { value: '', error: false },
    // Departamento y municipio
    departamento: { value: '', error: false },
    municipio: { value: '', error: false },
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
    coordenadaY: { value: '', error: false },
  });
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cargar datos del proveedor al abrir el modal
  useEffect(() => {
    if (proveedor && isOpen && types.length > 0) {
      console.log('Cargando proveedor:', proveedor);
      console.log('Tipo persona:', proveedor.tipo_persona);
      console.log('Tipo documento del proveedor:', proveedor.tipo_documento);
      
      // Buscar el código del tipo de documento basado en el nombre
      const tipoDocumento = types.find(
        type => type.nombre === proveedor.tipo_documento || type.cod_tipo_documento === proveedor.tipo_documento
      );
      const codigoTipoDocumento = tipoDocumento?.cod_tipo_documento || proveedor.tipo_documento || '';
      
      console.log('Código tipo documento a usar:', codigoTipoDocumento);
      
      // Determinar el código del municipio según el tipo de persona
      const isNatural = proveedor.tipo_persona === 'N' || proveedor.tipo_persona === 'Natural';
      
      // Para persona natural: usar cod_municipio_expedicion_id
      // Para persona jurídica: usar cod_municipio_laboral_nal
      let codigoMunicipio = '';
      if (isNatural) {
        codigoMunicipio = proveedor.cod_municipio_expedicion_id || '';
      } else {
        codigoMunicipio = proveedor.cod_municipio_laboral_nal || '';
      }
      
      console.log('Código municipio a cargar:', codigoMunicipio);
      
      // Extraer el código del departamento del código del municipio (primeros 2 dígitos)
      let codigoDepartamento = '';
      if (codigoMunicipio && typeof codigoMunicipio === 'string' && codigoMunicipio.length >= 2) {
        codigoDepartamento = codigoMunicipio.substring(0, 2);
        console.log('Código departamento extraído:', codigoDepartamento);
        // Establecer el departamento seleccionado para cargar las ciudades
        setSelectedDepartment(parseInt(codigoDepartamento));
      }
      
      setFormData(prev => ({
        ...prev,
        tipo_documento: { value: codigoTipoDocumento, error: false },
        numero_documento: { value: proveedor.numero_documento || '', error: false },
        email: { value: proveedor.email || '', error: false },
        direccion_notificaciones: { value: proveedor.direccion_notificaciones || '', error: false },
        // Campos persona natural
        primer_nombre: { value: proveedor.primer_nombre || '', error: false },
        segundo_nombre: { value: proveedor.segundo_nombre || '', error: false },
        primer_apellido: { value: proveedor.primer_apellido || '', error: false },
        segundo_apellido: { value: proveedor.segundo_apellido || '', error: false },
        telefono_celular: { value: proveedor.telefono_celular || '', error: false },
        // Campos persona jurídica
        razon_social: { value: proveedor.razon_social || '', error: false },
        nombre_comercial: { value: proveedor.nombre_comercial || '', error: false },
        telefono_celular_empresa: { value: proveedor.telefono_celular_empresa || '', error: false },
        // Departamento y municipio
        departamento: { value: codigoDepartamento, error: false },
        municipio: { value: codigoMunicipio, error: false },
      }));
    }
  }, [proveedor, isOpen, types]);

  // Cargar tipos de documento
  useEffect(() => {
    if (token && !hasFetchedTypes && isOpen) {
      fetchTypes(token);
      setHasFetchedTypes(true);
    }
  }, [token, isOpen, hasFetchedTypes, fetchTypes]);

  // Cargar departamentos
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

  // Manejar errores del hook
  useEffect(() => {
    if (updateError) {
      setIsError(true);
      setErrorText(updateError);
    }
  }, [updateError]);

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    console.log('=== DEPARTMENT CHANGE ===');
    console.log('Departamento seleccionado:', value);
    
    // Actualizar el departamento
    setFormData(prev => ({
      ...prev,
      departamento: { value, error: false },
      // Limpiar el municipio cuando cambia el departamento
      municipio: { value: '', error: false }
    }));
    
    setSelectedDepartment(value ? parseInt(value) : null);
  };

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

  const getFilteredDocumentTypes = () => {
    if (!types || types.length === 0) {
      return [];
    }

    const isNatural = proveedor?.tipo_persona === 'N' || proveedor?.tipo_persona === 'Natural';
    
    if (isNatural) {
      return types.filter(type => type.nombre !== 'NIT').map(type => ({
        key: type.cod_tipo_documento,
        value: type.cod_tipo_documento,
        title: type.nombre
      }));
    } else {
      return types.filter(type => type.nombre === 'NIT').map(type => ({
        key: type.cod_tipo_documento,
        value: type.cod_tipo_documento,
        title: type.nombre
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log(`=== HANDLE CHANGE ===`);
    console.log(`Campo: ${name}, Valor: ${value}`);
    
    setFormData(prev => {
      const newFormData = {
        ...prev,
        [name]: { value, error: false }
      };
      console.log('Nuevo formData después del cambio:', newFormData);
      return newFormData;
    });
  };

  const handleSave = async () => {
    try {
      if (!token) {
        throw new Error('No hay token de acceso disponible');
      }

      if (!proveedor?.id_persona) {
        throw new Error('No se ha seleccionado un proveedor válido');
      }

      const isNatural = proveedor.tipo_persona === 'N' || proveedor.tipo_persona === 'Natural';
      
      console.log('=== DEBUG HANDLE SAVE ===');
      console.log('formData completo:', formData);
      console.log('formData.municipio:', formData.municipio);
      console.log('formData.departamento:', formData.departamento);
      console.log('Valor municipio:', formData.municipio.value);
      console.log('Valor departamento:', formData.departamento.value);
      
      // Validar que se haya seleccionado un municipio si se seleccionó un departamento
      if (formData.departamento.value && !formData.municipio.value) {
        setIsError(true);
        setErrorText('Por favor selecciona una ciudad del departamento seleccionado');
        return;
      }
      
      let payload: UpdateProveedorPayload;

      if (isNatural) {
        // Payload para persona natural
        payload = {
          tipo_persona: 'N',
          tipo_documento: formData.tipo_documento.value,
          numero_documento: formData.numero_documento.value,
          primer_nombre: formData.primer_nombre.value,
          segundo_nombre: formData.segundo_nombre.value || undefined,
          primer_apellido: formData.primer_apellido.value,
          segundo_apellido: formData.segundo_apellido.value || undefined,
          telefono_celular: formData.telefono_celular.value || null,
          email: formData.email.value || null,
          direccion_notificaciones: formData.direccion_notificaciones.value || null,
          direccion_residencia: formData.direccion_residencia.value || null,
          cod_municipio_expedicion_id: formData.municipio.value || null,
          municipio_residencia: formData.municipio.value || null,
          coordenada_x: formData.coordenada_x.value || null,
          coordenada_y: formData.coordenada_y.value || null
        };
      } else {
        // Payload para persona jurídica
        payload = {
          tipo_persona: 'J',
          tipo_documento: formData.tipo_documento.value,
          numero_documento: formData.numero_documento.value,
          nombre_comercial: formData.nombre_comercial.value,
          razon_social: formData.razon_social.value,
          telefono_celular_empresa: formData.telefono_celular_empresa.value || null,
          email: formData.email.value || null,
          direccion_notificaciones: formData.direccion_notificaciones.value || null,
          cod_municipio_expedicion_id: formData.municipio.value || null,
          cod_municipio_laboral_nal: formData.municipio.value || null,
          coordenada_x: formData.coordenada_x.value || null,
          coordenada_y: formData.coordenada_y.value || null
        };
      }

      console.log('Payload a enviar:', payload);

      await update(token, proveedor.id_persona, payload);

      setIsSuccess(true);
      setSuccessText('El proveedor se ha actualizado exitosamente.');

    } catch (error: any) {
      console.error('Error al actualizar proveedor:', error);
      setIsError(true);
      setErrorText(error.message || 'Ocurrió un error al actualizar el proveedor.');
    }
  };

  const handleSuccessClose = () => {
    setIsSuccess(false);
    if (onSuccess) onSuccess();
    onClose();
  };

  useEffect(() => {
    if (formData.address && formData.address.value) {
      setFormData(prev => ({
        ...prev,
        direccion_notificaciones: { value: formData.address.value, error: false }
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
  }, [formData.address, formData.coordenadaX, formData.coordenadaY]);

  if (!mounted || !proveedor) return null;

  const isDarkMode = theme === 'dark';
  const headingTextClass = isDarkMode ? 'text-white' : 'text-[#562707]';

  console.log('Proveedor:', proveedor);

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
        isOpen={updating}
        loadingText="Actualizando proveedor..."
      />



      <h2 className={`mb-6 text-xl font-bold text-center ${headingTextClass}`}>EDITAR PROVEEDOR</h2>

      {/* Tipo de Documento y Número de Documento */}
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
          <p className={`${headingTextClass} text-sm mb-4 mt-1 ml-2`}>Sin dígito de verificación</p>
        )}
      </div>

      {/* Campos específicos para persona natural */}
      {(proveedor.tipo_persona === 'N' || proveedor.tipo_persona === 'Natural') && (
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
              darkMode={isDarkMode}
            />
          </div>
        </>
      )}

      {/* Campos específicos para persona jurídica */}
      {(proveedor.tipo_persona === 'J' || proveedor.tipo_persona === 'Juridica') && (
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
              darkMode={isDarkMode}
            />
          </div>
        </>
      )}

      {/* Email */}
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
          value={formData.departamento.value}
          onChange={handleDepartmentChange}
          error={!!formData.departamento.error}
          options={getDepartmentOptions()}
          darkMode={isDarkMode}
        />

        <AnimatedSelect
          label="Ciudad"
          name="municipio"
          value={formData.municipio.value}
          onChange={(e) => {
            console.log('=== CITY SELECTED ===');
            console.log('Ciudad seleccionada:', e.target.value);
            handleChange(e);
          }}
          options={cities.map(city => ({
            key: String(city.cod_municipio),
            value: String(city.cod_municipio),
            title: city.nombre
          }))}
          disabled={!selectedDepartment}
          error={!!formData.municipio.error}
          darkMode={isDarkMode}
        />
      </div>



      {/* Botones de acción */}
      <div className="mt-6 flex justify-center space-x-4">
        <Button onClick={handleSave} title="Actualizar" disabled={updating} />

      </div>

    </ModalContainer>
  );
};

export default EditarProveedorModal;

