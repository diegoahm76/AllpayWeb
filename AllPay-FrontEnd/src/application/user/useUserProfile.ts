import { useState, useEffect } from 'react';
import { getUserProfile } from '@/adapters/user/user.GetAllData';
import { UserProfileResponse } from '@/domain/models/user/user.models';

export const useUserProfile = (token: string) => {
    const [profile, setProfile] = useState<UserProfileResponse['data'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await getUserProfile(token);
            setProfile(response);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido al cargar el perfil');
            setProfile(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchProfile();
        }
    }, [token]);

    return {
        profile,
        loading,
        error,
        refetch: () => {
            if (token) {
                fetchProfile();
            }
        }
    };
}; 