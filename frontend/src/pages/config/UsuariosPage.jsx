import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, ShieldCheck, Copy, Check, AlertTriangle, KeyRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import logger from '@/lib/logger'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import Modal from '@/components/Modal'
import DataTable from '@/components/DataTable'
import TableSkeleton from '@/components/TableSkeleton'

const MIN_PASSWORD = 12

// Genera una contraseña temporal legible pero fuerte.
// Se la dicta el superadmin a la persona en el momento del alta.
function generarPassword() {
  const mayus  = 'ABCDEFGHJKLMNPQRSTUVWXYZ'   // sin I ni O (se confunden)
  const minus  = 'abcdefghijkmnpqrstuvwxyz'   // sin l ni o
  const nums   = '23456789'                    // sin 0 ni 1
  const simb   = '!@#$%&*'
  const todos  = mayus + minus + nums + simb

  // Garantizamos al menos uno de cada tipo
  const base = [
    mayus[Math.floor(Math.random() * mayus.length)],
    minus[Math.floor(Math.random() * minus.length)],
    nums[Math.floor(Math.random() * nums.length)],
    simb[Math.floor(Math.random() * simb.length)],
  ]
  while (base.length < 14) {
    base.push(todos[Math.floor(Math.random() * todos.length)])
  }
  // Shuffle
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[base[i], base[j]] = [base[j], base[i]]
  }
  return base.join('')
}

// ─── Sección: cambio de contraseña propia ───────────────────────────────
// Visible para TODOS los usuarios logueados (admin y superadmin).
//
// Dos modos según profile.debe_cambiar_password:
//   • true  → primer ingreso post-alta: no pide la actual (la conoce quien
//             creó el usuario, no aporta seguridad exigirla). Banner amarillo
//             y navegación bloqueada al resto por ProtectedRoute.
//   • false → cambio voluntario: pide y verifica la actual antes de cambiar.
//
// Backend: RPC única cambiar_mi_password que hace verificación (si aplica),
// hasheo con bcrypt y update atómico. Bypassea Auth API por limitaciones
// de "Secure password change" en configs recientes de Supabase.
function MiContrasenaSection() {
  const { profile, refreshProfile } = useAuth()

  const [actual, setActual]     = useState('')
  const [nueva, setNueva]       = useState('')
  const [repetir, setRepetir]   = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError]       = useState(null)

  const debeCambiar = profile?.debe_cambiar_password === true

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!debeCambiar && !actual) {
      setError('Ingresá tu contraseña actual')
      return
    }
    if (nueva.length < MIN_PASSWORD) {
      setError(`La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres`)
      return
    }
    if (nueva !== repetir) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (!debeCambiar && nueva === actual) {
      setError('La nueva contraseña tiene que ser distinta de la actual')
      return
    }

    setGuardando(true)

    const { error: rpcError } = await supabase.rpc('cambiar_mi_password', {
      p_nueva:  nueva,
      p_actual: debeCambiar ? null : actual,
    })
    setGuardando(false)

    if (rpcError) {
      logger.error(rpcError)
      // Los raise del RPC tienen mensajes en español; los pasamos directos.
      // Otros errores (red, permisos) caen en fallback genérico.
      setError(rpcError.message ?? 'No se pudo actualizar la contraseña')
      return
    }

    // Refrescamos el perfil: apaga el flag debe_cambiar_password, oculta el
    // banner y libera el guard de ProtectedRoute.
    await refreshProfile()

    setActual('')
    setNueva('')
    setRepetir('')
    toast.success('Contraseña actualizada')
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <KeyRound size={16} className="text-gray-300" />
        <h2 className="text-gray-100 text-sm font-bold uppercase tracking-widest">
          Mi contraseña
        </h2>
      </div>

      {debeCambiar && (
        <div className="flex items-start gap-3 p-3 mb-4 border border-yellow-500/40 bg-yellow-500/10 rounded">
          <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-gray-100 font-semibold mb-0.5">
              Cambio obligatorio de contraseña
            </p>
            <p className="text-gray-200 text-xs">
              Estás usando la contraseña temporal que te asignó el administrador.
              Elegí una contraseña nueva y personal ahora para poder usar el sistema.
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-dark-200 border border-dark-400 rounded-lg p-5 max-w-md space-y-4"
      >
        {!debeCambiar && (
          <Input
            label="Contraseña actual"
            type="password"
            value={actual}
            onChange={e => { setActual(e.target.value); setError(null) }}
            autoComplete="current-password"
            required
          />
        )}
        <Input
          label={`Nueva contraseña (mínimo ${MIN_PASSWORD} caracteres)`}
          type="password"
          value={nueva}
          onChange={e => { setNueva(e.target.value); setError(null) }}
          autoComplete="new-password"
          required
          autoFocus={debeCambiar}
        />
        <Input
          label="Repetir nueva contraseña"
          type="password"
          value={repetir}
          onChange={e => { setRepetir(e.target.value); setError(null) }}
          autoComplete="new-password"
          required
        />

        {error && <p className="text-red-bright text-xs">{error}</p>}

        <div className="pt-1">
          <Button type="submit" loading={guardando}>
            {debeCambiar ? 'Elegir contraseña' : 'Guardar contraseña'}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ─── Modal de alta ──────────────────────────────────────────────────────
function NuevoUsuarioModal({ onCreated, onClose }) {
  const [form, setForm] = useState({
    nombre:   '',
    email:    '',
    rol:      'admin',
    password: generarPassword(),
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [creado, setCreado]   = useState(null)

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: null }))
  }

  function copiarCredenciales() {
    const texto = `NEU+ — Acceso\nEmail: ${form.email}\nContraseña: ${form.password}`
    navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!form.nombre.trim())              errs.nombre   = 'Requerido'
    if (!form.email.trim())               errs.email    = 'Requerido'
    else if (!form.email.includes('@'))   errs.email    = 'Email inválido'
    if (form.password.length < MIN_PASSWORD) errs.password = `Mínimo ${MIN_PASSWORD} caracteres`
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email:    form.email.trim(),
        password: form.password,
        nombre:   form.nombre.trim(),
        rol:      form.rol,
      },
    })
    setSaving(false)

    if (error || data?.error) {
      logger.error(error ?? data.error)
      setErrors({ submit: data?.error ?? 'No se pudo crear el usuario' })
      return
    }

    setCreado(data.user)
    onCreated()
  }

  // Pantalla de confirmación con las credenciales para entregar
  if (creado) {
    return (
      <Modal title="Usuario creado" onClose={onClose}>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 border border-green-500/40 bg-green-500/10 rounded">
            <Check size={18} className="text-green-500 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-100">
              Se creó la cuenta de <strong>{creado.nombre}</strong>.
            </p>
          </div>

          <div className="bg-dark-300 border border-dark-400 rounded p-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-gray-300 mb-2">
              Credenciales de acceso
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-200">Email</span>
              <span className="text-gray-100 font-mono">{creado.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-200">Contraseña</span>
              <span className="text-gray-100 font-mono">{form.password}</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 border border-yellow-500/40 bg-yellow-500/10 rounded">
            <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-200">
              Esta contraseña es temporal y no se vuelve a mostrar. Entregásela ahora.
              En el primer ingreso, la persona va a tener que cambiarla obligatoriamente
              antes de poder usar el sistema.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1 justify-center"
              onClick={copiarCredenciales}
            >
              {copiado ? <Check size={15} /> : <Copy size={15} />}
              {copiado ? 'Copiado' : 'Copiar'}
            </Button>
            <Button className="flex-1 justify-center" onClick={onClose}>
              Listo
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Nuevo usuario" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre y apellido"
          value={form.nombre}
          onChange={e => set('nombre', e.target.value)}
          error={errors.nombre}
          placeholder="Ana Gómez"
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          error={errors.email}
          placeholder="ana@neumasneumaticos.com.ar"
        />
        <Select
          label="Rol"
          value={form.rol}
          onChange={e => set('rol', e.target.value)}
        >
          <option value="admin">Admin — carga y consulta datos</option>
          <option value="superadmin">Superadmin — además gestiona usuarios</option>
        </Select>

        <div>
          <Input
            label="Contraseña temporal"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            error={errors.password}
          />
          <button
            type="button"
            onClick={() => set('password', generarPassword())}
            className="text-xs text-red hover:text-red-bright transition-colors mt-1"
          >
            Generar otra
          </button>
        </div>

        {errors.submit && (
          <p className="text-red-bright text-xs">{errors.submit}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Crear usuario</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Sección: gestión de usuarios (solo superadmin) ────────────────────
function GestionUsuariosSection({ profile }) {
  const [usuarios, setUsuarios]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [savingId, setSavingId]   = useState(null)
  const [error, setError]         = useState(null)

  useEffect(() => { fetchUsuarios() }, [])

  async function fetchUsuarios() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre, email, rol, activo, fecha_baja, created_at')
      .order('created_at')
    if (error) logger.error(error)
    setUsuarios(data ?? [])
    setLoading(false)
  }

  async function cambiarRol(usuario, nuevoRol) {
    setSavingId(usuario.id)
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ rol: nuevoRol })
      .eq('id', usuario.id)
    setSavingId(null)

    if (error) {
      logger.error(error)
      setError(error.message)
      return
    }
    setUsuarios(prev => prev.map(u => u.id === usuario.id ? { ...u, rol: nuevoRol } : u))
  }

  async function toggleActivo(usuario) {
    const nuevoEstado = !usuario.activo
    const accion = nuevoEstado ? 'reactivar' : 'dar de baja'
    if (!confirm(`¿Seguro que querés ${accion} a ${usuario.nombre}?`)) return

    setSavingId(usuario.id)
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ activo: nuevoEstado })
      .eq('id', usuario.id)
    setSavingId(null)

    if (error) {
      logger.error(error)
      setError(error.message)
      return
    }
    setUsuarios(prev => prev.map(u =>
      u.id === usuario.id ? { ...u, activo: nuevoEstado } : u
    ))
  }

  const activos     = usuarios.filter(u => u.activo).length
  const superadmins = usuarios.filter(u => u.rol === 'superadmin' && u.activo).length

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-gray-100 text-sm font-bold uppercase tracking-widest mb-1">
            Gestión de usuarios
          </h2>
          <p className="text-gray-200 text-sm">
            {loading ? '...' : `${activos} activo${activos !== 1 ? 's' : ''} · ${superadmins} superadmin${superadmins !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Nuevo usuario
        </Button>
      </div>

      {error && (
        <p className="text-red-bright text-sm mb-4">{error}</p>
      )}

      {loading ? (
        <TableSkeleton columns={5} minWidth={720} />
      ) : (
        <DataTable
          columns={['Nombre', 'Email', 'Rol', 'Estado', '']}
          minWidth={720}
        >
          {usuarios.map(u => {
            const esYo = u.id === profile?.id
            return (
              <tr
                key={u.id}
                className={`border-b border-dark-400 last:border-0 hover:bg-dark-300 transition-colors ${!u.activo ? 'opacity-50' : ''}`}
              >
                <td className="px-4 py-3 text-gray-100 font-medium">
                  {u.nombre}
                  {esYo && (
                    <span className="ml-2 text-xs text-gray-300 border border-dark-400 px-1.5 py-0.5 rounded font-normal">
                      Vos
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-200 font-mono text-xs">{u.email ?? '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.rol}
                    disabled={esYo || savingId === u.id}
                    onChange={e => cambiarRol(u, e.target.value)}
                    className="bg-dark-300 border border-dark-400 text-gray-100 text-xs rounded px-2 py-1 outline-none focus:border-red transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  {u.activo ? (
                    <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded border text-green-500 border-green-500/40 bg-green-500/10">
                      Activo
                    </span>
                  ) : (
                    <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded border text-gray-300 border-dark-400 bg-dark-300">
                      Baja
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {!esYo && (
                      <Button
                        size="sm"
                        variant={u.activo ? 'danger' : 'secondary'}
                        loading={savingId === u.id}
                        onClick={() => toggleActivo(u)}
                      >
                        {u.activo ? 'Dar de baja' : 'Reactivar'}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </DataTable>
      )}

      <p className="text-gray-300 text-xs mt-4">
        No podés cambiar tu propio rol ni darte de baja a vos mismo. Pedíselo a otro superadmin.
      </p>

      {modalOpen && (
        <NuevoUsuarioModal
          onCreated={fetchUsuarios}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}

// ─── Página ─────────────────────────────────────────────────────────────
export default function UsuariosPage() {
  const { profile } = useAuth()
  const esSuperadmin = profile?.rol === 'superadmin'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-gray-100 text-lg font-bold uppercase tracking-widest">
          Usuarios
        </h1>
      </div>

      <MiContrasenaSection />

      {esSuperadmin ? (
        <div className="pt-6 border-t border-dark-400">
          <GestionUsuariosSection profile={profile} />
        </div>
      ) : (
        <div className="pt-6 border-t border-dark-400">
          <div className="flex items-start gap-3 p-4 border border-dark-400 bg-dark-200 rounded max-w-2xl">
            <ShieldCheck size={20} className="text-gray-300 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-gray-100 text-sm font-semibold mb-1">Gestión de usuarios</h2>
              <p className="text-gray-200 text-sm">
                Solo los superadmins pueden dar de alta o modificar cuentas.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
