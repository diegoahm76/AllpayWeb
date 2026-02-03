#!/bin/bash

# Script de validación pre-deploy para Next.js en ECS/Fargate
# Verifica que todas las variables de entorno críticas estén configuradas

set -e

echo "🔍 Validando configuración pre-deploy..."

ERRORS=0

# Función para verificar variable de entorno
check_env_var() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [ -z "$var_value" ]; then
        echo "❌ ERROR: $var_name no está definida"
        ERRORS=$((ERRORS + 1))
    else
        echo "✅ $var_name está definida"
    fi
}

# Variables críticas requeridas
echo ""
echo "📋 Verificando variables de entorno críticas..."
check_env_var "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"
check_env_var "AUTH_SECRET"
check_env_var "NEXTAUTH_URL"
check_env_var "BASE_URL"
check_env_var "BASE_API_URL"
check_env_var "NODE_ENV"

# Verificar que NEXT_SERVER_ACTIONS_ENCRYPTION_KEY tenga el formato correcto
if [ ! -z "$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY" ]; then
    KEY_LENGTH=${#NEXT_SERVER_ACTIONS_ENCRYPTION_KEY}
    if [ $KEY_LENGTH -lt 40 ]; then
        echo "❌ ERROR: NEXT_SERVER_ACTIONS_ENCRYPTION_KEY parece ser muy corta (debe ser ~44 caracteres)"
        ERRORS=$((ERRORS + 1))
    else
        echo "✅ NEXT_SERVER_ACTIONS_ENCRYPTION_KEY tiene longitud adecuada"
    fi
fi

# Verificar que AUTH_SECRET tenga el formato correcto
if [ ! -z "$AUTH_SECRET" ]; then
    SECRET_LENGTH=${#AUTH_SECRET}
    if [ $SECRET_LENGTH -lt 40 ]; then
        echo "❌ ERROR: AUTH_SECRET parece ser muy corta (debe ser ~44 caracteres)"
        ERRORS=$((ERRORS + 1))
    else
        echo "✅ AUTH_SECRET tiene longitud adecuada"
    fi
fi

# Verificar que NEXTAUTH_URL y BASE_URL coincidan
if [ ! -z "$NEXTAUTH_URL" ] && [ ! -z "$BASE_URL" ]; then
    if [ "$NEXTAUTH_URL" != "$BASE_URL" ]; then
        echo "⚠️  ADVERTENCIA: NEXTAUTH_URL y BASE_URL no coinciden"
        echo "   NEXTAUTH_URL: $NEXTAUTH_URL"
        echo "   BASE_URL: $BASE_URL"
        echo "   Esto puede causar problemas de autenticación"
    else
        echo "✅ NEXTAUTH_URL y BASE_URL coinciden"
    fi
fi

# Verificar que NODE_ENV sea production en producción
if [ "$NODE_ENV" != "production" ]; then
    echo "⚠️  ADVERTENCIA: NODE_ENV no es 'production' (actual: $NODE_ENV)"
fi

# Verificar que next.config.mjs tenga output: 'standalone'
if grep -q "output.*standalone" next.config.mjs 2>/dev/null || grep -q "output: 'standalone'" next.config.mjs 2>/dev/null; then
    echo "✅ next.config.mjs tiene output: 'standalone' configurado"
else
    echo "❌ ERROR: next.config.mjs NO tiene output: 'standalone' configurado"
    echo "   Esto es crítico para ECS/Fargate"
    ERRORS=$((ERRORS + 1))
fi

# Verificar que existe el health check endpoint
if [ -f "src/app/health/route.ts" ]; then
    echo "✅ Health check endpoint existe (src/app/health/route.ts)"
else
    echo "⚠️  ADVERTENCIA: Health check endpoint no encontrado"
    echo "   Se recomienda crear src/app/health/route.ts para ECS health checks"
fi

# Resumen
echo ""
if [ $ERRORS -eq 0 ]; then
    echo "✅ Validación completada sin errores"
    exit 0
else
    echo "❌ Validación falló con $ERRORS error(es)"
    echo ""
    echo "Por favor, corrige los errores antes de desplegar"
    exit 1
fi

