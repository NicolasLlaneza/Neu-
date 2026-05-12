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

const TIPOS_SERVICIO = [
  'Cambio de neumáticos',
  'Balanceo',
  'Alineación',
  'Rotación de neumáticos',
  'Reparación de pinchazo',
  'Revisión de presión',
  'Otro',
]

function hoy() {
  return new Date().toISOString().split('T')[0]
}

// ─── Formulario ────────────────────────────────────────────────────────
function ServicioModal({ servicio, vehiculos, onSave, onClose }) {
  const [form, setForm] = useState({
    vehiculo_id:   servicio?.vehiculo_id   ?? '',
    cliente_id:    servicio?.cliente_id    ?? '',
    tipo:          servicio?.tipo          ?? '',
    tipo_custom:   TIPOS_SERVICIO.includes(servicio?.tipo) ? '' : (servicio?.tipo ?? ''),
    fecha:         servicio?.fecha         ?? hoy(),
    km:            servicio?.km            ?? '',
    producto:      servicio?.producto      ?? '',
    importe:       servicio?.importe       ?? '',
    observaciones: servicio?.observaciones ?? '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Si es edición y el tipo no es uno de los predefinidos, mostrar "Otro"
  const tipoSelect = TIPOS_SERVICIO.includes(form.tipo) ? form.tipo : (servicio ? 'Otro' : form.tipo)

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: null }))
  }

  function handleVehiculo(vehiculo_id) {
    const v = vehiculos.find(v => v.id === vehiculo_id)
    setForm(prev => ({
      ...prev,
      vehiculo_id,
      cliente_id: v?.cliente_id ?? '',
    }))
    setErrors(prev => ({ ...prev, vehiculo_id: null }))
  }

  function handleTipo(value) {
    set('tipo', value === 'Otro' ? '' : value)
    if (value !== 'Otro') set('tipo_custom', '')
  }

  function validate() {
    const errs = {}
    if (!form.vehiculo_id)  errs.vehiculo_id = 'Requerido'
    if (!form.tipo.trim())  errs.tipo        = 'Requerido'
    if (!form.fecha)        errs.fecha       = 'Requerido'
    if (!form.km && form.km !== 0) errs.km  = 'Requerido'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const finalTipo = tipoSelect === 'Otro' ? form.tipo_custom : form.tipo
    const errs = validate()
    if (!finalTipo?.trim()) errs.tipo = 'Ingresá el tipo de servicio'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    await onSave({
      vehiculo_id:   form.vehiculo_id,
      cliente_id:    form.cliente_id,
      tipo:          finalTipo,
      fecha:         form.fecha,
      km:            parseInt(form.km),
      producto:      form.producto.trim()      || null,
      importe:       form.importe !== ''       ? parseFloat(form.importe) : null,
      observaciones: form.observaciones.trim() || null,
    })
    setSaving(false)
  }

  const vehiculoSeleccionado = vehiculos.find(v => v.id === form.vehiculo_id)

  return (
    <Modal title={servicio ? 'Editar servicio' : 'Nuevo servicio'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">

        <SearchSelect
          label="Vehículo"
          value={form.vehiculo_id}
          onChange={handleVehiculo}
          error={errors.vehiculo_id}
          placeholder="Buscar por patente, marca o cliente..."
          options={vehiculos.map(v => ({
            value: v.id,
            label: `${v.patente} — ${v.marca} ${v.modelo} (${v.clientes?.nombre})`,
          }))}
        />

        {vehiculoSeleccionado && (
          <p className="text-xs text-gray-200 -mt-2">
            Cliente: <span className="text-gray-100">{vehiculoSeleccionado.clientes?.nombre}</span>
          </p>
        )}

        <Select
          label="Tipo de servicio"
          value={tipoSelect}
          onChange={e => handleTipo(e.target.value)}
          error={errors.tipo}
        >
          <option value="">Seleccioná un servicio</option>
          {TIPOS_SERVICIO.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>

        {tipoSelect === 'Otro' && (
          <Input
            label="Especificá el servicio"
            value={form.tipo_custom}
            onChange={e => set('tipo_custom', e.target.value)}
            placeholder="Ej: Cambio de pastillas"
            error={errors.tipo}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fecha"
            type="date"
            value={form.fecha}
            onChange={e => set('fecha', e.target.value)}
            error={errors.fecha}
          />
          <Input
            label="Kilometraje"
            type="number"
            value={form.km}
            onChange={e => set('km', e.target.value)}
            error={errors.km}
            placeholder="0"
            min={0}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Producto"
            value={form.producto}
            onChange={e => set('producto', e.target.value)}
            placeholder="Ej: Bridgestone 195/55R16"
          />
          <Input
            label="Importe ($)"
            type="number"
            value={form.importe}
            onChange={e => set('importe', e.target.value)}
            placeholder="0.00"
            min={0}
            step="0.01"
          />
        </div>

        <Textarea
          label="Observaciones"
          value={form.observaciones}
          onChange={e => set('observaciones', e.target.value)}
          placeholder="Notas adicionales..."
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Página principal ───────────────────────────────────────────────────
export default function ServiciosPage() {
  const [servicios, setServicios]   = useState([])
  const [vehiculos, setVehiculos]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [search, setSearch]         = useState('')

  useEffect(() => {
    fetchServicios()
    fetchVehiculos()
  }, [])

  async function fetchServicios() {
    setLoading(true)
    const { data } = await supabase
      .from('servicios')
      .select('*, vehiculos(patente, marca, modelo), clientes(nombre)')
      .order('fecha', { ascending: false })
    setServicios(data ?? [])
    setLoading(false)
  }

  async function fetchVehiculos() {
    const { data } = await supabase
      .from('vehiculos')
      .select('id, patente, marca, modelo, cliente_id, clientes(nombre)')
      .eq('activo', true)
      .order('patente')
    setVehiculos(data ?? [])
  }

  function openCreate() { setEditing(null); setModalOpen(true) }
  function openEdit(s)  { setEditing(s);    setModalOpen(true) }

  async function handleSave(form) {
    if (editing) {
      const { data, error } = await supabase
        .from('servicios').update(form).eq('id', editing.id)
        .select('*, vehiculos(patente, marca, modelo), clientes(nombre)').single()
      if (error) { logger.error(error); return }
      setServicios(prev => prev.map(s => s.id === editing.id ? data : s))
    } else {
      const { data, error } = await supabase
        .from('servicios').insert(form)
        .select('*, vehiculos(patente, marca, modelo), clientes(nombre)').single()
      if (error) { logger.error(error); return }
      setServicios(prev => [data, ...prev])
    }
    setModalOpen(false)
  }

  async function handleDelete(id) {
    await supabase.from('servicios').delete().eq('id', id)
    setServicios(prev => prev.filter(s => s.id !== id))
    setDeletingId(null)
  }

  const filtrados = servicios.filter(s => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (s.clientes?.nombre ?? '').toLowerCase().includes(q) ||
           (s.vehiculos?.patente ?? '').toLowerCase().includes(q) ||
           s.tipo.toLowerCase().includes(q)
  })

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <p className="text-gray-200 text-sm">
          {loading ? '...' : `${filtrados.length} servicio${filtrados.length !== 1 ? 's' : ''}`}
        </p>
        <Button onClick={openCreate}>
          <Plus size={15} /> Nuevo servicio
        </Button>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente, patente o tipo de servicio..."
          className="w-full bg-dark-300 border border-dark-400 text-gray-100 text-sm rounded px-3 py-2 outline-none focus:border-red transition-colors placeholder:text-gray-300"
        />
      </div>

      {loading ? (
        <p className="text-gray-200 text-sm">Cargando...</p>
      ) : filtrados.length === 0 ? (
        <p className="text-gray-200 text-sm">No hay servicios registrados.</p>
      ) : (
        <div className="bg-dark-200 border border-dark-400 rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[700px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-dark-400">
                {['Cliente', 'Vehículo', 'Servicio', 'Fecha', 'KM', 'Importe', ''].map(col => (
                  <th key={col} className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-200">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(s => (
                <tr key={s.id} className="border-b border-dark-400 last:border-0 hover:bg-dark-300 transition-colors">
                  <td className="px-4 py-3 text-gray-100 font-medium">{s.clientes?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-200 font-mono">{s.vehiculos?.patente} <span className="font-sans text-xs">{s.vehiculos?.marca} {s.vehiculos?.modelo}</span></td>
                  <td className="px-4 py-3 text-gray-200">{s.tipo}</td>
                  <td className="px-4 py-3 text-gray-200">{s.fecha.split('-').reverse().join('/')}</td>
                  <td className="px-4 py-3 text-gray-200">{s.km?.toLocaleString('es-AR')} km</td>
                  <td className="px-4 py-3 text-gray-200">
                    {s.importe != null ? `$${Number(s.importe).toLocaleString('es-AR')}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(s)}>Editar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <ServicioModal
          servicio={editing}
          vehiculos={vehiculos}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
