import React from 'react';
import Logo from '@/presenters/components/shared/logo/Logo'; 
import { CAPCHA_API, BASE_API_URL } from '@/environment';
import '@/presenters/css/background.css';
import FormLogin from '@/presenters/components/modules/auth/Login';
import { AuthResource } from '@/application/auth/resources/auth.resource';

const SignIn: React.FC = () => {
  return (
    <div className="background relative">
      <div className="flex justify-center items-center min-h-screen">
        <div className="relative">

          <div className="p-4 sm:p-6 bg-slate-200 rounded-xl w-full max-w-md">
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-xl">
              <div className="flex items-center justify-center gap-4 mb-4">
                <Logo />
              </div>
              <h1 className="text-center text-[#562707] text-2xl md:text-4xl mb-4 font-bold">
                {AuthResource.SignIn}
              </h1>
              <p className="text-center text-[#562707] mb-4 md:mb-2 font-bold">
                {AuthResource.SignInDescription}
              </p>
              <FormLogin capchaApiKey={CAPCHA_API!} baseApiUrl={BASE_API_URL!} />
              <p className="text-center text-[#562707] mt-4 md:mt-6">
                {AuthResource.Register}{' '}
                <a href="/auth/register" className="font-bold">
                  {AuthResource.RegisterClic}
                </a>
              </p>
              <p className="text-center text-[#562707] mt-4 md:mt-6">
                {AuthResource.recoveryPasswordDescription}{' '}
                <a href="/auth/recovery" className="font-bold">
                  {AuthResource.recoveryPassword}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
