'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import ReCAPTCHA from 'react-google-recaptcha';
import { Exception } from '@/adapters/shared/exception';
import { AuthResource } from '@/application/auth/resources/auth.resource';
import Swal from "sweetalert2";
import AnimatedInput from '@/presenters/components/ui/AnimatedInput'

const valid = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/

const UnlockedFormContent = ({ capchaApiKey, baseApiUrl }: { capchaApiKey: string, baseApiUrl: string }) => {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const uidb64 = searchParams.get('uidb64');

  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [messageRedirect,] = useState<string>('');
  const [formData, setFormData] = useState<any>({
    password: { value: '', error: false },
    password_confirm: { value: '', error: false },
    capcha: ''
  });

  function redirect() {
    localStorage.clear()
    if (window.location.port) {
      window.location.replace(`${window.location.protocol}//${window.location.hostname}:${window.location.port}`)
    } else {
      window.location.replace(`${window.location.protocol}//${window.location.hostname}`);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevFormData: any) => ({
      ...prevFormData,
      [name]: {
        ...prevFormData[name],
        value: value,
        error: false
      }
    }));
  };


  const handleSubmitPassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let error: boolean = false;
    let title: string = '';

    setFormData((prevFormData: any) => ({
      ...prevFormData,
      password: { ...prevFormData.password, error: false },
      password_confirm: { ...prevFormData.password_confirm, error: false }
    }));

    if (formData.password.value === '') {
      error = true;
      title = 'Revise el formulario';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        password: { ...prevFormData.password, error: true }
      }));
    }
    if (formData.password_confirm.value === '') {
      error = true;
      title = 'Revise el formulario';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        password_confirm: { ...prevFormData.password_confirm, error: true }
      }));
    }
    if (formData.password.value !== formData.password_confirm.value) {
      error = true;
      title = 'Contraseñas no son iguales';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        password: { ...prevFormData.password, error: true },
        password_confirm: { ...prevFormData.password_confirm, error: true }
      }));
    }

    if (!error) {
      if (!valid.test(formData.password.value) && formData.password.value.trim().length < 6) {
        error = true;
        title = 'Contraseña no cumple con los requisitos minimos';
        setFormData((prevFormData: any) => ({
          ...prevFormData,
          password: { ...prevFormData.password, error: true },
          password_confirm: { ...prevFormData.password_confirm, error: true }
        }));
      } else if (formData.capcha === '') {
        error = true;
        title = 'Debe validar que no es un robot';
      } else if (token && uidb64) {
        try {
          const payload = {
            uidb64: uidb64,
            token: token,
            password: formData.password.value
          };

          const response = await axios.patch(`${baseApiUrl}users/password-unblock-complete/`, payload, {
            headers: {
              'Content-Type': 'application/json'
            }
          });
          if (response.data.success) {
            // Limpiar errores y valores
            setFormData((prevFormData: any) => ({
              ...prevFormData,
              password: { value: '', error: false },
              password_confirm: { value: '', error: false }
            }));
            setError('');

            Swal.fire({
              title: 'Contraseña cambiada',
              text: 'La contraseña ha sido cambiada exitosamente',
              icon: 'success',
              confirmButtonColor: "#4D750F",
              confirmButtonText: AuthResource.Acept,
            })

            setLoading(false);
            setTimeout(redirect, 4000);
          }
        } catch (error: unknown | any) {
          setMessage('');
          setLoading(false);
          // Limpiar errores y valores
          setFormData((prevFormData: any) => ({
            ...prevFormData,
            password: { value: '', error: false },
            password_confirm: { value: '', error: false }
          }));

          Swal.fire({
            title: 'Oops...',
            text: error.response.data.detail,
            icon: 'error',
            confirmButtonColor: "#4D750F",
            confirmButtonText: AuthResource.Acept,
          })

          new Exception('', error as Error);
        }
      } else {
        error = true;
        title = 'Error en token';
      }
    }

    if (error) {
      Swal.fire({
        title: 'Oops...',
        text: title,
        icon: 'error',
        confirmButtonColor: "#4D750F",
        confirmButtonText: AuthResource.Acept,
      })
      setMessage('');
      setLoading(false);
    }
  };

  const restoreCatcha = () => {
    setFormData((prevFormData: any) => ({
      ...prevFormData,
      capcha: ''
    }));
  }

  const handleCaptchaChange = (value: string | null) => {
    setTimeout(restoreCatcha, 60000);
    setFormData((prevFormData: any) => ({
      ...prevFormData,
      capcha: value
    }));
  };

  return (
    <>
      {error && <div className="flex items-center p-4 mb-4 text-sm text-white rounded-lg bg-red-600" role="alert">
        <svg className="shrink-0 inline w-4 h-4 me-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
        </svg>
        <span className="sr-only">Info</span>
        <div>
          <span className="font-medium">¡Error!</span> {error}
        </div>
      </div>}
      {message && <div className="flex items-center p-4 mb-4 text-sm text-white rounded-lg bg-[#4D750F]" role="alert">
        <svg className="shrink-0 inline w-4 h-4 me-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
        </svg>
        <span className="sr-only">Info</span>
        <div>
          <span className="font-medium">¡Exitoso!</span> {message}
        </div>
      </div>}
      {messageRedirect && <div className="flex items-center p-4 mb-4 text-sm text-white rounded-lg bg-[#4D750F]" role="alert">
        <svg className="shrink-0 inline w-4 h-4 me-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
        </svg>
        <span className="sr-only">Info</span>
        <div>
          <span className="font-medium"></span> {messageRedirect}
        </div>
      </div>}

      <form onSubmit={handleSubmitPassword}>
        <div className="mt-6 mb-4">
          <div className="relative">
            <AnimatedInput
              type="password"
              name="password"
              id="password"
              label={AuthResource.Password}
              value={formData.password.value}
              onChange={handleChange}
              error={formData.password.error}
            />
          </div>
        </div>
        <div className="mb-6">
          <div className="relative">
            <AnimatedInput
              type="password"
              id="password_confirm"
              name="password_confirm"
              label={AuthResource.PasswordConfirm}
              value={formData.password_confirm.value}
              onChange={handleChange}
              error={formData.password_confirm.error}
            />
          </div>
        </div>
        <div className="mb-4 table m-auto">
          <ReCAPTCHA
            sitekey={capchaApiKey}
            onChange={handleCaptchaChange}
          />
        </div>
        <button
          type="submit"
          className="m-auto block rounded-full shadow-xl bg-[#4D750F] px-6 py-2 font-medium text-white"
        >
          Cambiar
          {loading && (
            <span className="loader" style={{ width: '20px', height: '20px', marginLeft: '10px' }}></span>
          )}
        </button>
        <div className="my-6 text-sm text-[#562707]">
          <p className="font-bold text-lg mb-4">Requisitos de contraseña:</p>
          <ul className="list-disc text-md pl-5">
            <li>{AuthResource.UnlockedPagePassword}</li>
            <li>{AuthResource.UnlockedPagePassword2}</li>
            <li>{AuthResource.UnlockedPagePassword3}</li>
            <li>{AuthResource.UnlockedPagePassword4}</li>
          </ul>
        </div>

      </form>
    </>
  );
};

const UnlockedFormComplete = (props: { capchaApiKey: string, baseApiUrl: string }) => {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <UnlockedFormContent {...props} />
    </Suspense>
  );
};

export default UnlockedFormComplete;