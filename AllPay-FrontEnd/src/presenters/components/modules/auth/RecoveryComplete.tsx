'use client';

import { useState, FormEvent, useEffect } from 'react';
import axios from 'axios';
import ReCAPTCHA from 'react-google-recaptcha';
import { Exception } from '@/adapters/shared/exception';
import { AuthResource } from '@/application/auth/resources/auth.resource';
import Swal from "sweetalert2";
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';

const valid = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/

const FormRecoveryComplete = ({ capchaApiKey, baseApiUrl }: { capchaApiKey: string, baseApiUrl: string }) => {
  const [token, setToken] = useState<string | null>(null);
  const [uidb64, setUidb64] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setToken(urlParams.get('token'));
      setUidb64(urlParams.get('uidb64'));
    }
  }, []);

  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  //const [messageRedirect, setMessageRedirect] = useState<string>('');
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
    if (valid.test(formData.password.value) && formData.password.value.trim().length > 5) {
      if (formData.password.value !== formData.password_confirm.value) {
        error = true;
        title = 'Contraseñas no son iguales';
        setFormData((prevFormData: any) => ({
          ...prevFormData,
          ['password']: { value: formData.password.value, error: true },
          ['password_confirm']: { value: formData.password_confirm.value, error: true }
        }));
      }
      else if (formData.capcha === '') {
        error = true
        title = 'Debe validar que no es un robot';
      }
      else if (token && uidb64) {
        try {
          const payload = {
            uidb64: uidb64,
            token: token,
            password: formData.password.value
          };

          const response = await axios.patch(`${baseApiUrl}users/pasword-reset-complete`, payload, {
            headers: {
              'Content-Type': 'application/json'
            }
          });
          if (response.data.success) {
            setFormData((prevFormData: any) => ({
              ...prevFormData,
              ['password']: { value: '', error: false },
              ['password_confirm']: { value: '', error: false }
            }));

            Swal.fire({
              icon: "success",
              title: "¡Contraseña cambiada!",
              text: response.data.detail,
              confirmButtonColor: "#4D750F",
              confirmButtonText: AuthResource.Acept,
            });

            //setMessage(response.data.detail);
            setError('');
            //setMessageRedirect('Sera redirigido en unos segundos')
            setTimeout(redirect, 4000);
            setLoading(false);
          }
        } catch (error: unknown | any) {
          setMessage('');
          setFormData((prevFormData: any) => ({
            ...prevFormData,
            ['password']: { value: '', error: false },
            ['password_confirm']: { value: '', error: false }
          }));

          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: error.response.data.detail,
            confirmButtonColor: "#4D750F",
            confirmButtonText: AuthResource.Acept,
          });
          
          //setError(error.response.data.detail);
          setLoading(false);
          new Exception('', error as Error);
        }
      } else {
        error = true;
        title = 'Error en token';
      }
    } else {
      error = true;
      title = 'Contraseña no cumple con los requisitos minimos'
    }
    if (error) {

      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: title,
        confirmButtonColor: "#4D750F",
        confirmButtonText: AuthResource.Acept,
      });
      
      //setError(title);
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

      {/* {messageRedirect && <div className="flex items-center p-4 mb-4 text-sm text-white rounded-lg bg-[#4D750F]" role="alert">
        <svg className="shrink-0 inline w-4 h-4 me-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
        </svg>
        <span className="sr-only">Info</span>
        <div>
          <span className="font-medium"></span> {messageRedirect}
        </div>
      </div>} */}

      <form onSubmit={handleSubmitPassword}>
        <div className="mb-4">
          <AnimatedInput
            label={AuthResource.Password}
            name="password"
            value={formData.password.value}
            onChange={handleChange}
            type="password"
          />

        </div>
        <div className="mb-4">
       
          <div className="relative">

            <AnimatedInput
              label={AuthResource.PasswordConfirm}
              name="password_confirm"
              value={formData.password_confirm.value}
              onChange={handleChange}
              type="password"
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
        <p className='text-left text-[#562707] font-bold mb-4 mt-4'>- {AuthResource.UnlockedPagePassword}</p>
        <p className='text-left text-[#562707] font-bold mb-4 mt-4'>- {AuthResource.UnlockedPagePassword2}</p>
        <p className='text-left text-[#562707] font-bold mb-4 mt-4'>- {AuthResource.UnlockedPagePassword3}</p>
        <p className='text-left text-[#562707] font-bold mb-4 mt-4'>- {AuthResource.UnlockedPagePassword4}</p>
      </form>
    </>
  );
};

export default FormRecoveryComplete;