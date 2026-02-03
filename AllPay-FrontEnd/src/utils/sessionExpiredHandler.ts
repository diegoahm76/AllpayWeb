import { signOut } from 'next-auth/react';
import { Path } from '@/application/shared/path.enum';

const TOKEN_INVALID_PATTERNS = [
  'el token dado no es valido para ningun tipo de token',
  'token invalido',
  'token inválido',
  'token expired',
  'token ha expirado',
  'token expired signature',
  'session expired',
];
const ALERT_ROOT_ID = 'alert-error-portal-root';
const ALERT_BUTTON_ID = 'btn-session-expired-accept';

let isAlertVisible = false;

/**
 * Obtiene la URL completa del login usando el dominio actual
 */
const getFullLoginUrl = (): string => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${Path.Login}`;
  }
  return Path.Login;
};

const ensureAlertRoot = (): HTMLElement | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  let alertRoot = document.getElementById(ALERT_ROOT_ID);

  if (!alertRoot) {
    alertRoot = document.createElement('div');
    alertRoot.id = ALERT_ROOT_ID;
    document.body.appendChild(alertRoot);
  }

  return alertRoot;
};

export const showSessionExpiredAlert = (): void => {
  if (typeof window === 'undefined' || isAlertVisible) {
    return;
  }

  const alertRoot = ensureAlertRoot();

  if (!alertRoot) {
    return;
  }

  isAlertVisible = true;

  alertRoot.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-transparent backdrop-blur-sm"></div>
      <div class="relative z-10">
        <div class="m-auto rounded-xl p-6 bg-slate-200">
          <div class="w-full max-w-[95vw] md:w-[500px] max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-lg relative">
            <div class="mt-4 flex flex-col items-center gap-6 pt-4 text-center">
              <div class="w-48">
                <img src="/images/corporate/logo.png" alt="Federación Nacional de Cacaoteros" style="width: 100%; height: auto;" />
              </div>
              <h2 class="text-[#562707] font-bold text-lg">SEÑOR(A) RECAUDOR(A)</h2>
              <p class="text-[#562707] font-semibold max-w-xs">Sesión Expirada, por favor vuelva a iniciar sesión</p>
              <button id="${ALERT_BUTTON_ID}" class="px-6 py-2 bg-[#562707] text-white rounded-lg hover:bg-[#78390e] transition-colors cursor-pointer">
                Aceptar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const button = document.getElementById(ALERT_BUTTON_ID);

  if (button) {
    button.addEventListener('click', handleSessionExpired, { once: true });
  }
};

export const clearSessionExpiredAlert = (): void => {
  if (typeof document === 'undefined') {
    return;
  }

  const alertRoot = document.getElementById(ALERT_ROOT_ID);

  if (alertRoot) {
    alertRoot.innerHTML = '';
  }

  isAlertVisible = false;
};

export const handleSessionExpired = async (): Promise<void> => {
  clearSessionExpiredAlert();

  try {
    // Limpia almacenamiento local
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }

    const loginUrl = getFullLoginUrl();
    
    // Cierra sesión con la URL correcta
    await signOut({ 
      redirect: false,
      callbackUrl: loginUrl
    });

    // Pequeño delay para asegurar que se complete el signOut
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.href = loginUrl;
      }
    }, 100);
  } catch (error) {
    console.error('Error al cerrar sesión tras vencimiento de token:', error);
    // Forzar redirección incluso si hay error
    if (typeof window !== 'undefined') {
      window.location.href = getFullLoginUrl();
    }
  }
};

const normalizeString = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

const extractDetailMessage = (data: any): string => {
  if (!data) {
    return '';
  }

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data?.detail === 'string') {
    return data.detail;
  }

  if (typeof data?.detail?.detail === 'string') {
    return data.detail.detail;
  }

  return '';
};

export const isTokenExpiredError = (error: any): boolean => {
  const response = error?.response;

  if (!response) {
    return false;
  }

  const { status, data, headers } = response;

  const detailMessage = normalizeString(extractDetailMessage(data));

  if (detailMessage) {
    const matchesPattern = TOKEN_INVALID_PATTERNS.some((pattern) =>
      detailMessage.includes(normalizeString(pattern))
    );

    if (matchesPattern) {
      return true;
    }
  }

  const wwwAuthenticate = typeof headers?.['www-authenticate'] === 'string'
    ? headers['www-authenticate'].toLowerCase()
    : '';

  if (wwwAuthenticate.includes('invalid_token') || wwwAuthenticate.includes('error="invalid_token"')) {
    return true;
  }

  if (status !== 401) {
    return false;
  }

  if (data?.code && typeof data.code === 'string') {
    const code = normalizeString(data.code);
    if (['token_not_valid', 'token_expired', 'credentials_invalid'].includes(code)) {
      return true;
    }
  }

  if (detailMessage) {
    return TOKEN_INVALID_PATTERNS.some((pattern) =>
      detailMessage.includes(normalizeString(pattern))
    );
  }

  return false;
};

