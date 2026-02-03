'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useSession, signIn } from 'next-auth/react';

import axios from 'axios';
import Swal from 'sweetalert2';

import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import { Button } from "@/presenters/components/ui/AnimatedButton";
import { useRouter } from "next/navigation";

const baseApiUrl = process.env.BASE_API_URL;

const ChangePassword: React.FC = () => {

  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && theme === 'dark';

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const valueSesion: any = session;

  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_new_password: ''
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!passwords.current_password || !passwords.new_password || !passwords.confirm_new_password) {
      Swal.fire({
        icon: 'warning',
        title: 'Todos los campos son obligatorios',
        showConfirmButton: false,
        timer: 3000
      });
      return;
    }

    if (passwords.new_password !== passwords.confirm_new_password) {
      Swal.fire({
        icon: 'error',
        title: 'Las contraseñas no coinciden',
        showConfirmButton: false,
        timer: 3000
      });
      return;
    }

    setLoading(true);

    try {
      await axios.patch(`${baseApiUrl}users/profile/change-password/`, passwords, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${valueSesion?.user?.tokens?.access}`
        }
      });

      Swal.fire({
        icon: 'success',
        title: 'Contraseña actualizada correctamente',
        showConfirmButton: false,
        timer: 3000
      });

      setPasswords({
        current_password: '',
        new_password: '',
        confirm_new_password: ''
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Verifica que la contraseña actual cumpla con los requisitos',
        showConfirmButton: false,
        timer: 3000
      });
    }

    setLoading(false);
  };

  return (
    <div
      className={`p-6 w-full rounded-xl mt-6 shadow-md ${isDarkMode ? 'bg-[#78390e]' : 'bg-slate-200'}`}
    >
      <div
        className={`rounded-xl px-12 py-8 shadow-md relative ${isDarkMode ? 'bg-[#260f00] border border-white/20 text-white' : 'bg-white text-[#562707]'}`}
      >
        <button
          onClick={() => router.push('/')}
          className={`absolute top-2 right-4 text-2xl hover:text-red-700 ${isDarkMode ? 'text-white' : 'text-[rgb(var(--brown))]'}`}
        >
          &times;
        </button>

        <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : ''}`}>Cambiar la contraseña</h2>

        <div className="space-y-4">
          <AnimatedInput
            type="password"
            name="current_password"
            label="Contraseña actual"
            value={passwords.current_password}
            onChange={handleChange}
            darkMode={isDarkMode}
          />

          <AnimatedInput
            type="password"
            name="new_password"
            label="Nueva contraseña"
            value={passwords.new_password}
            onChange={handleChange}
            darkMode={isDarkMode}
          />

          <AnimatedInput
            type="password"
            name="confirm_new_password"
            label="Confirmar contraseña"
            value={passwords.confirm_new_password}
            onChange={handleChange}
            darkMode={isDarkMode}
          />
        </div>

        <div className={`mt-4 text-sm ${isDarkMode ? 'text-white' : ''}`}>
          <p className={`font-bold text-lg mb-2 ${isDarkMode ? 'text-white' : ''}`}>Requisitos de contraseña:</p>
          <ul className="list-disc pl-5">
            <li>Debe tener mínimo 8 caracteres.</li>
            <li>Debe tener mínimo 1 letra mayúscula.</li>
            <li>Debe tener 1 carácter numérico.</li>
            <li>Debe tener 1 carácter simbólico (#*%.)</li>
          </ul>
        </div>

        <div className="flex justify-center space-x-4 mt-8">

          <Button
            onClick={handleSubmit}
            disabled={loading}
            title={loading ? 'Guardando cambio...' : 'Guardar cambios'}
            darkMode={isDarkMode}
          />

          <Button
            onClick={() =>
              setPasswords({
                current_password: '',
                new_password: '',
                confirm_new_password: ''
              })
            }

            title={'Limpiar'}
            darkMode={isDarkMode}
          />

          <Button
            onClick={() => router.push("/profile")}
            title="Regresar"
            darkMode={isDarkMode}
          />

        </div>
      </div>
    </div>
  );
};

export default ChangePassword;

