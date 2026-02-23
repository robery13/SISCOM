No Historia	HU-40	Nombre de historia	Validación de roles de usuario

Como sistema, quiero validar el rol del usuario para mostrar únicamente las funciones permitidas según su perfil.
Tareas:
✓ Restringir accesos por rol
✓ Mostrar menús dinámicos
✓ Validar permisos en backend

********************************************************************************************

# TODO - Validación de Roles en Admin_Backend

## Tareas Completadas ✅

### 1. Admin_Backend.html - Validación de Acceso Frontend ✅
- [x] Agregar script de validación de rol al inicio del body
- [x] Redireccionar a login si el rol no es 'administrador' o 'empleado'
- [x] Mostrar mensaje de "Acceso Denegado" antes de redireccionar

### 2. Admin_Backend.html - Menús Dinámicos por Rol ✅
- [x] Agregar atributos data-role a botones del menú
- [x] Crear función JavaScript para filtrar menús según rol
- [x] Ocultar "Gestión de Usuarios" para rol 'empleado'
- [x] Mostrar todos los menús para rol 'administrador'

## Tareas Pendientes ⏳

### 3. server.js - Validación de Permisos en Backend ⏳
- [ ] Crear middleware verificarRol()
- [ ] Proteger endpoints de gestión de usuarios (solo administrador)
- [ ] Proteger endpoints de eliminación masiva (solo administrador)
- [ ] Agregar verificación de token a todas las rutas sensibles

### 4. Testing y Verificación ⏳
- [ ] Probar acceso con rol 'administrador' - debe funcionar todo
- [ ] Probar acceso con rol 'empleado' - debe ocultar Gestión de Usuarios
- [ ] Probar acceso con rol 'usuario'/'paciente' - debe redireccionar
- [ ] Verificar que backend rechace peticiones sin permisos

## Roles del Sistema:
- **administrador**: Acceso total a todas las funciones
- **empleado**: Acceso limitado (sin Gestión de Usuarios)
- **usuario/paciente**: Sin acceso al panel de administración


## Roles del Sistema:
- **administrador**: Acceso total a todas las funciones
- **empleado**: Acceso limitado (sin Gestión de Usuarios)
- **usuario/paciente**: Sin acceso al panel de administración
