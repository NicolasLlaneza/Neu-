import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import logger from '@/lib/logger'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import Modal from '@/components/Modal'

const tipoLabels = {
  'auto-viejo': 'Auto',
  'auto-nuevo': 'Auto',
  'moto-nueva': 'Moto',
}

// ABC123 → auto-viejo | AB123CD → auto-nuevo | A123BC → moto-nueva
function detectarTipo(patente) {
  const p = patente.replace(/\s/g, '').toUpperCase()
  if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(p)) return 'auto-nuevo'
  if (/^[A-Z]{3}\d{3}$/.test(p))         return 'auto-viejo'
  if (/^[A-Z]\d{3}[A-Z]{2}$/.test(p))   return 'moto-nueva'
  return ''
}

// ─── Formulario ────────────────────────────────────────────────────────
function VehiculoModal({ vehiculo, clientes, onSave, onClose }) {
  const [form, setForm] = useState({
    cliente_id:  vehiculo?.cliente_id  ?? '',
    patente:     vehiculo?.patente     ?? '',
    tipo_patente: vehiculo?.tipo_patente ?? '',
    marca:       vehiculo?.marca       ?? '',
    modelo:      vehiculo?.modelo      ?? '',
    anio:        vehiculo?.anio        ?? '',
    km:          vehiculo?.km          ?? 0,
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: null }))
  }

  function handlePatente(value) {
    const normalizada = value.toUpperCase().replace(/\s/g, '')
    const tipo = detectarTipo(normalizada)
    setForm(prev => ({ ...prev, patente: normalizada, tipo_patente: tipo }))
    setErrors(prev => ({ ...prev, patente: null, tipo_patente: null }))
  }

  function validate() {
    const errs = {}
    if (!form.cliente_id)          errs.cliente_id   = 'Requerido'
    if (!form.patente.trim())      errs.patente      = 'Requerido'
    if (!form.tipo_patente)        errs.tipo_patente = 'Formato de patente no reconocido'
    if (!form.marca.trim())        errs.marca        = 'Requerido'
    if (!form.modelo.trim())       errs.modelo       = 'Requerido'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    await onSave({
      ...form,
      anio: form.anio ? parseInt(form.anio) : null,
      km:   parseInt(form.km) || 0,
    })
    setSaving(false)
  }

  return (
    <Modal title={vehiculo ? 'Editar vehículo' : 'Nuevo vehículo'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Cliente"
          value={form.cliente_id}
          onChange={e => set('cliente_id', e.target.value)}
          error={errors.cliente_id}
        >
          <option value="">Seleccioná un cliente</option>
          {clientes.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              label="Patente"
              value={form.patente}
              onChange={e => handlePatente(e.target.value)}
              error={errors.patente}
              placeholder="AB123CD"
              maxLength={7}
            />
            {form.tipo_patente && (
              <p className="text-xs text-gray-200 mt-1">
                Detectado: {tipoLabels[form.tipo_patente]}
              </p>
            )}
            {errors.tipo_patente && (
              <p className="text-xs text-red-bright mt-1">{errors.tipo_patente}</p>
            )}
          </div>
          <Input
            label="Año"
            type="number"
            value={form.anio}
            onChange={e => set('anio', e.target.value)}
            placeholder="2020"
            min={1950}
            max={2100}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Marca"
            value={form.marca}
            onChange={e => set('marca', e.target.value)}
            error={errors.marca}
            placeholder="Toyota"
          />
          <Input
            label="Modelo"
            value={form.modelo}
            onChange={e => set('modelo', e.target.value)}
            error={errors.modelo}
            placeholder="Corolla"
          />
        </div>

        <Input
          label="Kilometraje"
          type="number"
          value={form.km}
          onChange={e => set('km', e.target.value)}
          placeholder="0"
          min={0}
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
export default function VehiculosPage() {
  const [vehiculos, setVehiculos]       = useState([])
  const [clientes, setClientes]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [modalOpen, setModalOpen]       = useState(false)
  const [editing, setEditing]           = useState(null)
  const [deletingId, setDeletingId]     = useState(null)
  const [search, setSearch]             = useState('')
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    fetchVehiculos()
    fetchClientes()
  }, [])

  async function fetchVehiculos() {
    setLoading(true)
    const { data } = await supabase
      .from('vehiculos')
      .select('*, clientes(nombre)')
      .order('created_at', { ascending: false })
    setVehiculos(data ?? [])
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
  function openEdit(v)  { setEditing(v);    setModalOpen(true) }

  async function handleSave(form) {
    if (editing) {
      const { data, error } = await supabase
        .from('vehiculos').update(form).eq('id', editing.id)
        .select('*, clientes(nombre)').single()
      if (error) { logger.error(error); return }
      setVehiculos(prev => prev.map(v => v.id === editing.id ? data : v))
    } else {
      const { data, error } = await supabase
        .from('vehiculos').insert(form)
        .select('*, clientes(nombre)').single()
      if (error) { logger.error(error); return }
      setVehiculos(prev => [data, ...prev])
    }
    setModalOpen(false)
  }

  async function handleDelete(id) {
    await supabase
      .from('vehiculos')
      .update({ activo: false })
      .eq('id', id)
    setVehiculos(prev => prev.map(v => v.id === id ? { ...v, activo: false } : v))
    setDeletingId(null)
  }

  const inactivos = vehiculos.filter(v => !v.activo).length
  const filtrados = vehiculos
    .filter(v => showInactive ? true : v.activo)
    .filter(v => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return v.patente.toLowerCase().includes(q) ||
             v.marca.toLowerCase().includes(q) ||
             v.modelo.toLowerCase().includes(q) ||
             (v.clientes?.nombre ?? '').toLowerCase().includes(q)
    })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-200 text-sm">
          {loading ? '...' : `${filtrados.length} vehículo${filtrados.length !== 1 ? 's' : ''}`}
        </p>
        <Button onClick={openCreate}>
          <Plus size={15} /> Nuevo vehículo
        </Button>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="flex items-center gap-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por patente, marca, modelo o cliente..."
          className="flex-1 bg-dark-300 border border-dark-400 text-gray-100 text-sm rounded px-3 py-2 outline-none focus:border-red transition-colors placeholder:text-gray-300"
        />
        {inactivos > 0 && (
          <button
            onClick={() => setShowInactive(v => !v)}
            className={`text-xs px-3 py-2 rounded border transition-colors whitespace-nowrap ${
              showInactive
                ? 'border-red text-red bg-red/10'
                : 'border-dark-400 text-gray-200 hover:border-gray-200'
            }`}
          >
            {showInactive ? 'Ocultar bajas' : `Ver bajas (${inactivos})`}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-200 text-sm">Cargando...</p>
      ) : filtrados.length === 0 ? (
        <p className="text-gray-200 text-sm">No hay vehículos registrados.</p>
      ) : (
        <div className="bg-dark-200 border border-dark-400 rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-dark-400">
                {['Cliente', 'Patente', 'Tipo', 'Marca / Modelo', 'Año', 'KM', ''].map(col => (
                  <th key={col} className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-200">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(v => (
                <tr key={v.id} className={`border-b border-dark-400 last:border-0 hover:bg-dark-300 transition-colors ${!v.activo ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-gray-100 font-medium">{v.clientes?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-100 font-mono tracking-wider">
                    {v.patente}
                    {!v.activo && <span className="ml-2 text-xs text-gray-300 border border-dark-400 px-1.5 py-0.5 rounded font-sans">Baja</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-200">{tipoLabels[v.tipo_patente] ?? v.tipo_patente}</td>
                  <td className="px-4 py-3 text-gray-200">{v.marca} {v.modelo}</td>
                  <td className="px-4 py-3 text-gray-200">{v.anio ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-200">{v.km?.toLocaleString('es-AR')} km</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {deletingId === v.id ? (
                        <>
                          <Button size="sm" variant="danger" onClick={() => handleDelete(v.id)}>Confirmar baja</Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeletingId(null)}>Cancelar</Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => openEdit(v)}>Editar</Button>
                          {v.activo && <Button size="sm" variant="danger" onClick={() => setDeletingId(v.id)}>Dar de baja</Button>}
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
        <VehiculoModal
          vehiculo={editing}
          clientes={clientes}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
