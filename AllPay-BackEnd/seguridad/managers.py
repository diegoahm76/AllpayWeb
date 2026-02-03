from django.contrib.auth.base_user import BaseUserManager
from django.utils.translation import gettext as _

class CustomUserManager(BaseUserManager):
    """
    Custom user model manager where email is the unique identifier
    for authentication instead of usernames.
    """

    def create_user(self, nombre_de_usuario, password, **extra_fields):
        if not nombre_de_usuario:
            raise ValueError(_('Users must have an email address'))
        user = self.model(nombre_de_usuario=str(nombre_de_usuario).lower(), **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, nombre_de_usuario, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))
        return self.create_user(str(nombre_de_usuario).lower(), password, **extra_fields)