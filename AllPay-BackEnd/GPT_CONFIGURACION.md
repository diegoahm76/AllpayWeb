# 🤖 Configuración del Servicio GPT Assistant

Este documento describe la configuración necesaria para el servicio de asistente GPT que utiliza RAG (Retrieval-Augmented Generation) con múltiples archivos y auto-continue.

## 📋 Variables de Entorno Requeridas

### Variables Obligatorias

#### `OPENAI_API_KEY`
- **Descripción**: Clave API de OpenAI para autenticación
- **Formato**: String (OPENAI_API_KEY=REEMPLAZAR_EN_ENV_O_SECRETS...)
- **Ejemplo**: `OPENAI_API_KEY=OPENAI_API_KEY=REEMPLAZAR_EN_ENV_O_SECRETS`
- **Requerida**: ✅ Sí

#### `OPENAI_FILE_IDS`
- **Descripción**: IDs de los archivos a indexar en el Vector Store, separados por comas
- **Formato**: String con IDs separados por comas
- **Ejemplo**: `OPENAI_FILE_IDS=file-A8tcJ7BiXPsjKQqhXZMvpP,file-H1cyjLSWbZsaz5qXBetFcs,file-VL5NKQL1wMQ5JQd8GAkixv`
- **Requerida**: ✅ Sí

### Variables Opcionales (con valores por defecto)

#### `OPENAI_MODEL`
- **Descripción**: Modelo de OpenAI a utilizar
- **Valor por defecto**: `gpt-5-mini`
- **Ejemplo**: `OPENAI_MODEL=gpt-5-mini`

#### `OPENAI_REASONING_EFFORT`
- **Descripción**: Nivel de esfuerzo de razonamiento del modelo
- **Valores posibles**: `low`, `medium`, `high`
- **Valor por defecto**: `low`
- **Ejemplo**: `OPENAI_REASONING_EFFORT=medium`

#### `OPENAI_MAX_OUTPUT_TOKENS`
- **Descripción**: Número máximo de tokens por llamada individual (el auto-continue puede generar más)
- **Valor por defecto**: `2000`
- **Ejemplo**: `OPENAI_MAX_OUTPUT_TOKENS=2000`

#### `OPENAI_MAX_CONTINUATIONS`
- **Descripción**: Número máximo de continuaciones automáticas si la respuesta se corta
- **Valor por defecto**: `4`
- **Ejemplo**: `OPENAI_MAX_CONTINUATIONS=4`

#### `OPENAI_VECTOR_STORE_NAME`
- **Descripción**: Nombre del Vector Store en OpenAI
- **Valor por defecto**: `kb: manual allpay`
- **Ejemplo**: `OPENAI_VECTOR_STORE_NAME=kb: manual fedecacao`

#### `OPENAI_FORCE_NEW_VS`
- **Descripción**: Forzar creación de un nuevo Vector Store (ignorar caché)
- **Valor por defecto**: `False`
- **Valores posibles**: `true`, `false`
- **Ejemplo**: `OPENAI_FORCE_NEW_VS=false`

## 📝 Ejemplo de Configuración Completa (.env)

```bash
# ============================================
# OPENAI GPT ASSISTANT - CONFIGURACIÓN
# ============================================

# 🔴 OBLIGATORIO: Clave API de OpenAI
OPENAI_API_KEY=OPENAI_API_KEY=REEMPLAZAR_EN_ENV_O_SECRETS

# 🔴 OBLIGATORIO: IDs de archivos a indexar (separados por comas)
OPENAI_FILE_IDS=file-A8tcJ7BiXPsjKQqhXZMvpP,file-H1cyjLSWbZsaz5qXBetFcs,file-VL5NKQL1wMQ5JQd8GAkixv,file-Tp8YrueX8dvQRC6t2Yp9yp,file-LiGH8rtixy4vJ926bdQb8j,file-4XwCW5eZCVbHQEgXD46uqa,file-2H1zivnGPgZzTBcK8Bekud

# Opcional: Modelo a utilizar
OPENAI_MODEL=gpt-5-mini

# Opcional: Nivel de razonamiento
OPENAI_REASONING_EFFORT=low

# Opcional: Tokens máximos por llamada
OPENAI_MAX_OUTPUT_TOKENS=2000

# Opcional: Máximo de continuaciones
OPENAI_MAX_CONTINUATIONS=4

# Opcional: Nombre del Vector Store
OPENAI_VECTOR_STORE_NAME=kb: manual allpay

# Opcional: Forzar nuevo Vector Store
OPENAI_FORCE_NEW_VS=false
```

## 🚀 Características Principales

### 1. **RAG Multi-Archivo**
- Soporta múltiples archivos en un solo Vector Store
- Sincronización automática de archivos
- Metadatos de archivos cacheados

### 2. **Auto-Continue**
- Si la respuesta se corta por límite de tokens, automáticamente continúa
- Usa sentinelas `<END/>` y `<CONT/>` para detectar truncamiento
- Máximo de continuaciones configurable

### 3. **Caché Inteligente**
- Caché SQLite para respuestas completas (no parciales)
- TTL de 24 horas por defecto
- Clave de caché basada en pregunta, archivos, modelo y configuración

### 4. **HTTP Puro**
- No utiliza SDK de OpenAI, solo requests HTTP
- Mayor control sobre parámetros
- Manejo de errores mejorado

## 📂 Archivos Generados

El servicio crea automáticamente los siguientes archivos en `BASE_DIR`:

- `vector_store_id.txt`: ID del Vector Store (para evitar recrearlo)
- `file_meta_cache.json`: Metadatos de archivos (ID → nombre)
- `gpt_cache.db`: Base de datos SQLite con respuestas cacheadas

## 🔍 Verificación del Estado

Puedes verificar el estado del servicio usando el endpoint:

```bash
GET /apii/gpt/status/
```

Respuesta de ejemplo:
```json
{
  "status": "active",
  "model": "gpt-5-mini",
  "api_key_configured": true,
  "files_configured": true,
  "file_count": 7,
  "file_ids": ["file-A8tcJ7BiXPsjKQqhXZMvpP", "file-H1cyjLSWbZsaz5qXBetFcs", ...],
  "vector_store_name": "kb: manual allpay",
  "vector_store_id": "vs_xxxxxxxxxxxxx",
  "reasoning_effort": "low",
  "max_output_tokens": 2000,
  "max_continuations": 4
}
```

## 🐛 Solución de Problemas

### Error: "OPENAI_API_KEY no está configurada"
- Verifica que la variable esté en el archivo `.env`
- Asegúrate de que el archivo `.env` esté cargado (usa `python-dotenv`)

### Error: "No hay archivos configurados"
- Verifica que `OPENAI_FILE_IDS` contenga al menos un ID válido
- Los IDs deben estar separados por comas, sin espacios extra

### Vector Store no se crea
- Verifica que la API key tenga permisos para crear Vector Stores
- Revisa los logs para ver errores específicos de la API

### Respuestas vacías
- Verifica que los archivos estén correctamente indexados en el Vector Store
- Usa el endpoint `/apii/gpt/status/` para verificar el estado

## 📚 API Endpoints

### POST `/apii/gpt/ask/`
Hace una pregunta al asistente GPT.

**Body:**
```json
{
  "question": "¿Cómo registro un nuevo usuario?",
  "max_output_tokens": 800
}
```

**Response:**
```json
{
  "answer": "Para registrar un nuevo usuario...",
  "sources": [
    {
      "marker": "[1]",
      "file": "manual_usuario.pdf",
      "file_id": "file-A8tcJ7BiXPsjKQqhXZMvpP"
    }
  ],
  "processing_time": 2.45
}
```

### GET `/apii/gpt/status/`
Verifica el estado del servicio GPT.

## 🔐 Seguridad

- **NUNCA** commitees el archivo `.env` con las API keys
- Las API keys deben rotarse periódicamente
- Usa diferentes keys para desarrollo y producción
- Considera usar un gestor de secretos en producción (AWS Secrets Manager, etc.)

