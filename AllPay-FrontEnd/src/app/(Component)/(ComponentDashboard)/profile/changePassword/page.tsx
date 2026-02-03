"use client";

import ChangePassword from '@/presenters/components/modules/profile/ChangePassword';
import DobleFactorAuthenticateActivate from '@/presenters/components/modules/profile/DobleFaActivate';

const ChangePasswordPage: React.FC = () => {
    
    return (
        <>        
            <ChangePassword />
            <DobleFactorAuthenticateActivate />
        </>
    );
};

export default ChangePasswordPage;
