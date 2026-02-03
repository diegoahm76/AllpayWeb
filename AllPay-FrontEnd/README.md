# FedecacaoFront

## Descripción del Proyecto

FedecacaoFront es una aplicación web desarrollada para la Federación Nacional de Cacaoteros. Esta aplicación permite a los usuarios registrarse, iniciar sesión, recuperar contraseñas y acceder a diversas funcionalidades relacionadas con la gestión de usuarios y recaudos.

## Onboarding del Proyecto

### Requisitos Previos

###### Antes de comenzar, asegúrate de tener instalados los siguientes requisitos:

- Node.js (versión 14 o superior)
- npm (versión 6 o superior) o yarn (versión 1.22 o superior)

### Instalación

1. Clona el repositorio:

```sh
git clone https://github.com/tu-usuario/FedecacaoFront.git
```
2. Navega al directorio del proyecto:

```sh
cd FedecacaoFront
```

3. Instala las dependencias:

```sh
npm install
# o
yarn install
```

### Configuración

1. Crea un archivo .env en la raíz del proyecto y agrega las siguientes variables de entorno:

```sh
NODE_ENV=development
BASE_API_URL=https://api.example.com
AUTH_SECRET=your_auth_secret
CAPCHA_API=your_capcha_api_key
CAPCHA_API_SECRET=your_capcha_api_secret
```

### Ejecución del Proyecto
Para iniciar el servidor de desarrollo, ejecuta:

```sh
npm run dev
# o
yarn dev
```

Abre http://localhost:3000 en tu navegador para ver la aplicación.

### Estructura del Proyecto

La estructura del proyecto es la siguiente:


```sh
FedecacaoFront/
├── public/                     # Archivos públicos
├── src/                        # Código fuente de la aplicación
│   ├── adapters/               # Adaptadores y utilidades compartidas
│   ├── application/            # Lógica de negocio y recursos
│   ├── domain/                 # Tipos y entidades del dominio
│   ├── presenters/             # Componentes de presentación y vistas
│   │   ├── components/         # Componentes reutilizables
│   │   │   ├── layouts/        # Layouts de la aplicación
│   │   │   ├── modules/        # Módulos específicos (auth, dashboard, etc.)
│   │   │   ├── shared/         # Componentes compartidos
│   ├── app/                    # Páginas y rutas de Next.js
│   ├── environment.ts          # Variables de entorno
├── .env                        # Archivo de configuración de entorno
├── README.md                   # Documentación del proyecto
├── package.json                # Dependencias y scripts del proyecto
├── tsconfig.json               # Configuración de TypeScript

```

Fuente: https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html

### Documentación del Proyecto

##### Componentes Principales

Login: Componente para el inicio de sesión de usuarios.
Register: Componente para el registro de nuevos usuarios.
Recovery: Componente para la recuperación de contraseñas.
Unlocked: Componente para el desbloqueo de cuentas de usuario.


##### Scripts Disponibles

npm run dev / yarn dev: Inicia el servidor de desarrollo.
npm run build / yarn build: Compila la aplicación para producción.
npm start / yarn start: Inicia la aplicación en modo producción.
npm run lint / yarn lint: Ejecuta el linter para verificar el código.


### Recomendacion de gitflow

Por cada requerimiento Crea una nueva rama (git checkout -b feature/nueva-funcionalidad).
Realiza tus cambios y haz commit (git commit -am 'Añadir nueva funcionalidad').
Sube tus cambios (git push origin feature/nueva-funcionalidad).
Abre un Pull Request en el repositorio.