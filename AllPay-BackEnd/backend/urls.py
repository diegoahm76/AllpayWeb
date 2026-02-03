"""backend URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf.urls.static import static
from django.conf import settings
urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", include("seguridad.urls.health_urls")),

    #USUARIOS
    path('apii/users/', include('seguridad.urls.user_urls')),
    path('apii/auditorias/', include('seguridad.urls.auditoria_urls')),
    path('apii/roles/', include('seguridad.urls.roles_urls')),
    path('apii/personas/', include('seguridad.urls.personas_urls')), 
    path('apii/permisos/', include('seguridad.urls.permisos_urls')),
    path('apii/choices/', include('seguridad.urls.choices_urls')),

    #RECAUDO
    path('apii/choices/', include('recaudos.urls.choices_urls')),
    path('apii/recaudos/', include('recaudos.urls.recaudos_urls')),
    path('apii/cartera/', include('recaudos.urls.cartera_urls')),

    #REPORTES
    path('apii/reportes/', include('reportes.urls.reportes_urls')),

    #DOCUMENTOS
    path('apii/documentos/', include('recaudos.urls.documentos_urls')),

    #ALERTAS
    path('apii/alertas/', include('seguridad.urls.alertas_urls')),

    #GPT ASSISTANT
    path('apii/gpt/', include('gpt.urls')),

]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
