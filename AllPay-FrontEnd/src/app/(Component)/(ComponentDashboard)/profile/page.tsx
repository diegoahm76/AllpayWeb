'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Swal from 'sweetalert2';

import FormUserData from '@/presenters/components/modules/profile/formUserData';
import DesactivateAccount from '@/presenters/components/modules/profile/desactivateAccount';
import ModalAddress from '@/presenters/components/shared/ModalAddress';
import { fetchUserData } from '@/adapters/user/user.getUserData';

const ProfileView = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [openModalAddress, setOpenModalAddress] = useState(false);
  
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const valueSesion: any = session;

  const [personaType, setPersonaType] = useState<'N' | 'J' | ''>('');
  const [personaId, setPersonaId] = useState<number | null>(null);
  
  // Estados para mantener la selección de departamento y municipio entre cambios de pestaña
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [selectedMunicipioResidencia, setSelectedMunicipioResidencia] = useState<string>('');
  
  // Estado para el formData del modal de direcciones
  const [modalFormData, setModalFormData] = useState({
    addressData: {
      ubicacion: { value: "", error: false },
      viaPrincipal: { value: "", error: false },
      nombreVia: { value: "", error: false },
      letraPrincipal: { value: "", error: false },
      letraPrincipal2: { value: "", error: false },
      prefijoBisPrincipal: { value: "", error: false },
      cordenadaPrincipal: { value: "", error: false },
      viaSecundaria: { value: "", error: false },
      nombreViaSecundaria: { value: "", error: false },
      letraSecundaria: { value: "", error: false },
      letraSecundaria2: { value: "", error: false },
      prefijoBisSecundaria: { value: "", error: false },
      cordenadaSecundaria: { value: "", error: false },
      viaTerciaria: { value: "", error: false },
      nombreViaTerciaria: { value: "", error: false },
      letraTerciaria: { value: "", error: false },
      letraTerciaria2: { value: "", error: false },
      prefijoBisTerciaria: { value: "", error: false },
      cordenadaTerciaria: { value: "", error: false },
      complemento: { value: "", error: false },
      location: { value: false, error: false },
      coordenadaX: { value: 4.7, error: false },
      coordenadaY: { value: -74.09, error: false }
    },
    address: { value: "", error: false },
    addressComplete: { value: "", error: false }
  });

  const [userData, setUserData] = useState({
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    telefono: '',
    pais: '',
    departamento: '',
    email: '',
    ciudad: '',
    direccion: '',
    direccion_notificaciones: '',
    // Códigos residencia/notificación para inicialización de selects
    cod_departamento_residencia: '',
    cod_departamento_notificacion: '',
    cod_municipio_residencia: '',
    cod_municipio_notificacion_nal: '',
    cod_municipio_expedicion_id: '',
    imageProfile: '/images/user.jpg',
    razon_social: '',
    nombre_comercial: '',
    nombre_naturaleza_empresa: '',
    cod_tipo_comprador: '',
    representanteLegal: {
      primerNombre: '',
      segundoNombre: '',
      primerApellido: '',
      segundoApellido: '',
      telefono: '',
      email: '',
      pais: '',
      departamento: '',
      ciudad: '',
      direccion: '',
    },
    firma_usuario: '',
    tiene_2fa: false,
  });

  // Función para abrir el modal de direcciones
  const handleOpenAddressModal = () => {
    setOpenModalAddress(true);
  };

  // Función para cerrar el modal de direcciones
  const handleCloseAddressModal = () => {
    setOpenModalAddress(false);
  };

  // Efecto para actualizar la dirección cuando el modal la genere
  useEffect(() => {
    if (modalFormData.address.value) {
      setUserData(prev => ({
        ...prev,
        direccion: modalFormData.address.value,
        // Para personas jurídicas, también actualizar la dirección de notificaciones si es la misma
        ...(personaType === "J" && {
          direccion_notificaciones: modalFormData.address.value
        })
      }));
    }
  }, [modalFormData.address.value, personaType]);

  const loadUserData = useCallback(async () => {
    if (!valueSesion?.user?.tokens?.access) return;

    try {
      const userProfile = await fetchUserData(valueSesion.user.tokens.access);

      const p = userProfile.persona || {};
      setPersonaType(p.tipo_persona || '');
      setPersonaId(p.id_persona !== undefined ? p.id_persona : null);

      const rep = p.representante_legal_data || {};

      setUserData({
        tiene_2fa: userProfile.tiene_2fa || false,
        primerNombre: p.primer_nombre || '',
        segundoNombre: p.segundo_nombre || '',
        primerApellido: p.primer_apellido || '',
        segundoApellido: p.segundo_apellido || '',
        telefono: p.tipo_persona === 'N' ? p.telefono_celular || '' : p.telefono_empresa || '',
      pais: p.nombre_pais || '',
      departamento: p.nombre_departamento_residencia || '',
        email: p.email || '',
      ciudad: p.nombre_municipio_residencia || (p as any).nombre_municipio_notificacion || '',
        direccion: p.direccion_residencia || '',
        direccion_notificaciones: p.direccion_notificaciones || '',
        imageProfile: userProfile.image_profile || '/images/user.jpg',
        razon_social: p.razon_social || '',
        nombre_comercial: p.nombre_comercial || '',
        nombre_naturaleza_empresa: p.nombre_naturaleza_empresa || '',
        cod_tipo_comprador: (p as any).cod_tipo_comprador || '',
        firma_usuario: userProfile.firma_usuario || '',
      // Códigos residencia/notificación
      cod_departamento_residencia: (p as any).cod_departamento_residencia || '',
      cod_departamento_notificacion: (p as any).cod_departamento_notificacion || '',
      cod_municipio_residencia: (p as any).municipio_residencia || '',
      cod_municipio_notificacion_nal: (p as any).cod_municipio_notificacion_nal || '',
      cod_municipio_expedicion_id: (p as any).cod_municipio_expedicion_id || '',
        representanteLegal: {
          primerNombre: rep.primer_nombre || '',
          segundoNombre: rep.segundo_nombre || '',
          primerApellido: rep.primer_apellido || '',
          segundoApellido: rep.segundo_apellido || '',
          telefono: rep.telefono_celular || '',
          email: rep.email || '',
          pais: rep.nombre_pais || '',
          departamento: rep.nombre_departamento_residencia || '',
          ciudad: rep.nombre_municipio_residencia || '',
          direccion: rep.direccion_residencia || '',
        }
      });

    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: error.message,
        showConfirmButton: false,
        confirmButtonColor: 'rgb(var(--green))',
        timer: 5000
      });
    } finally {
      setIsLoading(false);
    }
  }, [valueSesion]);

  useEffect(() => {
    if (valueSesion?.user?.id) {
      loadUserData();
    }
  }, [loadUserData, valueSesion?.user?.id]);

  return (
    <div className="w-full">
      <div className="w-full md:w-4/4 lg:w-2/2 flex justify-center items-center">
        <div className="p-1 w-full">

          <FormUserData
            userData={userData}
            setUserData={setUserData}
            personaType={personaType}
            isLoading={isLoading}
            onOpenAddressModal={handleOpenAddressModal}
            selectedDepartment={selectedDepartment}
            setSelectedDepartment={setSelectedDepartment}
            selectedMunicipioResidencia={selectedMunicipioResidencia}
            setSelectedMunicipioResidencia={setSelectedMunicipioResidencia}
          />
          <DesactivateAccount personaId={personaId} />
          
          {/* Modal de direcciones */}
          {openModalAddress && (
            <ModalAddress
              title="Generador de direcciones"
              onClose={handleCloseAddressModal}
              formData={modalFormData}
              setFormData={setModalFormData}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
