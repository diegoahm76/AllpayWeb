import axios from 'axios';
import { signOut } from 'next-auth/react';
import { getFullLoginUrl } from '@/utils/authRedirect';
import { 
  TableroProduccionDepartamentosResponse, 
  ParamsTableroProduccion 
} from '../models/tablero-produccion-departamentos.models';

const baseApiUrl = process.env.BASE_API_URL;

export async function fetchTableroProduccionDepartamentos(
  token: string, 
  params: ParamsTableroProduccion
): Promise<TableroProduccionDepartamentosResponse> {
  try {
    const response = await axios.get(
      `${baseApiUrl}reportes/api/tablero11/produccion-departamentos/`, 
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        params: {
          ano: params.ano,
          estimacion: params.estimacion,
          rendimiento_prom_nal: params.rendimiento_prom_nal
        }
      }
    );

    if (response.data.success === false) {
      throw new Error(response.data.detail || 'Error al obtener datos de producción por departamentos');
    }

    return response.data;
  } catch (error: any) {
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
        throw new Error('No se encontró el reporte de producción por departamentos');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Error interno del servidor');
      }
    }
    
    throw new Error('No se pudo obtener los datos de producción por departamentos');
  }
}
