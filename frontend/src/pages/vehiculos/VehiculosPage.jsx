import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import Modal from '@/components/Modal'

const tipoLabels = {
  'auto-viejo': 'Auto antiguo',
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
  const [vehiculos, setVehiculos]   = useState([])
  const [clientes, setClientes]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    fetchVehiculos()
    fetchClientes()
  }, [])

  async function fetchVehiculos() {
    setLoading(true)
    const { data } = await supabase
      .from('vehiculos')
      .select('*, clientes(nombre)')
      .eq('activo', true)
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
      if (error) { console.error(error); return }
      setVehiculos(prev => prev.map(v => v.id === editing.id ? data : v))
    } else {
      const { data, error } = await supabase
        .from('vehiculos').insert(form)
        .select('*, clientes(nombre)').single()
      if (error) { console.error(error); return }
      setVehiculos(prev => [data, ...prev])
    }
    setModalOpen(false)
  }

  async function handleDelete(id) {
    await supabase
      .from('vehiculos')
      .update({ activo: false })
      .eq('id', id)
    setVehiculos(prev => prev.filter(v => v.id !== id))
    setDeletingId(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-200 text-sm">
          {loading ? '...' : `${vehiculos.length} vehículo${vehiculos.length !== 1 ? 's' : ''} registrado${vehiculos.length !== 1 ? 's' : ''}`}
        </p>
        <Button onClick={openCreate}>
          <Plus size={15} /> Nuevo vehículo
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-200 text-sm">Cargando...</p>
      ) : vehiculos.length === 0 ? (
        <p className="text-gray-200 text-sm">No hay vehículos registrados.</p>
      ) : (
        <div className="bg-dark-200 border border-dark-400 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
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
              {vehiculos.map(v => (
                <tr key={v.id} className="border-b border-dark-400 last:border-0 hover:bg-dark-300 transition-colors">
                  <td className="px-4 py-3 text-gray-100 font-medium">{v.clientes?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-100 font-mono tracking-wider">{v.patente}</td>
                  <td className="px-4 py-3 text-gray-200">{tipoLabels[v.tipo_patente] ?? v.tipo_patente}</td>
                  <td className="px-4 py-3 text-gray-200">{v.marca} {v.modelo}</td>
                  <td className="px-4 py-3 text-gray-200">{v.anio ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-200">{v.km?.toLocaleString('es-AR')} km</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {deletingId === v.id ? (
                        <>
                          <Button size="sm" variant="danger" onClick={() => handleDelete(v.id)}>Confirmar</Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeletingId(null)}>Cancelar</Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => openEdit(v)}>Editar</Button>
                          <Button size="sm" variant="danger" onClick={() => setDeletingId(v.id)}>Eliminar</Button>
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
