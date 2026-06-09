const fs = require('fs')
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, LevelFormat, BorderStyle,
} = require('docx')

// Estilos personalizados
const styles = {
  default: { document: { run: { font: 'Arial', size: 22 } } }, // 11pt
  paragraphStyles: [
    {
      id: 'Heading1',
      name: 'Heading 1',
      basedOn: 'Normal',
      next: 'Normal',
      quickFormat: true,
      run: { size: 36, bold: true, font: 'Arial', color: '910000' },
      paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
    },
    {
      id: 'Heading2',
      name: 'Heading 2',
      basedOn: 'Normal',
      next: 'Normal',
      quickFormat: true,
      run: { size: 28, bold: true, font: 'Arial', color: '333333' },
      paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 },
    },
    {
      id: 'Heading3',
      name: 'Heading 3',
      basedOn: 'Normal',
      next: 'Normal',
      quickFormat: true,
      run: { size: 24, bold: true, font: 'Arial', color: '555555' },
      paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 },
    },
  ],
}

const numbering = {
  config: [
    {
      reference: 'bullets',
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    },
    {
      reference: 'numbers',
      levels: [{
        level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    },
  ],
}

// Helpers
const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] })
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] })
const h3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] })
const p  = (text, opts = {}) => new Paragraph({ children: [new TextRun({ text, ...opts })], spacing: { after: 120 } })
const bold = (text) => new TextRun({ text, bold: true })
const normal = (text) => new TextRun(text)
const bullet = (children) => new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children, spacing: { after: 80 } })
const num = (children) => new Paragraph({ numbering: { reference: 'numbers', level: 0 }, children, spacing: { after: 80 } })

const divider = new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '910000', space: 1 } },
  spacing: { before: 200, after: 200 },
})

const children = [
  // Título
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: 'NEU+', bold: true, size: 56, color: '910000', font: 'Arial' })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text: 'Guion de entrevista', italics: true, size: 24, color: '666666' })],
  }),

  // 1. Pitch de apertura
  h1('1. Apertura (30 segundos)'),
  p(
    'NEU+ es una aplicación web de seguimiento post-venta para un taller de neumáticos. Resuelve un problema concreto: hoy el taller no tiene forma de avisarle a sus clientes cuándo deberían volver para hacer mantenimiento. Pierden recompras y los clientes se olvidan del taller.',
    { italics: false }
  ),
  p('La app permite:'),
  bullet([normal('Llevar la base de clientes y vehículos centralizada')]),
  bullet([normal('Registrar cada servicio realizado')]),
  bullet([normal('Programar recordatorios automáticos por WhatsApp')]),
  bullet([normal('Que el cliente consulte su propio historial sin registrarse')]),

  divider,

  // 2. Stack
  h1('2. Stack técnico (1 minuto)'),
  p('Decisiones tomadas con criterio de costo, velocidad de desarrollo y escalabilidad:'),
  bullet([bold('Frontend: '), normal('React 18 con Vite y Tailwind CSS. SPA mobile-first, deployada en Vercel.')]),
  bullet([bold('Backend: '), normal('Supabase como backend-as-a-service. Postgres con Row Level Security, autenticación nativa, Edge Functions con Deno y cron jobs nativos vía pg_cron.')]),
  bullet([bold('Integración: '), normal('WhatsApp Business API oficial de Meta para los recordatorios.')]),
  bullet([bold('Routing: '), normal('React Router 6 con rutas protegidas.')]),

  p('Por qué Supabase: el cliente necesitaba un MVP rápido sin infraestructura propia. Supabase me da Postgres, Auth y Edge Functions en un solo producto, con plan gratuito que cubre el uso del taller.', { italics: true }),

  divider,

  // 3. Demo
  h1('3. Demo (5–7 minutos)'),

  h2('3.1. Login y panel principal'),
  p('Muestro el login con email y contraseña. Una vez dentro, se ve el panel: barra lateral en desktop, bottom navigation en mobile. La sesión tiene un timeout por inactividad de 30 minutos con aviso de 60 segundos.'),

  h2('3.2. CRUD de Clientes'),
  p('Muestro el listado de clientes con búsqueda y filtro de "ver bajas". Implementé soft delete: cuando se da de baja un cliente, no se borra, solo se marca inactivo. Preserva el historial.'),
  p('Cargo un cliente nuevo: nombre, teléfono, email, canal preferido. Si el teléfono es válido se va a poder usar para WhatsApp.'),

  h2('3.3. CRUD de Vehículos'),
  p('Cada vehículo se asocia a un cliente. La patente se detecta automáticamente: viejo formato (ABC123), nuevo (AB123CD) o moto (A123BC). Una validación simple del lado del cliente.'),

  h2('3.4. CRUD de Servicios'),
  p('Registro de cada servicio realizado: fecha, kilometraje, producto, importe, observaciones. Lista de tipos predefinidos pero permite agregar "otro" custom.'),

  h2('3.5. Notificaciones programadas (la feature clave)'),
  p('Acá está la parte más interesante. Programo una notificación para un cliente:'),
  num([normal('Selecciono el cliente y el servicio relacionado (opcional)')]),
  num([normal('Defino fecha y hora de envío')]),
  num([normal('Escribo el mensaje (se pre-carga un saludo con el nombre del cliente)')]),
  num([normal('Guardo en estado "pendiente"')]),
  p(''),
  p('La notificación se va a disparar automáticamente. Esto funciona con dos Edge Functions de Supabase y un cron job:'),
  bullet([bold('Edge Function "process-notifications": '), normal('corre cada 5 minutos, busca pendientes cuya fecha/hora ya pasó.')]),
  bullet([bold('Edge Function "send-notification": '), normal('llama a la API de Meta y actualiza el estado.')]),
  bullet([bold('Cron job vía pg_cron: '), normal('orquesta todo desde Postgres.')]),

  p('Para la demo en vivo, agregué un botón "Enviar ahora" en cada notificación pendiente. Lo apreto y en pocos segundos llega el WhatsApp.', { italics: true }),

  h2('3.6. Consulta pública por patente'),
  p('El cliente puede consultar su historial sin loguearse: entra a una URL, escribe su patente, valida un CAPTCHA y ve los servicios realizados. Hay un paso intermedio de confirmación con marca y modelo del vehículo, pensado para evitar que alguien que se equivoca de patente vea historial ajeno.'),

  divider,

  // 4. Seguridad
  h1('4. Seguridad (1–2 minutos)'),
  p('Pensé la seguridad desde el primer día. Lo que más quiero destacar:'),

  h3('Row Level Security'),
  p('Todas las tablas tienen RLS habilitado. Los datos están protegidos a nivel base de datos, no solo en el frontend. Si alguien hace un curl directo con la anon key, no puede leer nada salvo lo que las políticas explícitamente permiten.'),

  h3('Triggers de auditoría infalsificables'),
  p('Hay un trigger que setea automáticamente el campo "creado_por" / "registrado_por" usando el auth.uid() del usuario logueado. Aunque el frontend mande otro valor, el trigger lo sobrescribe. Esto previene que un admin malicioso registre acciones a nombre de otro.'),

  h3('Protección de datos personales (Ley 25.326)'),
  p('La consulta pública originalmente devolvía el nombre del titular. Lo saqué: alcanza con que el cliente vea marca y modelo para confirmar que es su auto. Si un atacante enumerara patentes, no obtiene una base de datos cliente-vehículo cruzable.'),

  h3('Timeout por inactividad'),
  p('Después de 30 minutos sin interacción aparece un modal con cuenta regresiva. Si no hay respuesta, cierra sesión. Útil para cuando alguien deja el navegador abierto en una compu compartida del taller.'),

  h3('Otros'),
  bullet([normal('Logger condicional: console.error solo en desarrollo, no filtra información a producción.')]),
  bullet([normal('CAPTCHA con Cloudflare Turnstile en la consulta pública para evitar bots.')]),
  bullet([normal('Soft delete en todas las entidades, preserva la integridad histórica.')]),

  divider,

  // 5. Roadmap
  h1('5. Roadmap (30 segundos)'),
  p('Lo que sigue planeado:'),
  bullet([bold('Sistema de órdenes de trabajo: '), normal('los mecánicos cargan desde el celular qué hay que hacerle a un auto, el admin autoriza y se convierte en presupuesto.')]),
  bullet([bold('QR personalizado por vehículo: '), normal('en lugar de escribir la patente, el cliente escanea un QR de su factura y ve su historial directo.')]),
  bullet([bold('Marco legal completo: '), normal('Política de Privacidad, Términos de Uso, registro de base de datos en la AAIP cuando empiecen a comercializar.')]),
  bullet([bold('Dominio propio: '), normal('para activar Turnstile en el login y verificación server-side completa.')]),

  divider,

  // 6. Q&A
  h1('6. Preguntas frecuentes anticipadas'),

  h3('"¿Por qué no Firebase / Auth0 / etc.?"'),
  p('Supabase es Postgres real, no NoSQL. Para una app con relaciones (cliente → vehículo → servicio → notificación) tener SQL importa. Las políticas RLS también son más expresivas que las reglas de Firestore. Y el costo del free tier es más generoso.'),

  h3('"¿Cómo manejás los costos cuando crezca?"'),
  p('El plan free de Supabase cubre 500 MB de DB y 2 GB de transferencia. Para un taller eso da para muchos meses. Vercel free tier también alcanza. WhatsApp Business cobra por conversación, pero las primeras 1.000 al mes son gratis. Un taller real probablemente envíe 100-200 al mes.'),

  h3('"¿Está testeado?"'),
  p('Sí — manualmente. No hay test suite automatizada todavía. Para un MVP de un solo cliente, prioricé funcionalidad y seguridad. En la roadmap está agregar tests con Vitest.'),

  h3('"¿Qué pasa si Supabase cae?"'),
  p('La app deja de funcionar. Para mitigarlo se podría agregar caching local, pero para el alcance actual (taller pequeño con conexión estable) no era prioridad. Supabase tiene 99.9% de uptime en su SLA.'),

  h3('"¿Por qué WhatsApp y no SMS / email?"'),
  p('Decisión del cliente. En Argentina la tasa de apertura de WhatsApp es muy superior a la de email, y SMS sale caro. WhatsApp Business permite mensajes formales sin caer en spam.'),

  h3('"¿Cómo evitás que el admin moleste a los clientes con mensajes constantes?"'),
  p('La API de Meta tiene rate limits y categorías de mensaje. Los recordatorios entran en categoría "service", que tienen quality scoring. Si un cliente bloquea, baja el rating del número y Meta limita el alcance. Eso obliga a usar la herramienta bien.'),

  h3('"¿Y si crece a varios talleres?"'),
  p('La arquitectura multi-tenant requeriría agregar un campo "taller_id" en todas las tablas y políticas RLS por taller. No es trivial pero es viable sin reescribir nada. Es un cambio de modelo de datos, no de tecnología.'),

  divider,

  // 7. Cierre
  h1('7. Cierre'),
  p('NEU+ resuelve un problema real con tecnología moderna y costos bajos. Está deployado, funcionando y le faltan features que ya están planeadas. Es un MVP listo para entrar en operación.'),
  p('Estoy disponible para mostrar el código, profundizar en cualquier decisión técnica o conversar sobre los próximos pasos.', { italics: true }),
]

const doc = new Document({
  styles,
  numbering,
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children,
  }],
})

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('D:\\Neu+\\demo\\speech-entrevista.docx', buffer)
  console.log('OK: speech-entrevista.docx generado')
})
