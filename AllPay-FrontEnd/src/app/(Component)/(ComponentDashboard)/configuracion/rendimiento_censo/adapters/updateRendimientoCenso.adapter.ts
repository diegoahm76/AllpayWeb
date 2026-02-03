import axios from 'axios';
import { signOut } from 'next-auth/react';
import { getFullLoginUrl } from '@/utils/authRedirect';

const baseApiUrl = process.env.BASE_API_URL;

export interface UpdateRendimientoCensoPayload {
    rendimiento_censo: number;
}

export interface UpdateRendimientoCensoResponse {
    success: boolean;
    detail: string;
    data: {
        departamento: string;
        codigo_departamento: string;
        nombre_departamento: string;
        rendimiento_censo: string;
        fecha_actualizacion: string;
        usuario_actualizacion: number;
    };
}

/**
 * Actualiza el rendimiento censo de un departamento
 * @param token Token de autenticación JWT
 * @param codigoDepartamento Código del departamento a actualizar
 * @param payload Datos a actualizar
 * @returns Promise con la respuesta de la actualización
 */
export const updateRendimientoCenso = async (
    token: string,
    codigoDepartamento: string,
    payload: UpdateRendimientoCensoPayload
): Promise<UpdateRendimientoCensoResponse> => {
    try {
        const response = await axios.patch(
            `${baseApiUrl}reportes/api/rendimiento-censo/${codigoDepartamento}/`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            }
        );


        if (response.data.success === false) {
            throw new Error(response.data.detail || 'Error al actualizar el rendimiento censo');
        }

        return response.data;
    } catch (error: any) {
        console.error('[updateRendimientoCenso] - Error:', error);
        
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
                throw new Error('No se encontró el departamento para actualizar');
            }

            if (error.response?.status === 500) {
                throw new Error('Error interno del servidor al actualizar el rendimiento censo');
            }
        }

        throw new Error(error.response?.data?.detail || error.message || 'No se pudo actualizar el rendimiento censo');
    }
};
