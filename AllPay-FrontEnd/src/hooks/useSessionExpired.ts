'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { getFullLoginUrl } from '@/utils/authRedirect';

export const useSessionExpired = () => {
  const [showAlert, setShowAlert] = useState(false);

  const handleSessionExpired = () => {
    setShowAlert(true);
  };

  const handleClose = () => {
    setShowAlert(false);
    signOut({
      redirect: false,
      callbackUrl: getFullLoginUrl()
    });
  };

  return {
    showAlert,
    handleSessionExpired,
    handleClose
  };
}; 