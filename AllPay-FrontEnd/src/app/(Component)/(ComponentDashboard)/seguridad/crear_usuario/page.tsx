'use client';
import axios from 'axios';
import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import '@/presenters/css/background.css';
import RegisterForm from '@/presenters/components/modules/register/Register';

const baseApiUrl = process.env.BASE_API_URL;
const User: React.FC = () => {

  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const valueSesion: any = session;
  const [mounted, setMounted] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState('');

  const obtenerSuperUsuario = async () => {
    // Verificar que la sesión esté lista y el token esté disponible
    if (!valueSesion?.user?.tokens?.access) {
      return;
    }

    try {
      const response = await axios.get(`${baseApiUrl}users/get-superusers/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion.user.tokens.access}`
        }
      });

      const data = response?.data?.data;

      if (response?.data?.success && Array.isArray(data) && data.length > 0) {
        setTipoUsuario(data[0].tipo_usuario);
      } else {
        setTipoUsuario('No encontrado');
      }
    } catch (error: any) {
      // Solo mostrar error si no es un error de token no disponible (durante hidratación)
      // Si el error es 401 pero el token existe, podría ser realmente expirado
      // Si el error es por falta de token, simplemente no hacer nada
      if (error?.response?.status === 401 && valueSesion?.user?.tokens?.access) {
        // Token existe pero recibimos 401, podría ser expirado realmente
        // Pero no queremos mostrar la alerta aquí, el interceptor lo manejará
        console.error('Error al obtener super usuario:', error);
      }
      // Si no hay token, simplemente no hacer nada (aún se está cargando)
      setTipoUsuario('Error al obtener');
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Solo ejecutar cuando el componente esté montado y la sesión esté autenticada
    if (mounted && status === 'authenticated' && valueSesion?.user?.tokens?.access) {
      obtenerSuperUsuario();
    }
  }, [mounted, status, valueSesion?.user?.tokens?.access]);

  const [app] = useState(true);

  return (
    <>
      <RegisterForm baseApiUrl={baseApiUrl!} tipoUsuario={tipoUsuario} app={app} />
    </>
  );
};

export default User;
