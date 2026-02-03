'use client';

import { useState, FormEvent, useEffect, useCallback } from 'react';
import axios from 'axios';
import ReCAPTCHA from 'react-google-recaptcha';
import { Exception } from '@/adapters/shared/exception';
import { AuthResource } from '@/application/auth/resources/auth.resource';
import { Unlocked } from '@/domain/auth/types/unlocked.type';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput';
import AnimatedSelect from '@/presenters/components/ui/AnimatedSelect';
import Swal from "sweetalert2";

const valid = /^\w+([.-_+]?\w+)*@\w+([.-]?\w+)*(\.\w{2,10})+$/

const UnlockedForm = ({ capchaApiKey, baseApiUrl }: { capchaApiKey: string, baseApiUrl: string }) => {
  const [, setError] = useState<string>('');
  const [, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<any>({
    user: { value: '', error: false },
    document: { value: '', error: false },
    mobile: { value: '', error: false },
    email: { value: '', error: false },
    birthdate: { value: '', error: false },
    password: { value: '', error: false },
    password_confirm: { value: '', error: false },
    capcha: ''
  });
  const [typeDocument, setTypeDocument] = useState({ value: '', error: false })
  const [dataTypeDocument, setDataTypeDocument] = useState<any[]>([])


  const obtenerTiposDocu = useCallback(async () => {
    try {
      const response = await axios.get(`${baseApiUrl}personas/tipos-documento/get-list/?activo=True`, {
        headers: {
          'Content-Type': 'application/json'
        }
      }).catch(function (error) {
        return error.response;
      });
      if (response.data.success === false) {
        throw response.data.detail;
      }
      setDataTypeDocument(response.data.data);
    } catch (error) {
      throw new Exception(error as string);
    }
  }, []);

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

  const handleSelectChangeTypeDocumento = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    setTypeDocument({ value: value, error: false });

    if (value === 'NT') {
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        birthdate: {
          value: '',
          error: false
        }
      }));
    }
  };


  const sendRequest = async (input: Unlocked) => {
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
        numero_documento: input.document.value,
        telefono_celular: input.mobile.value,
        email: input.email.value,
        fecha_nacimiento: input.birthdate.value,
        tipo_documento: typeDocument.value,
        redirect_url: `${url}/auth/unlockedComplete/`
      };
      const response = await axios.post(`${baseApiUrl}users/unblock/`, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      }).catch(function (error) {
        return error.response;
      });
      if (response.data.success === false) {
        throw response.data.detail;
      }
      return response.data;
    } catch (error) {
      throw new Exception(error as string);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
    } if (formData.document.value === '') {
      error = true;
      title = 'Revise el formulario';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        ['document']: { value: '', error: true }
      }));
    } if (formData.mobile.value === '') {
      error = true;
      title = 'Revise el formulario';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        ['mobile']: { value: '', error: true }
      }));
    } if (!valid.test(formData.email.value)) {
      error = true;
      title = 'Revise el formulario';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        ['email']: { value: formData.email.value, error: true }
      }));
    } if (typeDocument.value === '') {
      error = true;
      title = 'Revise el formulario';
      setTypeDocument({ value: '', error: true })
    }
    if (typeDocument.value !== 'NT') {
      error = true;
      title = 'Revise el formulario';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        ['birthdate']: { value: '', error: true }
      }));
    }
    if (!error) {
      if (formData.capcha === '') {
        error = true;
        title = 'Debe validar que no es un robot';
      }
    }

    if (!error) {
      try {
        const response = await sendRequest(formData as Unlocked);

        Swal.fire({
          title: '¡Exitoso!',
          text: response.detail,
          icon: 'success',
          confirmButtonColor: "#4D750F",
          confirmButtonText: AuthResource.Acept,
        });

        //setMessage(response.detail);
        setError('');
        setLoading(false);
      } catch (error) {
        const exception = error as Error;
        setMessage('');
        setLoading(false);

        Swal.fire({
          title: '¡Error!',
          text: exception.message,
          icon: 'error',
          confirmButtonColor: "#4D750F",
          confirmButtonText: AuthResource.Acept,
        });

      }
    } else {
      setMessage('')

      Swal.fire({
        title: '¡Error!',
        text: title,
        icon: 'error',
        confirmButtonColor: "#4D750F",
        confirmButtonText: AuthResource.Acept,
      });

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

  useEffect(() => {
    obtenerTiposDocu()
  }, [obtenerTiposDocu])

  return (
    <>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">

          <AnimatedInput
            label={AuthResource.User}
            id="user"
            name="user"
            value={formData.user.value}
            onChange={handleChange}
            error={formData.user.error}
          />

        </div>
        <div className="mb-4">

          <AnimatedSelect
            label={AuthResource.RegisterTypeDocument}
            name="typeDocument"
            value={typeDocument.value}
            onChange={handleSelectChangeTypeDocumento}
            error={typeDocument.error}
            options={dataTypeDocument.map((value: any) => ({
              key: value.cod_tipo_documento,
              value: value.cod_tipo_documento,
              title: value.nombre
            }))}
          />

        </div>
        <div className="mb-4">

          <AnimatedInput
            label={AuthResource.Document}
            id="document"
            name="document"
            value={formData.document.value}
            onChange={handleChange}
            error={formData.document.error}
          />

        </div>
        <div className="mb-4">

          <AnimatedInput
            label={AuthResource.Mobile}
            id="mobile"
            name="mobile"
            value={formData.mobile.value}
            onChange={handleChange}
            error={formData.mobile.error}
          />

        </div>
        <div className="mb-4">

          <AnimatedInput
            label={AuthResource.Email}
            id="email"
            name="email"
            value={formData.email.value}
            onChange={handleChange}
            error={formData.email.error}
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
          className="m-auto block rounded-full shadow-xl bg-[#4D750F] px-6 py-2 text-white"
        >
          Enviar
          {loading && (
            <span className="loader" style={{ width: '20px', height: '20px', marginLeft: '10px' }}></span>
          )}
        </button>

      </form>
    </>
  );
};

export default UnlockedForm;