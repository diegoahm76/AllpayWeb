// useDobleFaActivate.ts
import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Swal from 'sweetalert2';
import { fetchAuthenticationMethods } from '@/app/api/auth/authenticationMethods';
import { deleteAuthenticationMethod } from '@/app/api/twoFactorAuthentication/delete2fa';
export const useDobleFaActivate = () => {
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    },
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [secondFactorData, setSecondFactorData] = useState<any>(null);
  const [refresh, setRefresh] = useState(false);

  const valueSesion: any = session;

  const refreshData = () => {
    setRefresh(prev => !prev);
  };

  useEffect(() => {
    const refreshHandler = () => setRefresh(prev => !prev);
    window.addEventListener('refresh2fa', refreshHandler);
    return () => window.removeEventListener('refresh2fa', refreshHandler);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
        
      const accessToken = valueSesion?.user?.tokens?.access;
      if (accessToken && !secondFactorData) {
        try {
          const response = await fetchAuthenticationMethods(accessToken);
          if (response?.data && response.data.length > 0) {
            setSecondFactorData(response.data);
            
          }
        } catch (error) {
          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'No se pudieron obtener los datos de autenticación en segundo factor',
            showConfirmButton: false,
            timer: 5000,
          });
        }
      }
    };

    fetchData();
  }, [session, refresh]);

  const hasTwoFactorAuth = secondFactorData !== null;
  
  const handleDisableTwoFactorAuth = async () => {
    if (!secondFactorData || !secondFactorData[0]?.id_2fa_persona) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró un método de autenticación para desactivar.',
      });
      return;
    }

    const confirmation = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción deshabilitará la autenticación de dos factores en tu cuenta.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: "#4D750F",
      cancelButtonColor: "#4D750F",
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
    });

    if (confirmation.isConfirmed) {
      const success = await deleteAuthenticationMethod(
        secondFactorData[0].id_2fa_persona,
        valueSesion?.user?.tokens?.access
      );

      if (success) {
        Swal.fire({
          icon: 'success',
          title: 'Desactivado',
          text: 'La autenticación en dos factores ha sido desactivada exitosamente.',
          timer: 4000,
          showConfirmButton: false,
        });

        setSecondFactorData(null); 
        refreshData();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo desactivar la autenticación de dos factores. Inténtalo nuevamente.',
        });
      }
    }
  };

  return {
    isModalOpen,
    setIsModalOpen,
    hasTwoFactorAuth,
    handleDisableTwoFactorAuth,
    refreshData,
  };
};
