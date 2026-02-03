'use client';

import { AuthResource } from '@/application/auth/resources/auth.resource';
import { useAuthContext } from '@/providers/AuthProvider';
import Swal from "sweetalert2";

const LogoutButton = () => {
  const { isAuthenticated, handleLogout } = useAuthContext();

  const handleLogoutWithConfirmation = async () => {
    try {
      const result = await Swal.fire({
        title: AuthResource.LogoutTitle,
        text: AuthResource.LogoutConfirm,
        icon: "warning",
        showCancelButton: true,
        cancelButtonColor: "#4D750F",
        confirmButtonText: AuthResource.Acept,
        confirmButtonColor: "#4D750F",
        cancelButtonText: AuthResource.Cancel,
      });

      if (!result.isConfirmed) return;

      await handleLogout();

    } catch (error) {
      console.error('Logout error:', error);
      await Swal.fire({
        title: AuthResource.LogoutError,
        icon: "error",
        confirmButtonColor: "#4D750F",
        confirmButtonText: AuthResource.Acept,
      });
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <p onClick={handleLogoutWithConfirmation}>
      <a className="flex items-center py-2 px-5 bg-[rgb(var(--green))] text-sm text-white rounded-lg" href="#">
        {AuthResource.Logout}
      </a>
    </p>
  );
};

export default LogoutButton;