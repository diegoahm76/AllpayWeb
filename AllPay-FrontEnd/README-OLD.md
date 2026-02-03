# Fedecacao Ambiente Front

Este proyecto tiene como objetivo generar el sistema de recaudo de la federacion nacional de cacaoteros

## 📝 Estructura del Proyecto

Este repositorio contiene el código fuente del frontend de **FedecacaoFront** utilizando **Next.js** con **TypeScript**.

### 📂 **Frontend**

- **Código fuente del frontend (Next.js)**:
    - **📂 public**: Archivos estáticos
    - **📂 src**: Código fuente
        - **📂 components**: Componentes reutilizables
            - **📂 ui**: Botones, inputs, modales
            - **📂 layout**: Headers, footers, sidebars
        - **📂 modules**: Features específicas (ej: auth, dashboard)
        - **📂 hooks**: Custom Hooks reutilizables
        - **📂 lib**: Lógica compartida como clientes API
            - **api.ts**: Cliente para consumir la API de Django
        - **📂 pages**: Páginas de Next.js
            - **index.tsx**: Página principal
            - **_app.tsx**: Configuración global
        - **📂 providers**: Context API para estados globales
        - **📂 store**: Gestión de estado global (Redux/Zustand)
        - **📂 styles**: Estilos globales y temas
        - **📂 utils**: Funciones auxiliares y constantes
        - **📂 types**: Definiciones de TypeScript
    - **next.config.js**: Configuración de Next.js
    - **tsconfig.json**: Configuración de TypeScript
    - **package.json**: Dependencias de Next.js
    - **Dockerfile**: Dockerización del frontend
    - **.env.local**: Variables de entorno

---

## 📋 **Buenas Prácticas de Commits**

### 1️⃣ **Mensajes de Commit Claros y Concisos**

El mensaje de commit debe ser descriptivo, pero a la vez conciso. Es recomendable seguir esta estructura:

- **Línea 1**: Resumen breve de lo que hace el commit (máximo 50 caracteres).
- **Línea 2**: (Opcional) Espacio en blanco para separar el encabezado del cuerpo.
- **Líneas siguientes**: Explicación detallada si es necesario (hasta 72 caracteres por línea).

**Ejemplo:**
```bash
Agrega validación de formularios en la página de login

Se añadió validación con React Hook Form y Zod para asegurar que
los campos de usuario y contraseña sean válidos antes de enviar el formulario.
```


### 2️⃣ **Usar Convenciones en los Mensajes de Commit**
Es útil establecer una convención para el formato de los mensajes de commit. Algunas de las convenciones más comunes incluyen:

- **feat**: Nueva característica.
- **fix**: Corrección de errores.
- **chore**: Tareas generales como la limpieza de código, configuraciones, dependencias.
- **docs**: Cambios en la documentación.
- **style**: Cambios de formato, espacios en blanco, puntos y comas, sin cambios de funcionalidad.
- **refactor**: Refactorización de código (sin cambios en la funcionalidad).
- **test**: Agregar pruebas o modificar las existentes.

### 3️⃣ **Comentar Cambios Importantes en el Código**
Cuando un commit realiza un cambio significativo o afecta una parte crítica del código, es importante agregar un comentario que explique el "por qué" detrás del cambio, no solo el "qué". Esto es especialmente útil en proyectos colaborativos.

**Ejemplo:**
```bash
fix: Soluciona el error de autenticación con JWT

Se corrigió un problema de autenticación al agregar un encabezado 'Authorization' correctamente.
Este cambio es necesario debido a que la API de backend requiere una autenticación JWT.
```

### 4️⃣ **Realizar Commits Relacionados con una Tarea Específica**
Si estás trabajando en una funcionalidad o bug específico, es útil que los commits se alineen con esa tarea o historia. Si usas una herramienta de gestión de proyectos como Jira, puedes incluir el ID de la tarea en el mensaje.

**Ejemplo:**
```bash
feat: Añade funcionalidad de búsqueda de productos (JIRA-1234)
```

### 📦 **Instalación**
Para instalar las dependencias y configurar el entorno de desarrollo, sigue estos pasos:

1. **Clona el repositorio:**
```bash
git clone https://github.com/tu_usuario/fedecacaofront.git
```

2. **Navega al directorio del proyecto:**
```bash
cd fedecacaofront
```

3. **Instala las dependencias:**
```bash
yarn install
```
4. **Inicia el servidor de desarrollo:**
```bash
yarn run dev
```