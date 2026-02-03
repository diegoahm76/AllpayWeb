import axios, { AxiosError, AxiosResponse } from 'axios';
import { isTokenExpiredError, showSessionExpiredAlert } from './sessionExpiredHandler';

let interceptorsConfigured = false;

/**
 * Inicializa los interceptores de Axios para manejar errores de autenticación
 * de forma global y centralizada
 */
export const initializeAxiosInterceptors = (): void => {
  if (interceptorsConfigured) {
    return;
  }

  // Interceptor para requests - agrega headers si es necesario
  axios.interceptors.request.use(
    (config) => {
      // Aquí podrías agregar el token a los headers automáticamente si lo necesitas
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Interceptor para responses - maneja errores de sesión
  axios.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      if (isTokenExpiredError(error)) {
        // Muestra la alerta de sesión expirada
        showSessionExpiredAlert();
      }

      return Promise.reject(error);
    }
  );

  interceptorsConfigured = true;
};

