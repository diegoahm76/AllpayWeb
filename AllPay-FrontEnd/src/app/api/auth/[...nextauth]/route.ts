// src/app/api/auth/[...nextauth]/route.ts
// Forma mínima recomendada por Auth.js v5 con logs mejorados para producción
import { handlers } from '@/auth';
import { NextRequest } from 'next/server';

// Wrapper para agregar logs de las peticiones de sesión
const GET = async (req: NextRequest) => {
  const url = req.url;
  const isSessionEndpoint = url.includes('/api/auth/session');
  
  if (isSessionEndpoint) {
   
    try {
      const response = await handlers.GET(req);
      return response;
    } catch (error) {
      console.error('[AUTH_ROUTE] ❌ Error en GET /api/auth/session:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
  
  return handlers.GET(req);
};

const POST = handlers.POST;

export { GET, POST };