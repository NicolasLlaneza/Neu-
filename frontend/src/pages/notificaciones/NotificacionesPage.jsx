import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import logger from '@/lib/logger'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import Textarea from '@/components/Textarea'
import Modal from '@/components/Modal'
import SearchSelect from '@/components/SearchSelect'

const estadoConfig = {
  pendiente: { label: 'Pendiente', color: '#d97706' },
  enviada:   { label: 'Enviada',   color: '#16a34a' },
  fallida:   { label: 'Fallida',   color: '#910000' },
  cancelada: { label: 'Cancelada', color: '#555555' },
}

const mensajeInicial = (nombre) =>
  `Hola ${nombre}! 👋 Te contactamos desde *NEU+ Neumáticos*.`

// ─── Formulario ─────────────────────────────────────────────────────────
function NotificacionModal({ notificacion, clientes, onSave, onClose }) {
  const motivoInicial = notificacion?.motivo ?? ''

  const [form, setForm] = useState({
    cliente_id:  notificacion?.cliente_id  ?? '',
    servicio_id: notificacion?.servicio_id ?? '',
    motivo:      motivoInicial,
    mensaje:     notificacion?.mensaje     ?? '',
    fecha_envio: notificacion?.fecha_envio ?? '',
    hora_envio:  notificacion?.hora_envio  ?? '09:00',
    estado:      notificacion?.estado      ?? 'pendiente',
  })
  const [servicios, setServicios] = useState([])
  const [errors, setErrors]       = useState({})
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    if (form.cliente_id) fetchServicios(form.cliente_id)
    else setServicios([])
  }, [form.cliente_id])

  async function fetchServicios(clienteId) {
    const { data } = await supabase
      .from('servicios')
      .select('id, tipo, fecha, vehiculos(patente)')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false })
    setServicios(data ?? [])
  }

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: null }))
  }

  function handleCliente(cliente_id) {
    const cliente = clientes.find(c => c.id === cliente_id)
    const nombre  = cliente ? cliente.nombre.split(' ')[0] : ''
    setForm(prev => ({
      ...prev,
      cliente_id,
      servicio_id: '',
      // Solo pre-carga el mensaje si todavía está vacío
      mensaje: prev.mensaje.trim() ? prev.mensaje : mensajeInicial(nombre),
    }))
    setErrors(prev => ({ ...prev, cliente_id: null }))
  }

  function validate() {
    const errs = {}
    if (!form.cliente_id)     errs.cliente_id  = 'Requerido'
    if (!form.motivo)         errs.motivo      = 'Requerido'
    if (!form.mensaje.trim()) errs.mensaje     = 'Requerido'
    if (!form.fecha_envio)    errs.fecha_envio = 'Requerido'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    await onSave({
      cliente_id:  form.cliente_id,
      servicio_id: form.servicio_id || null,
      motivo:      form.motivo,
      canal:       'WhatsApp',
      mensaje:     form.mensaje.trim(),
      fecha_envio: form.fecha_envio,
      hora_envio:  form.hora_envio,
      estado:      form.estado,
    })
    setSaving(false)
  }

  return (
    <Modal title={notificacion ? 'Editar notificación' : 'Nueva notificación'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">

        <SearchSelect
          label="Cliente"
          value={form.cliente_id}
          onChange={handleCliente}
          error={errors.cliente_id}
          placeholder="Buscar cliente..."
          options={clientes.map(c => ({ value: c.id, label: c.nombre }))}
        />

        {form.cliente_id && (
          <Select
            label="Servicio relacionado (opcional)"
            value={form.servicio_id}
            onChange={e => set('servicio_id', e.target.value)}
          >
            <option value="">Sin servicio asociado</option>
            {servicios.map(s => (
              <option key={s.id} value={s.id}>
                {s.fecha.split('-').reverse().join('/')} — {s.tipo} ({s.vehiculos?.patente})
              </option>
            ))}
          </Select>
        )}

        <Input
          label="Motivo"
          value={form.motivo}
          onChange={e => set('motivo', e.target.value)}
          error={errors.motivo}
          placeholder="Ej: Recordatorio cambio de neumáticos"
        />

        <Textarea
          label="Mensaje"
          value={form.mensaje}
          onChange={e => set('mensaje', e.target.value)}
          error={errors.mensaje}
          rows={5}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fecha de envío"
            type="date"
            value={form.fecha_envio}
            onChange={e => set('fecha_envio', e.target.value)}
            error={errors.fecha_envio}
          />
          <Input
            label="Hora de envío"
            type="time"
            value={form.hora_envio}
            onChange={e => set('hora_envio', e.target.value)}
          />
        </div>

        {notificacion && (
          <Select
            label="Estado"
            value={form.estado}
            onChange={e => set('estado', e.target.value)}
          >
            <option value="pendiente">Pendiente</option>
            <option value="enviada">Enviada</option>
            <option value="fallida">Fallida</option>
            <option value="cancelada">Cancelada</option>
          </Select>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Página principal ────────────────────────────────────────────────────
export default function NotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState([])
  const [clientes, setClientes]             = useState([])
  const [loading, setLoading]               = useState(true)
  const [modalOpen, setModalOpen]           = useState(false)
  const [editing, setEditing]               = useState(null)
  const [deletingId, setDeletingId]         = useState(null)
  const [search, setSearch]                 = useState('')

  useEffect(() => {
    fetchNotificaciones()
    fetchClientes()
  }, [])

  async function fetchNotificaciones() {
    setLoading(true)
    const { data } = await supabase
      .from('notificaciones')
      .select('*, clientes(nombre), servicios(tipo, vehiculos(patente))')
      .order('fecha_envio', { ascending: true })
    setNotificaciones(data ?? [])
    setLoading(false)
  }

  async function fetchClientes() {
    const { data } = await supabase
      .from('clientes')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre')
    setClientes(data ?? [])
  }

  function openCreate() { setEditing(null); setModalOpen(true) }
  function openEdit(n)  { setEditing(n);    setModalOpen(true) }

  async function handleSave(form) {
    if (editing) {
      const { data, error } = await supabase
        .from('notificaciones').update(form).eq('id', editing.id)
        .select('*, clientes(nombre), servicios(tipo, vehiculos(patente))').single()
      if (error) { logger.error(error); return }
      setNotificaciones(prev => prev.map(n => n.id === editing.id ? data : n))
    } else {
      const { data, error } = await supabase
        .from('notificaciones').insert(form)
        .select('*, clientes(nombre), servicios(tipo, vehiculos(patente))').single()
      if (error) { logger.error(error); return }
      setNotificaciones(prev =>
        [...prev, data].sort((a, b) => a.fecha_envio.localeCompare(b.fecha_envio))
      )
    }
    setModalOpen(false)
  }

  async function handleDelete(id) {
    await supabase.from('notificaciones').update({ estado: 'cancelada' }).eq('id', id)
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, estado: 'cancelada' } : n))
    setDeletingId(null)
  }

  const pendientes = notificaciones.filter(n => n.estado === 'pendiente').length

  const filtradas = notificaciones.filter(n => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (n.clientes?.nombre ?? '').toLowerCase().includes(q) ||
           n.motivo.toLowerCase().includes(q)
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-200 text-sm">
          {loading ? '...' : (
            <>
              {filtradas.length} notificacion{filtradas.length !== 1 ? 'es' : ''}
              {pendientes > 0 && (
                <span
                  className="ml-2 px-2 py-0.5 rounded text-xs font-semibold"
                  style={{ color: '#d97706', backgroundColor: '#d9780622', border: '1px solid #d9780644' }}
                >
                  {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
                </span>
              )}
            </>
          )}
        </p>
        <Button onClick={openCreate}>
          <Plus size={15} /> Nueva notificación
        </Button>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente o motivo..."
          className="w-full bg-dark-300 border border-dark-400 text-gray-100 text-sm rounded px-3 py-2 outline-none focus:border-red transition-colors placeholder:text-gray-300"
        />
      </div>

      {loading ? (
        <p className="text-gray-200 text-sm">Cargando...</p>
      ) : filtradas.length === 0 ? (
        <p className="text-gray-200 text-sm">No hay notificaciones registradas.</p>
      ) : (
        <div className="bg-dark-200 border border-dark-400 rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-dark-400">
                {['Cliente', 'Motivo', 'Fecha envío', 'Hora', 'Estado', ''].map(col => (
                  <th key={col} className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-200">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(n => (
                <tr key={n.id} className="border-b border-dark-400 last:border-0 hover:bg-dark-300 transition-colors">
                  <td className="px-4 py-3 text-gray-100 font-medium">{n.clientes?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-200">{n.motivo}</td>
                  <td className="px-4 py-3 text-gray-200">{n.fecha_envio.split('-').reverse().join('/')}</td>
                  <td className="px-4 py-3 text-gray-200">{n.hora_envio?.slice(0, 5)}</td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide"
                      style={{
                        color: estadoConfig[n.estado]?.color,
                        backgroundColor: estadoConfig[n.estado]?.color + '22',
                        border: `1px solid ${estadoConfig[n.estado]?.color}55`,
                      }}
                    >
                      {estadoConfig[n.estado]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {deletingId === n.id ? (
                        <>
                          <Button size="sm" variant="danger" onClick={() => handleDelete(n.id)}>Confirmar</Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeletingId(null)}>Cancelar</Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => openEdit(n)}>Editar</Button>
                          <Button size="sm" variant="danger" onClick={() => setDeletingId(n.id)}>Cancelar notif.</Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <NotificacionModal
          notificacion={editing}
          clientes={clientes}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
