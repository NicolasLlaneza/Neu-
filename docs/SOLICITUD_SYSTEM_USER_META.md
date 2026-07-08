# Solicitud: configurar acceso permanente de API para NEU+

Hola! Te escribimos porque necesitamos que nos ayudes a configurar algo en el
Business Portfolio de NEU+ en Meta (Facebook Business). Es una tarea de
5-10 minutos, se hace desde **business.facebook.com** en una computadora
(no funciona bien desde el celular).

## Contexto (por qué lo necesitamos)

NEU+ envía recordatorios automáticos por WhatsApp a los clientes del taller
(turnos, servicios pendientes, etc.) usando la API oficial de WhatsApp
Business. Actualmente estamos usando un token de acceso temporal que
**vence cada 24 horas**, así que el sistema se corta todos los días. Para
que funcione de forma estable necesitamos un **token permanente**, que se
genera creando un "Usuario del sistema" dedicado — es una cuenta técnica
que pertenece al negocio, no a una persona, y no vence.

## Qué necesitamos que hagas

### 1. Crear el Usuario del sistema

1. Entrá a [business.facebook.com](https://business.facebook.com)
2. Verificá estar parado en el **Business Portfolio de NEU+**
3. Ícono ⚙️ **Configuración del negocio** (arriba a la izquierda)
4. Menú lateral: **Usuarios → Usuarios del sistema**
5. Click en **"Agregar"**
6. Nombre: `neuplus-api-bot`
7. Rol: **Admin**
8. Click en **Crear**

### 2. Asignarle los activos

Con el usuario `neuplus-api-bot` seleccionado en la lista:

1. Click en **"Asignar activos"**
2. Marcá estos tres activos (uno por uno):
   - La **App** de Meta for Developers que tiene WhatsApp configurado
   - La **Cuenta de WhatsApp Business** (WABA)
   - El **Número de teléfono** (si figura como activo separado)
3. Para cada uno, seleccioná **"Control total"**
4. Guardar cambios

### 3. Generar el token permanente

Con el usuario `neuplus-api-bot` seleccionado:

1. Click en **"Generar token"** (botón verde, arriba a la derecha)
2. Seleccioná la App de NEU+
3. **Caducidad: elegir "Sin vencimiento"** — esto es crítico, si se elige
   "60 días" el sistema se va a volver a cortar en 2 meses
4. Tildar estos dos permisos:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Click en **"Generar token"**
6. Va a aparecer un texto largo (el token). **Se muestra una sola vez** —
   cópialo antes de cerrar esa ventana.

## Cómo mandarnos el token

⚠️ Es una credencial sensible, por favor **no lo mandes por WhatsApp ni
email en texto plano**. Opciones seguras:

- Un mensaje que se autodestruye (ej. [privnote.com](https://privnote.com))
- Compartirlo por un gestor de contraseñas si usamos uno en común
- Dictarlo por teléfono/llamada

Cualquier duda o si algo en pantalla no coincide con lo que describimos acá,
escribinos y lo resolvemos juntos.

Gracias!
