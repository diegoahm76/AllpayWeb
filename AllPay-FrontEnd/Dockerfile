# Selecciona la imagen base, en este caso, una imagen de node
FROM node:22.13.1-alpine

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos de configuración del proyecto
COPY package.json ./

# Instala las dependencias
RUN npm install

# Copia el resto del código de la aplicación
COPY . .

# Copia el archivo .env dentro del contenedor
COPY .env .env

# Genera la compilación de producción
RUN npm run build

# Expone el puerto en el que la aplicación se ejecutará
EXPOSE 3000

# NOTA: Aunque hay un warning sobre standalone, npm start funciona correctamente
# porque Next.js maneja automáticamente las rutas de archivos estáticos
# El warning es solo informativo y no afecta la funcionalidad
CMD ["npm", "start"]