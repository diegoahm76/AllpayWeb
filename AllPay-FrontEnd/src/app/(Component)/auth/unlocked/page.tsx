import React from 'react';
import { CAPCHA_API, BASE_API_URL } from '@/environment';

import '@/presenters/css/background.css';

import FormUnlocked from '@/presenters/components/modules/auth/Unlocked';
import { AuthResource } from '@/application/auth/resources/auth.resource';
import Logo from '@/presenters/components/shared/logo/Logo';

const Unlocked: React.FC = () => {
  return (
    <div className="background">
      <div className='flex justify-center items-center min-h-screen'>
        <div className="p-6 w-full md:w-3/4 lg:w-1/2 flex justify-center items-center">
          <div className='p-4 sm:p-6 bg-slate-200 rounded-xl'>
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-xl">
              <Logo />
              <h1 className='text-center text-[#562707] text-4xl font-bold'>{AuthResource.UnlockedTitle}</h1>
              <p className='text-left text-[#562707] font-bold mb-6 mt-4'>{AuthResource.UnlockedPageDescription}</p>
              <FormUnlocked capchaApiKey={CAPCHA_API!} baseApiUrl={BASE_API_URL!} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unlocked;
