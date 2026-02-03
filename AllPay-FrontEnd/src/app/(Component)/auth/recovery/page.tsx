import React from 'react';

import { BASE_API_URL } from '@/environment';
import { CAPCHA_API } from '@/environment';

import '@/presenters/css/background.css';

import FormRecovery from '@/presenters/components/modules/auth/Recovery';
import { AuthResource } from '@/application/auth/resources/auth.resource';

const Recovery: React.FC = () => {
  return (
    <div className="background">
      <div className='flex justify-center items-center min-h-screen'>
        <div className="p-6 w-full md:w-3/4 lg:w-1/2 flex justify-center items-center">
          <div className='p-4 sm:p-6 bg-slate-200 rounded-xl'>
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-xl">
              <h1 className='text-center text-[#562707] text-2xl md:text-4xl font-bold'>{AuthResource.RecoveryTitle}</h1>
              <p className='text-center text-[#562707] mb-4 md:mb-8 font-bold'>{AuthResource.RecoveryPageDescription}</p>
              <FormRecovery baseApiUrl={BASE_API_URL!} capchaApiKey={CAPCHA_API!} />
              <p className='text-center text-[#562707] mt-4 md:mt-6'>{AuthResource.SignInMessage}. <a href="/auth/signin" className='font-bold'>{AuthResource.SignInMessageAction}</a></p>
              <p className='text-center text-[#562707] mt-4 md:mt-6'>{AuthResource.Register} <a href="/auth/register" className='font-bold'>{AuthResource.RegisterClic}</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Recovery;
