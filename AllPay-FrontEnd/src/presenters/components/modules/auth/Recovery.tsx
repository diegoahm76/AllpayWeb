'use client';

import { useState, FormEvent } from 'react';
import axios from 'axios';
import { AuthResource } from '@/application/auth/resources/auth.resource';
import { Recovery } from '@/domain/auth/types/recovery.type';
import ReCAPTCHA from 'react-google-recaptcha';
import Swal from "sweetalert2";
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';

const RecoveryForm = ({ baseApiUrl, capchaApiKey }: { baseApiUrl: string, capchaApiKey: string }) => {
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [formData, setFormData] = useState<any>({
    user: { value: '', error: false },
    capcha: ''
  });

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

  const sendRequest = async (input: Recovery) => {

    const protocol = window.location.protocol;
    const host = window.location.hostname;
    const port = window.location.port;
    let url = `${protocol}//${host}`
    if (port) {
      url = `${protocol}//${host}:${port}`
    }
    try {
      const payload = {
        nombre_de_usuario: input.user.value,
        redirect_url: `${url}/auth/recoveryComplete/`
      };
      const response = await axios.post(`${baseApiUrl}users/request-reset-email/`, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      }).catch(function (error) {
        return error.response;
      });
      if (response.data.success === false) {
        throw new Error(response.data.detail);
      }
      return response.data;
    } catch (error) {
      throw new Error(error as string);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    let error: boolean = false;
    let title: string = '';

    if (formData.user.value === '') {
      error = true;
      title = 'Revise el formulario';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        ['user']: { value: '', error: true }
      }));

    } else if (formData.capcha === '') {
      error = true
      title = 'Debe validar que no es un robot';
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
    } else {
      try {
        const response = await sendRequest(formData);

        Swal.fire({
          icon: "success",
          title: "¡Exitoso!",
          text: response.detail,
          confirmButtonColor: "#4D750F",
          confirmButtonText: AuthResource.Acept,
        });

        //setMessage(response.detail);
        setError('');
        setFormData((prevFormData: any) => ({
          ...prevFormData,
          ['user']: { value: '', error: false }
        }));
        setLoading(false);
      } catch (error) {
        const exception = error as Error;
        setMessage('');

        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: exception.message,
          confirmButtonColor: "#4D750F",
          confirmButtonText: AuthResource.Acept,
        })
        
        //setError(exception.message);
        setLoading(false);
      }
    }
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
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <AnimatedInput
            label={AuthResource.User}
            name="user"
            value={formData.user.value}
            onChange={handleChange}
            type="text"
          />
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
          {AuthResource.RecoverPasswordBtn}
          {loading && (
            <span className="loader" style={{ width: '20px', height: '20px', marginLeft: '10px' }}></span>
          )}
        </button>
      </form>
    </>
  );
};

export default RecoveryForm;