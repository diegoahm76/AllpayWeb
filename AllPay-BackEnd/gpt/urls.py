from django.urls import path
from . import views

app_name = 'gpt'

urlpatterns = [
    path('ask/', views.ask_question, name='ask_question'),
    path('status/', views.service_status, name='service_status'),
]
