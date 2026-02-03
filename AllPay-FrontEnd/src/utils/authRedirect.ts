const DEFAULT_LOGIN_REDIRECT = '/auth/signin';

const loginRedirectUrl =
  process.env.NEXT_PUBLIC_LOGIN_REDIRECT_URL?.trim() || DEFAULT_LOGIN_REDIRECT;

export const getLoginRedirectUrl = (): string => loginRedirectUrl;

/**
 * Construye la URL completa del login usando el origen actual del navegador
 * @returns URL completa del login (ej: https://allpayfedecacao.com/auth/signin)
 */
export const getFullLoginUrl = (): string => {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const loginPath = getLoginRedirectUrl();
  return currentOrigin ? `${currentOrigin}${loginPath}` : loginPath;
};

/**
 * Construye una URL completa usando el origen actual del navegador
 * @param path Ruta relativa (ej: '/auth/signin' o '/')
 * @returns URL completa (ej: https://allpayfedecacao.com/auth/signin)
 */
export const getFullUrl = (path: string): string => {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  return currentOrigin ? `${currentOrigin}${path}` : path;
};

