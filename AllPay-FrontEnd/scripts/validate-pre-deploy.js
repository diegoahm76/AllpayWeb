#!/usr/bin/env node

/**
 * Script de validación pre-deploy para Next.js en ECS/Fargate
 * Verifica que todas las variables de entorno críticas estén configuradas
 * 
 * Uso:
 *   npm run validate:pre-deploy
 * 
 * O directamente:
 *   node scripts/validate-pre-deploy.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

let errors = 0;
let warnings = 0;

// Detectar si estamos en desarrollo o producción
const nodeEnv = process.env.NODE_ENV || 'development';
const isDevelopment = nodeEnv !== 'production';
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

function checkEnvVar(varName, required = true) {
  const value = process.env[varName];
  
  if (!value || value.trim() === '') {
    if (isDevelopment && !isCI) {
      // En desarrollo local, solo mostrar advertencia
      console.warn(`⚠️  ADVERTENCIA: ${varName} no está definida (requerida en producción)`);
      warnings++;
      return false;
    } else {
      // En producción o CI, mostrar error
      console.error(`❌ ERROR: ${varName} no está definida`);
      errors++;
      return false;
    }
  } else {
    console.log(`✅ ${varName} está definida`);
    return true;
  }
}

function checkKeyLength(varName, minLength = 40) {
  const value = process.env[varName];
  if (!value) {
    return false; // Ya se reportó en checkEnvVar
  }
  
  if (value.length < minLength) {
    if (isDevelopment && !isCI) {
      console.warn(`⚠️  ADVERTENCIA: ${varName} parece ser muy corta (debe ser ~44 caracteres, actual: ${value.length})`);
      warnings++;
      return false;
    } else {
      console.error(`❌ ERROR: ${varName} parece ser muy corta (debe ser ~44 caracteres, actual: ${value.length})`);
      errors++;
      return false;
    }
  } else {
    console.log(`✅ ${varName} tiene longitud adecuada`);
    return true;
  }
}

console.log('\n🔍 Validando configuración pre-deploy...\n');

if (isDevelopment && !isCI) {
  console.log('ℹ️  Modo desarrollo detectado - las variables de entorno son opcionales aquí\n');
  console.log('   Las variables deben estar configuradas en producción/ECS\n');
}

// Variables críticas requeridas
console.log('📋 Verificando variables de entorno críticas...');
checkEnvVar('NEXT_SERVER_ACTIONS_ENCRYPTION_KEY');
checkEnvVar('AUTH_SECRET');
checkEnvVar('NEXTAUTH_URL');
checkEnvVar('BASE_URL');
checkEnvVar('BASE_API_URL');

if (nodeEnv !== 'production') {
  if (isDevelopment && !isCI) {
    console.log(`ℹ️  NODE_ENV es '${nodeEnv}' (normal en desarrollo)`);
  } else {
    console.warn(`⚠️  ADVERTENCIA: NODE_ENV no es 'production' (actual: ${nodeEnv})`);
    warnings++;
  }
} else {
  console.log(`✅ NODE_ENV es 'production'`);
}

// Verificar longitudes de claves
console.log('\n🔐 Verificando formato de claves...');
checkKeyLength('NEXT_SERVER_ACTIONS_ENCRYPTION_KEY');
checkKeyLength('AUTH_SECRET');

// Verificar que NEXTAUTH_URL y BASE_URL coincidan
const nextAuthUrl = process.env.NEXTAUTH_URL;
const baseUrl = process.env.BASE_URL;

if (nextAuthUrl && baseUrl) {
  if (nextAuthUrl !== baseUrl) {
    console.warn(`\n⚠️  ADVERTENCIA: NEXTAUTH_URL y BASE_URL no coinciden`);
    console.warn(`   NEXTAUTH_URL: ${nextAuthUrl}`);
    console.warn(`   BASE_URL: ${baseUrl}`);
    console.warn(`   Esto puede causar problemas de autenticación`);
    warnings++;
  } else {
    console.log(`✅ NEXTAUTH_URL y BASE_URL coinciden`);
  }
}

// Verificar next.config.mjs
console.log('\n📄 Verificando next.config.mjs...');
try {
  const configPath = join(projectRoot, 'next.config.mjs');
  const configContent = readFileSync(configPath, 'utf-8');
  
  if (configContent.includes("output: 'standalone'") || configContent.includes('output: "standalone"')) {
    console.log("✅ next.config.mjs tiene output: 'standalone' configurado");
  } else {
    console.error("❌ ERROR: next.config.mjs NO tiene output: 'standalone' configurado");
    console.error("   Esto es crítico para ECS/Fargate");
    errors++;
  }
} catch (error) {
  console.error(`❌ ERROR: No se pudo leer next.config.mjs: ${error.message}`);
  errors++;
}

// Verificar health check endpoint
console.log('\n🏥 Verificando health check endpoint...');
try {
  const healthPath = join(projectRoot, 'src', 'app', 'health', 'route.ts');
  const healthContent = readFileSync(healthPath, 'utf-8');
  console.log("✅ Health check endpoint existe (src/app/health/route.ts)");
} catch (error) {
  console.warn("⚠️  ADVERTENCIA: Health check endpoint no encontrado");
  console.warn("   Se recomienda crear src/app/health/route.ts para ECS health checks");
  warnings++;
}

// Resumen
console.log('\n' + '='.repeat(50));

if (isDevelopment && !isCI) {
  // En desarrollo, solo mostrar resumen informativo
  if (errors === 0 && warnings === 0) {
    console.log('✅ Validación completada - Todo está correcto');
  } else if (errors === 0) {
    console.log(`✅ Validación completada con ${warnings} advertencia(s)`);
    console.log('\nℹ️  Las advertencias son normales en desarrollo.');
    console.log('   Asegúrate de configurar las variables en producción/ECS.');
  } else {
    console.error(`❌ Validación falló con ${errors} error(es) y ${warnings} advertencia(s)`);
    console.log('\nPor favor, corrige los errores antes de desplegar');
  }
  // En desarrollo, siempre salir con código 0 (éxito) a menos que haya errores críticos de código
  process.exit(0);
} else {
  // En producción o CI, ser estricto
  if (errors === 0 && warnings === 0) {
    console.log('✅ Validación completada sin errores ni advertencias');
    process.exit(0);
  } else {
    if (errors > 0) {
      console.error(`❌ Validación falló con ${errors} error(es)`);
    }
    if (warnings > 0) {
      console.warn(`⚠️  Se encontraron ${warnings} advertencia(s)`);
    }
    console.log('\nPor favor, corrige los errores antes de desplegar');
    process.exit(errors > 0 ? 1 : 0);
  }
}

