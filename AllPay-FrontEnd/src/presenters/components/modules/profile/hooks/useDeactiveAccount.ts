'use client';

import { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useSession, signIn } from 'next-auth/react';

const baseApiUrl = process.env.BASE_API_URL;

export const useDeactivateAccount = (personaId: number | null) => {
  const [isChecked, setIsChecked] = useState(false);

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const valueSesion: any = session;

  const handleDeactivateAccount = async () => {
    if (!isChecked) {
      Swal.fire({ icon: 'warning', title:"Debe confirmar la desactivación",  timer: 5000, confirmButtonColor: '#4D750F' });
      return;
    }

    try {
      await axios.patch(
        `${baseApiUrl}users/deactivate/${personaId}/`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${valueSesion.user.tokens.access}`
          }
        }
      );
      Swal.fire({ icon: 'success', title: 'Cuenta desactivada', timer: 5000 });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error al desactivar la cuenta', timer: 5000 });
    }
  };

  return {
    isChecked,
    setIsChecked,
    handleDeactivateAccount
  };
};
