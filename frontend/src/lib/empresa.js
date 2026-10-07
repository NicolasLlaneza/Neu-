// Datos institucionales de la empresa.
//
// Todo lo que ate el sistema a la identidad del cliente (marca comercial,
// razón social, canales de contacto) vive acá. Si mañana la empresa cambia
// de nombre, si abre una segunda sucursal, o si el sistema se instala para
// otro taller, se toca este archivo y nada más.
//
// La vista pública (consulta-publica) también lee CONTACTO_TALLER de acá
// para el bloque del footer.
//
// En modo demo (lib/demo.js) se usan datos genéricos de un taller ficticio.

import { DEMO } from './demo'

const NEU = {
  marca:  'NEU+ Neumáticos',
  legal:  'Calper SA',
  email:  'info@neumasneumaticos.com.ar',
  emailPlaceholder: 'nombre@neumasneumaticos.com.ar',
  dominioConsulta: 'consulta.grupocalper.com',
  contacto: {
    telefono:  '+54 9 2612 70-0011',                     // click-to-call
    whatsapp:  '5492612700011',                          // número sin +, se usa en wa.me/{numero}
    direccion: 'Bandera de los Andes esquina Allayme',   // se puede sumar Google Maps luego
    horarios:  'Lunes a viernes de 9 a 18 hs',
  },
}

const TALLER_DEMO = {
  marca:  'Taller Demo',
  legal:  'Taller Demo SRL',
  email:  'contacto@tallerdemo.com.ar',
  emailPlaceholder: 'nombre@tallerdemo.com.ar',
  dominioConsulta: null,
  contacto: {
    telefono:  '+54 9 11 5555-0000',
    whatsapp:  null,                                     // sin botón: no abrir chats a números ficticios
    direccion: 'Av. Siempre Viva 742',
    horarios:  'Lunes a viernes de 8:30 a 18 hs · Sábados de 9 a 13 hs',
  },
}

const EMPRESA = DEMO ? TALLER_DEMO : NEU

export const NOMBRE_MARCA = EMPRESA.marca
export const NOMBRE_LEGAL = EMPRESA.legal
export const EMAIL_CONTACTO = EMPRESA.email
export const EMAIL_PLACEHOLDER = EMPRESA.emailPlaceholder

// Dominio exclusivo para clientes finales: su raíz abre la consulta pública.
export const DOMINIO_CONSULTA = EMPRESA.dominioConsulta

// Datos que se muestran en el pie de la consulta pública.
// Un valor null/'' oculta la fila correspondiente.
export const CONTACTO_TALLER = EMPRESA.contacto
