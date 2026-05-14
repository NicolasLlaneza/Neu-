## Estado actual
✅ Frontend con Vite + React + Tailwind funcionando
✅ Estructura de carpetas profesional creada
✅ Alias `@/` configurado para imports limpios
✅ Proyecto en Supabase creado (region: São Paulo, plan free)
✅ Tablas creadas: profiles, clientes, vehiculos, servicios, fotos_servicio, notificaciones
✅ Row Level Security activo en todas las tablas
✅ Políticas de seguridad definidas
✅ Frontend conectado con Supabase (cliente JS + .env)
✅ React Router con rutas protegidas (ProtectedRoute con verificación de profile.activo)
✅ Login con Supabase Auth
✅ Componentes base reutilizables (Button, Input, Select, Textarea, Modal, Card, SearchSelect)
✅ Layout con Sidebar + Topbar (desktop) y BottomNav (mobile)
✅ CRUD completo de clientes, vehículos, servicios y notificaciones
✅ Búsqueda en todas las páginas
✅ Soft delete con filtro "Ver bajas" en clientes y vehículos
✅ Pantalla de consulta pública por patente (con Turnstile)
✅ Deploy en Vercel funcionando
✅ Diseño responsive (mobile-first con bottom nav)
✅ Timeout de sesión por inactividad (30 min con aviso a los 60s)
✅ Edge Functions de WhatsApp preparadas (send-notification + process-notifications)
✅ Triggers de auditoría infalsificables en BD

## Seguridad
✅ RLS abierta en `vehiculos` cerrada
✅ `consulta_publica` no expone nombre del titular (Ley 25.326)
✅ Logger condicional (no filtra errores en producción)
✅ Password mínima configurada en Supabase
⏳ Turnstile en login (esperando dominio propio del cliente)
⏳ Verificación server-side de Turnstile en consulta pública (idem)

## Pendiente fuera del código
🔲 Coordinar acceso a Meta Business con el cliente (Business Manager ya creado)
🔲 Aprobación de WhatsApp Business API (3-14 días)
🔲 Aprobación de plantillas de mensajes (2-5 días)
🔲 Configurar variables de entorno en Edge Functions: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, INTERNAL_SECRET
🔲 Registro de base de datos en AAIP (Ley 25.326) — cuando autoricen comercialización
🔲 Redactar Política de Privacidad y Términos de Uso
🔲 Dominio propio del cliente para habilitar Turnstile

---

## Features planeadas

### 1. Sistema de órdenes de trabajo (mecánicos → admin → presupuesto)

**Objetivo:** Que los mecánicos puedan cargar desde su celular qué hay que hacerle a un vehículo, que llegue al admin para autorizar, y que se convierta en presupuesto.

**Flujo propuesto:**
```
Mecánico carga "orden de trabajo"
       ↓
   Estado: pendiente_autorizacion
       ↓
Admin recibe notificación in-app
       ↓
   Admin aprueba o rechaza
       ↓
Si aprueba → se convierte en borrador de presupuesto
Si rechaza → mecánico recibe feedback (opcional)
```

**Modelo de datos propuesto:**

Tabla `ordenes_trabajo`:
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | |
| vehiculo_id | uuid → vehiculos | |
| cliente_id | uuid → clientes | desnormalizado |
| mecanico_id | uuid → profiles | quien la cargó |
| diagnostico | text | descripción libre del mecánico |
| urgencia | enum | baja / media / alta |
| estado | enum | pendiente / autorizada / rechazada / presupuestada |
| autorizada_por | uuid → profiles | admin que aprobó |
| autorizada_at | timestamptz | |
| motivo_rechazo | text | si fue rechazada |
| created_at | timestamptz | |

Tabla `orden_items` (lo que el mecánico identifica que hay que hacer):
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | |
| orden_id | uuid → ordenes_trabajo | |
| descripcion | text | ej: "cambiar pastillas delanteras" |
| tipo | enum | repuesto / servicio / diagnostico |
| cantidad_estimada | integer | |
| observaciones | text | |

**Cambios necesarios:**
- Nuevo rol `mecanico` en `profiles.rol` (además de admin/superadmin)
- Vista limitada para mecánicos: solo ven sus órdenes pendientes y crear nuevas
- Vista de admin: bandeja de órdenes pendientes para autorizar
- Botón "Convertir en presupuesto" cuando está autorizada
- RLS específica: mecánicos solo ven sus propias órdenes; admins ven todas

**Consideraciones:**
- ¿El mecánico necesita poder agregar fotos a la orden? (probablemente sí — sirve de evidencia)
- ¿Hay límite de tiempo para que el admin responda? (timeout que la marque como vencida)
- ¿Hay notificación push o solo se ve al abrir la app?

---

### 2. QR code para la consulta pública

**Objetivo:** Simplificar el acceso del cliente a su historial de servicios. En lugar de tipear una URL larga + patente, escanea un QR.

**Opciones de implementación:**

**Opción A — QR genérico** (un solo QR para todo el taller):
- URL: `https://app.com/consulta`
- El cliente escanea y le aparece la pantalla de "Ingresá tu patente"
- Ventajas: imprimís un solo QR y lo pegás en el taller, en facturas, etc.
- Desventajas: el cliente igual tiene que escribir la patente

**Opción B — QR personalizado por vehículo** (un QR por cliente/auto):
- URL: `https://app.com/consulta?p=AB123CD` o `https://app.com/c/{token}`
- El QR ya trae la patente embebida, salta directo al historial
- Ventajas: experiencia más fluida, escanea y ve su historial
- Desventajas: hay que generar un QR por auto e imprimir/enviar

**Recomendación:** Implementar las dos.
- QR genérico impreso y plotteado en el taller (cartel en pared)
- QR personalizado en cada factura/comprobante de servicio (más útil para fidelización)

**Cambios técnicos necesarios:**
- Aceptar `?p=PATENTE` como query param en `ConsultaPublicaPage` y precargar/buscar automático
- (Opcional, más seguro) Generar tokens efímeros: tabla `consulta_tokens` con `vehiculo_id` y `expira_at` para que los QR no se compartan eternamente
- Librería de QR: `qrcode.react` para generar los QR desde el frontend
- Botón "Generar QR" en la ficha del vehículo o servicio → descarga PNG/PDF
- Opcional: incluir el QR generado en el mensaje de WhatsApp que se manda con la notificación

**Consideraciones de seguridad:**
- Si va con patente directa, cualquiera con foto del QR ve el historial. Aceptable si el contenido ya es público vía consulta_publica.
- Si va con token efímero, hay que considerar cómo se renueva (¿al imprimir factura nueva? ¿on-demand?)

---

## Filosofía de desarrollo
- Aprender el "por qué" de cada decisión, no solo el "cómo"
- Calidad sobre velocidad — mejor tardar más y que quede bien
- Documentar todo en README con changelog diario
- Código mantenible y comentado
- Pensar en seguridad desde el día uno
