// Catálogos de valores enumerados que la app manda a la BD y compara.
//
// Los valores string tienen que coincidir exactamente con los check
// constraints de las migraciones SQL. Si cambia uno, actualizar la
// migración correspondiente en el mismo commit.

// Roles de perfiles. Coincide con el check constraint de public.profiles.rol
// (migración 001) y con ROLES_VALIDOS en supabase/functions/admin-create-user.
export const ROLES = {
  ADMIN:      'admin',
  SUPERADMIN: 'superadmin',
}
export const ROLES_LIST = Object.values(ROLES)

// Canales preferidos de contacto del cliente. Coincide con el check constraint
// de public.clientes.canal_preferido (migración 001) y con los inserts de
// migración 294.
export const CANALES = {
  WHATSAPP: 'WhatsApp',
  EMAIL:    'Email',
  AMBOS:    'Ambos',
}
export const CANALES_LIST = Object.values(CANALES)

// Tipos de servicio pre-cargados. 'Otro' habilita un input de texto libre.
// Cuando se toque este listado, considerar si conviene migrarlo a una tabla
// tipos_servicio en BD para que el taller lo edite sin redeploy.
export const TIPOS_SERVICIO = [
  'Alineación',
  'Alineación y Balanceo',
  'Balanceo',
  'Cambio de filtros y aceite',
  'Equipamiento',
  'Servicio de Mecánica General',
  'Rotación de Neumáticos',
  'Reparación Tren Delantero',
  'Reparación de pinchadura',
  'Otro',
]
