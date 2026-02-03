import axios from 'axios';
import { signOut } from 'next-auth/react';
import { getFullLoginUrl } from '@/utils/authRedirect';
import { 
    RendimientoCensoApiResponse, 
    RendimientoCensoFilters 
} from '../models/rendimientoCenso.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene los datos de rendimiento censo con paginación
 * @param token Token de autenticación JWT
 * @param filters Parámetros de paginación
 * @returns Promise con la respuesta de rendimiento censo
 */
export const getRendimientoCenso = async (
    token: string, 
    filters?: RendimientoCensoFilters
): Promise<RendimientoCensoApiResponse> => {
    try {
        // Construir parámetros de consulta
        const queryParams: Record<string, string> = {};
        
        if (filters?.page) {
            queryParams.page = filters.page.toString();
        }
        if (filters?.page_size) {
            queryParams.page_size = filters.page_size.toString();
        }

        const response = await axios.get(`${baseApiUrl}reportes/api/rendimiento-censo/`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            params: queryParams
        });


        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener datos de rendimiento censo');
        }

        return response.data;
    } catch (error: any) {
        console.error('[getRendimientoCenso] - Error:', error);
        
        if (axios.isAxiosError(error)) {
            if (error.response?.data?.detail?.detail === "El token dado no es valido para ningun tipo de token") {
                const alertRoot = document.getElementById('alert-error-portal-root') || document.createElement('div');
                alertRoot.id = 'alert-error-portal-root';
                document.body.appendChild(alertRoot);

                const alertContent = document.createElement('div');
                const fullLoginUrl = getFullLoginUrl();
                alertContent.innerHTML = `
                    <div class="fixed inset-0 z-50 flex items-center justify-center">
                        <div class="absolute inset-0 bg-transparent backdrop-blur-sm"></div>
                        <div class="relative z-10">
                            <div class="m-auto rounded-xl p-6 bg-slate-200">
                                <div class="w-full max-w-[95vw] md:w-[500px] max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-lg relative">
                                    <div class="mt-4 flex flex-col items-center gap-6 pt-4 text-center">
                                        <div class="w-48">
                                            <img src="/images/corporate/logo.png" alt="Federación Nacional de Cacaoteros" style="width: 100%; height: auto;">
                                        </div>
                                        <h2 class="text-[#562707] font-bold text-lg">SEÑOR(A) RECAUDOR(A)</h2>
                                        <p class="text-[#562707] font-semibold max-w-xs">Sesión Expirada, por favor vuelva a iniciar sesión</p>
                                        <button class="px-6 py-2 bg-[rgb(var(--green))] text-white rounded-lg hover:bg-[#78390e] transition-colors" onclick="window.location.href='${fullLoginUrl}'">
                                            Aceptar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                alertRoot.appendChild(alertContent);

                // Cerrar sesión y redirigir
                await signOut({ redirect: true, callbackUrl: fullLoginUrl });
            }

            if (error.response?.status === 404) {
                throw new Error('No se encontraron datos de rendimiento censo');
            }

            if (error.response?.status === 500) {
                throw new Error('Error interno del servidor al obtener rendimiento censo');
            }
        }

        throw new Error(error.response?.data?.detail || error.message || 'No se pudo obtener el rendimiento censo');
    }
};
