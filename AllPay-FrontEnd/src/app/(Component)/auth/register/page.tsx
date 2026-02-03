import React from 'react';

import { BASE_API_URL } from '@/environment';

import '@/presenters/css/background.css';

import FormRegister from '@/presenters/components/modules/register/Register';
import { ThemeProvider } from 'next-themes';

const Register: React.FC = () => {
  return (

    <ThemeProvider attribute="class" defaultTheme="false" enableSystem={false}>
    
    <div className="background">
      <div className='flex justify-center items-center min-h-screen'>
        <div className="p-6 w-full">
 
            <FormRegister baseApiUrl={BASE_API_URL!} />
          
        </div>
      </div>
    </div>

    </ThemeProvider>
  );
};

export default Register;
