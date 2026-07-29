import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import logger from '@/lib/logger'
import Button from '@/components/Button'
import ServicioModal from './ServicioModal'

// ─── Página principal ───────────────────────────────────────────────────
export default function ServiciosPage() {
  const [servicios, setServicios]   = useState([])
  const [vehiculos, setVehiculos]   = useState([])
  const [clientes, setClientes]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [search, setSearch]         = useState('')

  useEffect(() => {
    fetchServicios()
    fetchVehiculos()
    fetchClientes()
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

  async function fetchClientes() {
    const { data } = await supabase
      .from('clientes')
      .select('id, nombre, tipo')
      .eq('activo', true)
      .order('nombre')
    setClientes(data ?? [])
  }

  function openCreate() { setEditing(null); setModalOpen(true) }
  function openEdit(s)  { setEditing(s);    setModalOpen(true) }

  async function handleSave(form) {
    // Se usa para: edición de servicio existente, o creación con vehículo existente
    // (los flujos con cliente/vehículo nuevo pasan por handleServicioCreated).
    if (editing) {
      const { data, error } = await supabase
        .from('servicios').update(form).eq('id', editing.id)
        .select('*, vehiculos(patente, marca, modelo), clientes(nombre)').single()
      if (error) { logger.error(error); return null }
      setServicios(prev => prev.map(s => s.id === editing.id ? data : s))
      setModalOpen(false)
      return data
    } else {
      const { data, error } = await supabase
        .from('servicios').insert(form)
        .select('*, vehiculos(patente, marca, modelo), clientes(nombre)').single()
      if (error) { logger.error(error); return null }
      setServicios(prev => [data, ...prev])
      setModalOpen(false)
      return data
    }
  }

  // Post-callback cuando la RPC crear_servicio_completo terminó exitosamente.
  // Recibe { servicio_id, cliente_id, vehiculo_id }. Refresca listados
  // y cierra el modal.
  async function handleServicioCreated(ids) {
    await Promise.all([fetchServicios(), fetchVehiculos(), fetchClientes()])
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
                {['Cliente', 'Vehículo', 'Servicio', 'Fecha', 'KM', 'Importe', 'Cobro', ''].map(col => (
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
                    {s.cobrado ? (
                      <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded border text-green-500 border-green-500/40 bg-green-500/10">
                        Cobrado
                      </span>
                    ) : (
                      <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded border text-yellow-500 border-yellow-500/40 bg-yellow-500/10">
                        Pendiente
                      </span>
                    )}
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
          clientes={clientes}
          onSave={handleSave}
          onServicioCreated={handleServicioCreated}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
