'use client';

import { useState, FormEvent, useEffect } from 'react';
import { signIn, getSession } from 'next-auth/react';
import ReCAPTCHA from 'react-google-recaptcha';
import axios from 'axios';
import Swal from "sweetalert2";

import { Exception } from '@/adapters/shared/exception';
import { AuthResource } from '@/application/auth/resources/auth.resource';
import { Credentials } from '@/domain/auth/types/credentials.type';

import { generate2FACode } from '@/app/api/auth/createCode2fa';
import { fetchAuthenticationMethods } from '@/app/api/auth/authenticationMethods'
import { getCode2fa } from '@/app/api/auth/getCode2fa';
import { verify2FACode } from '@/app/api/auth/verifyCode2fa';
import { Button } from '@/presenters/components/ui/AnimatedButton';
import AnimatedInput from '@/presenters/components/ui/AnimatedInput'
import { useRouter } from 'next/navigation';
import useTotpValidate from '@/app/(Component)/(ComponentDashboard)/profile/changePassword/hooks/useTotpValidate';

class Autenticate {
  /**
   * Verifica que la sesión esté disponible después del login
   * Esto es crítico en entornos ECS donde las cookies pueden tardar en sincronizarse
   */
  private static async verifySessionAvailable(maxRetries: number = 3, delayMs: number = 500): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[LOGIN] Verificando sesión disponible (intento ${attempt}/${maxRetries})...`);
        
        // Pequeño delay para permitir sincronización de cookies
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
        
        const session = await getSession();
        
        if (session?.user) {
          console.log('[LOGIN] ✅ Sesión verificada y disponible:', {
            userId: session.user.id,
            hasUser: !!session.user
          });
          return true;
        }
        
        console.warn(`[LOGIN] ⚠️ Sesión no disponible en intento ${attempt}`);
      } catch (error) {
        console.error(`[LOGIN] Error al verificar sesión (intento ${attempt}):`, error);
      }
    }
    
    console.error('[LOGIN] ❌ No se pudo verificar la sesión después de todos los intentos');
    return false;
  }

  public static async SignIn(credentials: Credentials): Promise<boolean> {
    try {
      console.log('[LOGIN] Iniciando SignIn con NextAuth...', {
        user: credentials.user,
        hasPassword: !!credentials.password
      });
      
      const params = await signIn('credentials', {
        ...credentials,
        redirect: false,
      });
      
      console.log('[LOGIN] Respuesta de signIn:', {
        ok: params?.ok,
        error: params?.error,
        status: params?.status,
        url: params?.url,
        fullParams: params
      });
      
      // Verificar si signIn realmente fue exitoso
      // Si params es undefined, o tiene error, o ok es false, NO es éxito
      if (!params || params.error || params.ok === false) {
        console.error('[LOGIN] ❌ signIn falló:', {
          hasParams: !!params,
          error: params?.error,
          ok: params?.ok,
          status: params?.status
        });
        return false;
      }
      
      // Verificar errores específicos de autenticación
      if (
        params.error === 'AccessDenied' ||
        params.error === 'CredentialsSignin'
      ) {
        console.error('[LOGIN] ❌ Error de autenticación:', params.error);
        return false;
      }
      
      console.log('[LOGIN] ✅ SignIn exitoso, verificando sesión disponible...');
      
      // Verificar que la sesión esté disponible después del login
      // Esto es crítico en ECS donde las cookies pueden tardar en sincronizarse
      const sessionAvailable = await this.verifySessionAvailable();
      
      if (!sessionAvailable) {
        console.error('[LOGIN] ❌ SignIn exitoso pero sesión no disponible - posible problema de sincronización de cookies');
        // Aún retornamos true porque signIn fue exitoso, pero registramos el warning
        // El problema se resolverá en el siguiente refresh o cuando las cookies se sincronicen
      }
      
      return true;
    } catch (error) {
      console.error('[LOGIN] ❌ Excepción en SignIn:', error);
      new Exception('', error as Error);
      return false;
    }
  }
}

const validateUser = async (baseApiUrl: string, data: any) => {
  try {
    const response = await axios
      .post(`${baseApiUrl}users/validate/`, data, {
        headers: { 'Content-Type': 'application/json' },
      })
      .catch((error) => {
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: "No se pudo validar el usuario",
          confirmButtonColor: 'rgb(var(--green))',
          confirmButtonText: AuthResource.Acept,
        });
        return error.response;
      });
    if (response.data.success === false) {
      return response.data;
    } else if (response.data.success === true) {
      return response.data;
    }
    return null;
  } catch (error: any) {
    if (typeof error === 'string') {

      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: error,
        confirmButtonColor: 'rgb(var(--green))',
        confirmButtonText: AuthResource.Acept,
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Ha ocurrido un error contacte con el administrador',
        confirmButtonColor: 'rgb(var(--green))',
        confirmButtonText: AuthResource.Acept,
      });
    }
    return null;
  }
};

interface TwoFactorMethod {
  id_2fa_persona: number;
  tipo_2fa: string;
  nombre_tipo_2fa: string;
  descripcion_2fa: string;
  email_verificacion: string | null;
  tel_verificacion: string | null;
  id_persona: number;
  id_2fa: number;
}


export default function FormLogin({
  capchaApiKey,
  baseApiUrl,
}: {
  capchaApiKey: string;
  baseApiUrl: string;
}) {
  const router = useRouter();
  const [, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [count, setCount] = useState<number>(0);
  const [, setMessage] = useState<string>('');
  const [formData, setFormData] = useState<any>({
    user: { value: '', error: false },
    password: { value: '', error: false },
    capcha: '',
  });

  const [resendTimer, setResendTimer] = useState<number>(120);

  const [show2FA, setShow2FA] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>('');
  const [tempUser, setTempUser] = useState<string>('');
  const [tempPass, setTempPass] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [tfaMethod, setTfaMethod] = useState<TwoFactorMethod | null>(null);

  const [, setIdVerificacion2FA] = useState<number | null>(null);
  const { validateTotp } = useTotpValidate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevFormData: any) => ({
      ...prevFormData,
      [name]: { ...prevFormData[name], value, error: false },
    }));
  };


  const doValidateUser = async (username: string) => {
    const response = await validateUser(baseApiUrl, {
      nombre_de_usuario: username,
    });
    return response;
  };

  const finalSignIn = async (user: string, pass: string) => {
    console.log('[LOGIN] Iniciando finalSignIn...', { user });
    
    const isAuthenticated = await Autenticate.SignIn({ user, password: pass });
    
    console.log('[LOGIN] Resultado de autenticación:', { isAuthenticated });
    
    if (!isAuthenticated) {
      console.warn('[LOGIN] Autenticación fallida, validando usuario...');
      const response = await doValidateUser(user);
      console.log('[LOGIN] Respuesta de validación:', response);
      
      if (response?.code === 101) {
        setCount(response.data.contador);
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: `${AuthResource.InvalidCredentials}: ${3 - response.data[0].contador}`,
          confirmButtonColor: 'rgb(var(--green))',
          confirmButtonText: AuthResource.Acept,
        });
        setLoading(false);
      } else if (response?.code === 102) {
        setCount(3);
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: `${AuthResource.UnlockedDescription}`,
          confirmButtonColor: 'rgb(var(--green))',
          confirmButtonText: AuthResource.Acept,
        });
        setLoading(false);
      }
      return;
    }
    
    console.log('[LOGIN] Redirigiendo a home...');
    router.push('/');
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (show2FA && resendTimer > 0) {
      timer = setTimeout(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [show2FA, resendTimer]);

  const handleVerify2FA = async () => {
    setLoading(true);
    try {
      const codeData = await getCode2fa(accessToken);
      
      // Verificar si el método 2FA es VTOTP
      const methodData = Array.isArray(codeData.data) ? codeData.data[0] : codeData.data;
      const isVTOTP = methodData?.tipo_2fa === 'VTOTP';

      let verifyResp;

      if (isVTOTP) {
        // Usar el hook useTotpValidate para validar TOTP
        verifyResp = await validateTotp(accessToken, { codigo: otpCode });
      } else {
        // Usar el método original para otros tipos de 2FA
        const idVer = Array.isArray(codeData.data)
          ? codeData.data[0].id_verificacion_2fa
          : codeData.data.id_verificacion_2fa;
        setIdVerificacion2FA(idVer);
        verifyResp = await verify2FACode(accessToken, otpCode, idVer);
      }

      if (!verifyResp?.success) {
        Swal.fire({
          icon: 'error',
          title: 'Código incorrecto',
          text: verifyResp?.detail || 'Por favor, intenta de nuevo',
        });
        setLoading(false);
        return;
      }

      await finalSignIn(tempUser, tempPass);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error verificación 2FA',
        text: err instanceof Error ? err.message : 'No se pudo verificar el código de 2FA',
        confirmButtonColor: 'rgb(var(--green))',
        confirmButtonText: AuthResource.Acept,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!tfaMethod) return;
    setLoading(true);
    try {
      const req2fa = await generate2FACode(accessToken, tfaMethod);
      if (!req2fa.success) {
        Swal.fire({
          icon: "error",
          title: "Error 2FA",
          text: "No se pudo generar/enviar el código de 2FA",
        });
        setLoading(false);
        return;
      }
      Swal.fire({
        icon: "success",
        title: "Código enviado",
        text: "El código se ha reenviado correctamente",
        confirmButtonColor: 'rgb(var(--green))',
      });

      setResendTimer(120);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error 2FA",
        text: "No se pudo generar/enviar el código de 2FA",
      });
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e?: FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Validar campos vacíos
    if (formData.user.value === '' || formData.password.value === '') {
      // Marcar errores en los inputs
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        user: { ...prevFormData.user, error: formData.user.value === '' },
        password: { ...prevFormData.password, error: formData.password.value === '' }
      }));

      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Debe completar todos los campos',
        confirmButtonColor: 'rgb(var(--green))',
        confirmButtonText: AuthResource.Acept,
      });
      return;
    }

    if (formData.capcha === '') {
       Swal.fire({
         icon: 'error',
         title: 'Oops...',
         text: 'Debe validar que no es un robot',
         confirmButtonColor: 'rgb(var(--green))',
         confirmButtonText: AuthResource.Acept,
       });
       return;
    }

    const user = formData.user.value;
    const pass = formData.password.value;
    setLoading(true);
    
    console.log('[LOGIN] handleSubmit iniciado', { user });
    
    try {
      console.log('[LOGIN] Haciendo petición a API de login...');
      const resp = await axios.post(`${baseApiUrl}users/login/`, {
        nombre_de_usuario: user,
        password: pass,
      });

      console.log('[LOGIN] Respuesta de API recibida:', {
        success: resp.data.success,
        hasData: !!resp.data.data,
        hasTokens: !!resp.data.data?.tokens,
        tokensKeys: resp.data.data?.tokens ? Object.keys(resp.data.data.tokens) : []
      });

      if (!resp.data.success) {
        console.warn('[LOGIN] Login fallido según API');
        setLoading(false);
        const response = await doValidateUser(user);
        if (response?.code === 101) {
          setCount(response.data.contador);
          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: `${AuthResource.InvalidCredentials}: ${3 - response.data[0].contador}`,
            confirmButtonColor: 'rgb(var(--green))',
            confirmButtonText: AuthResource.Acept,
          });
        } else if (response?.code === 102) {
          setCount(3);
          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: `${AuthResource.UnlockedDescription}`,
            confirmButtonColor: 'rgb(var(--green))',
            confirmButtonText: AuthResource.Acept,
          });

        }
        return;
      }
      const userData = resp.data.data;

      console.log('[LOGIN] Verificando métodos 2FA...');
      const has2faResponse = await fetchAuthenticationMethods(userData.tokens?.access);
      const has2FA = has2faResponse.data.length > 0 ? true : false;

      console.log('[LOGIN] Resultado verificación 2FA:', {
        has2FA,
        methodsCount: has2faResponse.data.length
      });

      if (!has2FA) {
        console.log('[LOGIN] Sin 2FA, procediendo con finalSignIn...');
        await finalSignIn(user, pass);
        setLoading(false);
      } else {
        console.log('[LOGIN] Usuario tiene 2FA, solicitando código...');
        const token = userData.tokens?.access || '';
        setAccessToken(token);
        setTempUser(user);
        setTempPass(pass);
        try {
          setTfaMethod(has2faResponse.data[0]);
          const req2fa = await generate2FACode(token, has2faResponse.data[0]);

          if (!req2fa.success) {
            console.error('[LOGIN] Error al generar código 2FA');
            Swal.fire({
              icon: 'error',
              title: 'Error 2FA',
              text: 'No se pudo generar/enviar código de 2FA',
              confirmButtonColor: 'rgb(var(--green))',
              confirmButtonText: AuthResource.Acept,
            });
            setLoading(false);
            return;
          }

          console.log('[LOGIN] Código 2FA generado, mostrando formulario');
          setShow2FA(true);
          setLoading(false);
        } catch (error) {
          console.error('[LOGIN] Excepción al generar código 2FA:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error 2FA',
            text: 'No se pudo generar/enviar código de 2FA',
            confirmButtonColor: 'rgb(var(--green))',
            confirmButtonText: AuthResource.Acept,
          });
          setLoading(false);
        }
      }
    } catch (error: any) {
      console.error('[LOGIN] Excepción en handleSubmit:', error);
      const response = await doValidateUser(user);

      if (response?.code === 101) {
        setCount(response.data.contador);
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: `${AuthResource.InvalidCredentials}: ${3 - response.data[0].contador}`,
          confirmButtonColor: 'rgb(var(--green))',
          confirmButtonText: AuthResource.Acept,
        });
      } else if (response?.code === 102) {
        setCount(3);
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: `${AuthResource.UnlockedDescription}`,
          confirmButtonColor: 'rgb(var(--green))',
          confirmButtonText: AuthResource.Acept,
        });
      }

      if (error.response.status === 403) {
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: error.response.data.detail,
          confirmButtonColor: 'rgb(var(--green))'
        })
      }

      setLoading(false);
      new Exception('', error as Error);
    }
  };

  const validate = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setCount(0);
    let hasError = false;
    let title = '';

    setFormData((prevFormData: any) => ({
      ...prevFormData,
      user: { ...prevFormData.user, error: false },
      password: { ...prevFormData.password, error: false }
    }));

    if (formData.password.value === '') {
      hasError = true;
      title = 'Revise el formulario';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        password: { ...prevFormData.password, error: true }
      }));
    }
    if (formData.user.value === '') {
      hasError = true;
      title = 'Revise el formulario';
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        user: { ...prevFormData.user, error: true }
      }));
    } else if (formData.capcha === '') {
      hasError = true;
      title = 'Debe validar que no es un robot';
    }

    if (hasError) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: title,
        confirmButtonColor: 'rgb(var(--green))',
        confirmButtonText: AuthResource.Acept,
      });
      setLoading(false);
    } else {
      handleSubmit();
    }
  };

  const restoreCatcha = () => {
     setFormData((prevFormData: any) => ({
       ...prevFormData,
       capcha: '',
     }));
  };

  const handleCaptchaChange = (value: string | null) => {
     setTimeout(restoreCatcha, 60000);
     setFormData((prevFormData: any) => ({
       ...prevFormData,
       capcha: value,
     }));
   };

  return (
    <>

      {count === 3 && (
        <a href="/auth/unlocked" className="text-center text-[#4D750F] mt-4 font-bold block underline">
          {AuthResource.Unlocked}
        </a>
      )}

      {!show2FA && (
        <form onSubmit={validate}>
          <div className="mb-4 mt-6">
            <AnimatedInput
              type="text"
              name="user"
              id="user"
              label={AuthResource.User}
              value={formData.user.value}
              onChange={handleChange}
              error={formData.user.error}
            />
          </div>
          <div className="mb-4">
            <AnimatedInput
              type="password"
              name="password"
              id="password"
              label={AuthResource.InputPassword}
              value={formData.password.value}
              onChange={handleChange}
              error={formData.password.error}
            />
          </div>

          <div className="mb-4 table m-auto">
            <ReCAPTCHA sitekey={capchaApiKey} onChange={handleCaptchaChange} />
          </div> 

          <Button
            onClick={() => handleSubmit()}
            title="Iniciar Sesión"
            loading={loading}
            className='m-auto'
          />
        </form>
      )}

      {
        show2FA && (
          <div className="rounded-md mt-4">
            <div className="flex justify-between items-center">
              <p className="text-md mb-4 text-[#562707]">Introducir código</p>
              {resendTimer > 0 ? (
                <p className="text-md mb-4 text-[#562707]">
                  Nuevo código en: {resendTimer}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-md mb-4 text-[#562707] underline"
                >
                  Reenviar código
                </button>
              )}
            </div>
            <AnimatedInput
              type="text"
              name="code"
              label=""
              value={otpCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setOtpCode(e.target.value)
              }
            />
            <div className="flex justify-center mt-6">

              <Button
                onClick={handleVerify2FA}
                title="Confirmar"
                disabled={loading}
              />

            </div>
          </div>
        )
      }

    </>
  );
}
