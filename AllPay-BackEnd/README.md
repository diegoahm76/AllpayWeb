# Fedecacao Ambiente Back

Este proyecto tiene como objetivo generar el sistema de recaudo de la federacion nacional de cacaoteros

## 📝 Estructura del Proyecto

Este repositorio contiene el código fuente del frontend de **FedecacaoFront** utilizando **Next.js** con **TypeScript**.

### 📂 **Backend**

- **Código fuente del frontend (Next.js)**:
    - **📂 backend**
      - **📂 asgi.py** 
      - **📂 settings.py.py** 
      - **📂 urls.py** 
      - **📂 wsgi.py** 
    - **📂 recaudo** 
    - - **📂 admin.py** 
      - **📂 apps.py** 
      - **📂 models.py** 
      - **📂 test.py** 
      - **📂 utils.py** 
      - **📂 vews.py** 
    - **📂 seguridad** 
    - - **📂 admin.py** 
      - **📂 apps.py** 
      - **📂 test.py** 
      - **📂 utils.py** 
    - **.env** 
    - **gitignore** 
    - **manage.py** 
    - **Readme.md**
    - **requirements** 

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
git clone https://github.com/DesarrolloIsamc/FedecacaoBack.git
```

2. **Crea un entorno virtual:**
```bash
python3 -m venv venv
source venv/bin/activate  # En Windows usa `venv\Scripts\activate`
```

3. **Instala las dependencias:**
```bash
pip install -r requirements.txt
```
4. **Aplica las migraciones:**
```bash
python manage.py migrate
```
5. **Inicia el servidor de desarrollo:**
```bash
python manage.py runserver
```
### **Uso**
Para poder usar las Api debe:

### **Obtener todos los recursos**
```bash
curl -X GET http://127.0.0.1:8000/api/recursos/
```

### **Crear un nuevo recurso**
```bash
curl -X POST http://127.0.0.1:8000/api/recursos/ -d '{"nombre": "Ejemplo", "descripcion": "Esto es un ejemplo"}' -H "Content-Type: application/json"
```

### **Autenticación**

Para obtener un token JWT:

```bash
curl -X POST http://127.0.0.1:8000/api/token/ -d '{"username": "tu_usuario", "password": "tu_contraseña"}' -H "Content-Type: application/json"
```