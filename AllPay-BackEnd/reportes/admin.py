from django.contrib import admin
from .models import TRM, BolsaNY, Department, Municipality, ProduccionCacaoHistorico, ProduccionDepartamentoAnual, RendimientoCensoDepartamento


@admin.register(TRM)
class TRMAdmin(admin.ModelAdmin):
    list_display = ('idregistro', 'fecha_registro', 'precio_trm', 'anio', 'mes', 'usuario_que_registra')
    list_filter = ('anio', 'mes', 'fecha_registro')
    search_fields = ('usuario_que_registra__username', 'usuario_que_registra__first_name', 'usuario_que_registra__last_name')
    date_hierarchy = 'fecha_registro'
    ordering = ('-fecha_registro',)
    
    fieldsets = (
        ('Información Principal', {
            'fields': ('fecha_registro', 'precio_trm')
        }),
        ('Información del Usuario', {
            'fields': ('usuario_que_registra',)
        }),
        ('Información Adicional', {
            'fields': ('anio', 'mes'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('anio', 'mes')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('usuario_que_registra')


@admin.register(BolsaNY)
class BolsaNYAdmin(admin.ModelAdmin):
    list_display = ('idregistro', 'fecha_registro', 'precio_cierre', 'anio', 'mes', 'idusuario')
    list_filter = ('anio', 'mes', 'fecha_registro')
    search_fields = ('idusuario__username', 'idusuario__first_name', 'idusuario__last_name')
    date_hierarchy = 'fecha_registro'
    ordering = ('-fecha_registro',)
    
    fieldsets = (
        ('Información Principal', {
            'fields': ('fecha_registro', 'precio_cierre')
        }),
        ('Información del Usuario', {
            'fields': ('idusuario',)
        }),
        ('Información Adicional', {
            'fields': ('anio', 'mes'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('anio', 'mes')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('idusuario')


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')
    list_display_links = ('code', 'name')
    search_fields = ('code', 'name')
    ordering = ('name',)
    
    fieldsets = (
        ('Información del Departamento', {
            'fields': ('code', 'name')
        }),
    )


@admin.register(Municipality)
class MunicipalityAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'department', 'unique_code')
    list_display_links = ('code', 'name')
    list_filter = ('department',)
    search_fields = ('code', 'name', 'department__name', 'unique_code')
    ordering = ('department__name', 'name')
    
    fieldsets = (
        ('Información del Municipio', {
            'fields': ('code', 'name', 'department')
        }),
        ('Código Único', {
            'fields': ('unique_code',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('unique_code',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('department')


@admin.register(ProduccionCacaoHistorico)
class ProduccionCacaoHistoricoAdmin(admin.ModelAdmin):
    list_display = ('ano', 'pano', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio')
    list_filter = ('ano',)
    search_fields = ('ano',)
    ordering = ('-ano',)


@admin.register(ProduccionDepartamentoAnual)
class ProduccionDepartamentoAnualAdmin(admin.ModelAdmin):
    list_display = ('departamento', 'ano', 'produccion')
    list_filter = ('ano', 'departamento__nombre')
    search_fields = ('departamento__nombre', 'departamento__cod_departamento')
    ordering = ('-ano', 'departamento__nombre')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('departamento')


@admin.register(RendimientoCensoDepartamento)
class RendimientoCensoDepartamentoAdmin(admin.ModelAdmin):
    list_display = ('departamento', 'rendimiento_censo', 'fecha_actualizacion', 'usuario_actualizacion')
    list_filter = ('fecha_actualizacion', 'usuario_actualizacion')
    search_fields = ('departamento__nombre', 'departamento__cod_departamento')
    ordering = ('departamento__nombre',)
    readonly_fields = ('fecha_actualizacion',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('departamento', 'usuario_actualizacion')
    
    fieldsets = (
        ('Información del Departamento', {
            'fields': ('departamento',)
        }),
        ('Rendimiento Censo', {
            'fields': ('rendimiento_censo',)
        }),
        ('Auditoría', {
            'fields': ('fecha_actualizacion', 'usuario_actualizacion'),
            'classes': ('collapse',)
        }),
    )



