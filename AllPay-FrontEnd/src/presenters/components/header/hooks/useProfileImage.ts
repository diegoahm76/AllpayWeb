import { useState, useEffect, useRef } from 'react';
import { fetchUserData } from '@/adapters/user/user.getUserData';
import { signIn } from 'next-auth/react';
import { useSession } from 'next-auth/react';

interface UseProfileImageReturn {
    imageProfile: string | null;
    isLoading: boolean;
    error: Error | null;
}

export const useProfileImage = (): UseProfileImageReturn => {
    const [imageProfile, setImageProfile] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const hasFetched = useRef<boolean>(false);

    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            signIn();
        }
    });

    const token = (session as any)?.user?.tokens?.access;

    useEffect(() => {
        const getProfileImage = async () => {
            // Evitar recargas innecesarias
            if (!token || hasFetched.current) {
                setIsLoading(false);
                return;
            }

            
            hasFetched.current = true;

            try {
                const userData = await fetchUserData(token);
                
                const imageUrl = userData.image_profile || '/images/user.jpg';
                
                setImageProfile(imageUrl);
            } catch (err) {
                console.error('[useProfileImage] - Error al obtener imagen:', err);
                setError(err instanceof Error ? err : new Error('Error fetching profile image'));
                // En caso de error, usar imagen por defecto
                setImageProfile('/images/user.jpg');
            } finally {
                setIsLoading(false);
            }
        };

        getProfileImage();
    }, [token]);

    return { imageProfile, isLoading, error };
};