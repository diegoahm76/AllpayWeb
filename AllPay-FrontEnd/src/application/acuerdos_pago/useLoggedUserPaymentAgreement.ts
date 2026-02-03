import { useState, useEffect } from 'react';
import { getLoggedUser } from '@/adapters/acuerdos_pago/getInfoUserPaymentAgreement';
import { LoggedUserResponse } from '@/domain/models/acuerdos_pago/logged.user.payment.model';

export const useLoggedUser = (token: string) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<LoggedUserResponse | null>(null);

    const fetchUserData = async () => {
        
        if (!token) {
            setError('No hay token de autenticación');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await getLoggedUser(token);
            setData(response);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al obtener los datos del usuario');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, [token]);

    return {
        loading,
        error,
        data,
        refetch: fetchUserData
    };
}; 