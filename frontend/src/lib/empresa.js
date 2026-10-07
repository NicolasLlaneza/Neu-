// Datos institucionales de la empresa.
//
// Todo lo que ate el sistema a la identidad del cliente (marca comercial,
// razón social, canales de contacto) vive acá. Si mañana la empresa cambia
// de nombre, si abre una segunda sucursal, o si el sistema se instala para
// otro taller, se toca este archivo y nada más.
//
// La vista pública (consulta-publica) también lee CONTACTO_TALLER de acá
// para el bloque del footer.

export const NOMBRE_MARCA = 'NEU+ Neumáticos'
export const NOMBRE_LEGAL = 'Calper SA'
export const EMAIL_CONTACTO = 'info@neumasneumaticos.com.ar'

// Datos que se muestran en el pie de la consulta pública.
// Un valor null/'' oculta la fila correspondiente.
export const CONTACTO_TALLER = {
  telefono:  '+54 9 2612 70-0011',                     // click-to-call
  whatsapp:  '5492612700011',                          // número sin +, se usa en wa.me/{numero}
  direccion: 'Bandera de los Andes esquina Allayme',   // se puede sumar Google Maps luego
  horarios:  'Lunes a viernes de 9 a 18 hs',
}
