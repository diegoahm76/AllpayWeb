# Usa la imagen base de Python 3.12.9
FROM python:3.12.9-slim

# Crea un usuario y un grupo para la aplicación
#RUN groupadd -g 1001 app && useradd -u 1001 -g app app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libreoffice \
    libpq-dev \
    build-essential \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

# Define una variable para la ruta de tu proyecto
ENV DockerHOME=/home/app/fedecacaobackend

# Crea el directorio de la aplicación y asigna permisos
RUN mkdir -p $DockerHOME
#RUN chown -R app:app $DockerHOME

# Define el directorio de trabajo
WORKDIR $DockerHOME

# Evita la creación de archivos .pyc y habilita logs "unbuffered"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Actualiza pip
RUN pip install --upgrade pip

# Copia solo requirements.txt para aprovechar la caché de Docker
COPY requirements.txt .

# Instala las dependencias (asegúrate de que gunicorn esté en requirements.txt)
RUN pip install --no-cache-dir -r requirements.txt

# Copia el resto de tu código al contenedor
COPY . .

# Ajusta nuevamente la propiedad al usuario no-root
#RUN chown -R app:app $DockerHOME

# Cambia al usuario "app"
#USER app

# Expone el puerto 8000
EXPOSE 8000

# Arranca Gunicorn apuntando a tu aplicación Django.
# CMD ["gunicorn", "--bind", "0.0.0.0:8000", "backend.wsgi:application", "--workers", "4", "--threads", "2", "--worker-class", "gthread"]
CMD ["gunicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--threads", "2", "--worker-class", "gthread", "--timeout", "1200", "--graceful-timeout", "1200", "--keep-alive", "300", "--access-logfile", "-", "--error-logfile", "-", "--log-level", "info", "--max-requests", "2000", "--max-requests-jitter", "300", "--worker-tmp-dir", "/dev/shm"]
# CMD ["gunicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--threads", "2", "--worker-class", "gthread","--timeout", "900", "--graceful-timeout", "900", "--keep-alive", "75","--access-logfile", "-","--error-logfile", "-","--log-level", "info","--max-requests", "2000", "--max-requests-jitter", "200","--worker-tmp-dir", "/dev/shm"]