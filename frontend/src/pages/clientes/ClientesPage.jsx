import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import Modal from '@/components/Modal'

const estadoConfig = {
  nuevo:   { label: 'Nuevo',   color: '#666666' },
  ok:      { label: 'OK',      color: '#16a34a' },
  proximo: { label: 'Próximo', color: '#d97706' },
  urgente: { label: 'Urgente', color: '#910000' },
}

// ─── Formulario dentro del modal ───────────────────────────────────────
function ClienteModal({ cliente, onSave, onClose }) {
  const [form, setForm] = useState({
    nombre:          cliente?.nombre          ?? '',
    telefono:        cliente?.telefono        ?? '',
    email:           cliente?.email           ?? '',
    canal_preferido: cliente?.canal_preferido ?? 'WhatsApp',
    estado:          cliente?.estado          ?? 'nuevo',
  })
  const [errors, setErrors]   = useState({})
  const [saving, setSaving]   = useState(false)

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: null }))
  }

  function validate() {
    const errs = {}
    if (!form.nombre.trim())   errs.nombre   = 'Requerido'
    if (!form.telefono.trim()) errs.telefono = 'Requerido'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    await onSave({ ...form, email: form.email.trim() || null })
    setSaving(false)
  }

  return (
    <Modal title={cliente ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre"
          value={form.nombre}
          onChange={e => set('nombre', e.target.value)}
          error={errors.nombre}
          placeholder="Juan García"
        />
        <Input
          label="Teléfono"
          value={form.telefono}
          onChange={e => set('telefono', e.target.value)}
          error={errors.telefono}
          placeholder="+54 9 11 1234 5678"
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          placeholder="juan@email.com"
        />
        <Select
          label="Canal preferido"
          value={form.canal_preferido}
          onChange={e => set('canal_preferido', e.target.value)}
        >
          <option value="WhatsApp">WhatsApp</option>
          <option value="Email">Email</option>
          <option value="Ambos">Ambos</option>
        </Select>
        <Select
          label="Estado"
          value={form.estado}
          onChange={e => set('estado', e.target.value)}
        >
          <option value="nuevo">Nuevo</option>
          <option value="ok">OK</option>
          <option value="proximo">Próximo</option>
          <option value="urgente">Urgente</option>
        </Select>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Página principal ──────────────────────────────────────────────────
export default function ClientesPage() {
  const [clientes, setClientes]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => { fetchClientes() }, [])

  async function fetchClientes() {
    setLoading(true)
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('activo', true)
      .order('created_at', { ascending: false })
    setClientes(data ?? [])
    setLoading(false)
  }

  function openCreate() { setEditing(null); setModalOpen(true) }
  function openEdit(c)  { setEditing(c);    setModalOpen(true) }

  async function handleSave(form) {
    if (editing) {
      const { data, error } = await supabase
        .from('clientes').update(form).eq('id', editing.id).select().single()
      if (error) { console.error('Error al editar:', error); return error }
      setClientes(prev => prev.map(c => c.id === editing.id ? data : c))
    } else {
      const { data, error } = await supabase
        .from('clientes').insert(form).select().single()
      if (error) { console.error('Error al crear:', error); return error }
      setClientes(prev => [data, ...prev])
    }
    setModalOpen(false)
  }

  async function handleDelete(id) {
    await supabase
      .from('clientes')
      .update({ activo: false, fecha_baja: new Date().toISOString() })
      .eq('id', id)
    setClientes(prev => prev.filter(c => c.id !== id))
    setDeletingId(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-200 text-sm">
          {loading ? '...' : `${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} registrado${clientes.length !== 1 ? 's' : ''}`}
        </p>
        <Button onClick={openCreate}>
          <Plus size={15} /> Nuevo cliente
        </Button>
      </div>

      {/* Tabla */}
      {loading ? (
        <p className="text-gray-200 text-sm">Cargando...</p>
      ) : clientes.length === 0 ? (
        <p className="text-gray-200 text-sm">No hay clientes registrados.</p>
      ) : (
        <div className="bg-dark-200 border border-dark-400 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-400">
                {['Nombre', 'Teléfono', 'Email', 'Canal', 'Estado', ''].map(col => (
                  <th key={col} className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-200">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientes.map(cliente => (
                <tr key={cliente.id} className="border-b border-dark-400 last:border-0 hover:bg-dark-300 transition-colors">
                  <td className="px-4 py-3 text-gray-100 font-medium">{cliente.nombre}</td>
                  <td className="px-4 py-3 text-gray-200">{cliente.telefono}</td>
                  <td className="px-4 py-3 text-gray-200">{cliente.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-200">{cliente.canal_preferido}</td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide"
                      style={{
                        color: estadoConfig[cliente.estado]?.color,
                        backgroundColor: estadoConfig[cliente.estado]?.color + '22',
                        border: `1px solid ${estadoConfig[cliente.estado]?.color}55`,
                      }}
                    >
                      {estadoConfig[cliente.estado]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {deletingId === cliente.id ? (
                        <>
                          <Button size="sm" variant="danger" onClick={() => handleDelete(cliente.id)}>
                            Confirmar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeletingId(null)}>
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => openEdit(cliente)}>
                            Editar
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setDeletingId(cliente.id)}>
                            Eliminar
                          </Button>
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

      {/* Modal */}
      {modalOpen && (
        <ClienteModal
          cliente={editing}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
