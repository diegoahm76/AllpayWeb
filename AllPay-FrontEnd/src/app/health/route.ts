import { NextResponse } from 'next/server';

/**
 * Health check endpoint para ECS/Fargate
 * 
 * Este endpoint es usado por el health check de ECS para verificar
 * que la aplicación está funcionando correctamente.
 * 
 * NO incluir información sensible en la respuesta.
 */
export async function GET() {
  try {
    // Verificar variables críticas (sin exponer valores)
    const hasRequiredEnvVars = !!(
      process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY &&
      process.env.AUTH_SECRET &&
      process.env.NEXTAUTH_URL
    );

    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown',
        hasRequiredEnvVars,
        // NO exponer valores reales de variables de entorno por seguridad
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

