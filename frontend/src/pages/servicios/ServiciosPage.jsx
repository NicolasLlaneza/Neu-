import { useState, useEffect, useCallback } from 'react'
import { Plus, ArrowLeft, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import logger from '@/lib/logger'
import { normalizarPatente, detectarTipoPatente } from '@/lib/patente'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import Textarea from '@/components/Textarea'
import Modal from '@/components/Modal'
import SearchSelect from '@/components/SearchSelect'
import FotoGallery from '@/components/FotoGallery'

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
function ServicioModal({ servicio, vehiculos, clientes, onSave, onClose }) {
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

  // Modo de selección de vehículo/cliente
  const [modoVehiculo, setModoVehiculo] = useState('existente') // 'existente' | 'nuevo'
  const [modoCliente,  setModoCliente]  = useState('existente') // usado solo si modoVehiculo === 'nuevo'

  const [nuevoVehiculo, setNuevoVehiculo] = useState({
    patente: '', tipo_patente: '', marca: '', modelo: '', anio: '',
  })
  const [nuevoCliente, setNuevoCliente] = useState({
    tipo: 'persona', nombre: '', telefono: '', email: '',
    documento: '', contacto_nombre: '', acepta_whatsapp: true,
  })

  // Duplicado detectado por teléfono al crear cliente nuevo
  const [clienteDuplicado, setClienteDuplicado] = useState(null)

  const tipoSelect = TIPOS_SERVICIO.includes(form.tipo) ? form.tipo : (servicio ? 'Otro' : form.tipo)
  const esModoNuevo = modoVehiculo === 'nuevo'
  const esNuevoCliente = esModoNuevo && modoCliente === 'nuevo'
  const esEmpresa = nuevoCliente.tipo === 'empresa'

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: null }))
  }

  function setNV(key, value) {
    setNuevoVehiculo(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, ['nv_' + key]: null }))
  }

  function setNC(key, value) {
    setNuevoCliente(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, ['nc_' + key]: null }))
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

  function handlePatenteNueva(value) {
    const normalizada = normalizarPatente(value)
    setNuevoVehiculo(prev => ({
      ...prev,
      patente: normalizada,
      tipo_patente: detectarTipoPatente(normalizada),
    }))
    setErrors(prev => ({ ...prev, nv_patente: null }))
  }

  function handleTipo(value) {
    set('tipo', value === 'Otro' ? '' : value)
    if (value !== 'Otro') set('tipo_custom', '')
  }

  // Chequeo de duplicado por teléfono (debounced)
  const checkDuplicado = useCallback(async (telefono) => {
    const tel = telefono.trim()
    if (!tel) { setClienteDuplicado(null); return }
    const { data } = await supabase
      .from('clientes')
      .select('id, nombre, tipo')
      .eq('telefono', tel)
      .eq('activo', true)
      .maybeSingle()
    setClienteDuplicado(data ?? null)
  }, [])

  useEffect(() => {
    if (!esNuevoCliente) { setClienteDuplicado(null); return }
    const t = setTimeout(() => checkDuplicado(nuevoCliente.telefono), 400)
    return () => clearTimeout(t)
  }, [nuevoCliente.telefono, esNuevoCliente, checkDuplicado])

  function usarClienteDuplicado() {
    // Cambia a modo "cliente existente" y selecciona el duplicado
    setModoCliente('existente')
    setNuevoCliente(prev => ({ ...prev, __selected_cliente_id: clienteDuplicado.id }))
    // seleccionamos el cliente en el select de existentes
    setForm(prev => ({ ...prev, cliente_id: clienteDuplicado.id }))
    setClienteDuplicado(null)
  }

  function validate() {
    const errs = {}
    if (!form.tipo.trim())         errs.tipo   = 'Requerido'
    if (!form.fecha)               errs.fecha  = 'Requerido'
    if (!form.km && form.km !== 0) errs.km     = 'Requerido'

    if (modoVehiculo === 'existente') {
      if (!form.vehiculo_id) errs.vehiculo_id = 'Seleccioná un vehículo'
    } else {
      if (!nuevoVehiculo.patente)      errs.nv_patente = 'Requerida'
      else if (!nuevoVehiculo.tipo_patente) errs.nv_patente = 'Formato de patente no reconocido'
      if (!nuevoVehiculo.marca.trim())  errs.nv_marca  = 'Requerida'
      if (!nuevoVehiculo.modelo.trim()) errs.nv_modelo = 'Requerido'

      if (modoCliente === 'existente') {
        if (!form.cliente_id) errs.cliente_id = 'Seleccioná un cliente o creá uno nuevo'
      } else {
        if (!nuevoCliente.nombre.trim())   errs.nc_nombre   = esEmpresa ? 'Razón social requerida' : 'Requerido'
        if (!nuevoCliente.telefono.trim()) errs.nc_telefono = 'Requerido'
      }
    }
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const finalTipo = tipoSelect === 'Otro' ? form.tipo_custom : form.tipo
    const errs = validate()
    if (!finalTipo?.trim()) errs.tipo = 'Ingresá el tipo de servicio'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)

    try {
      let clienteId  = form.cliente_id
      let vehiculoId = form.vehiculo_id

      // 1. Crear cliente nuevo si corresponde
      if (esModoNuevo && modoCliente === 'nuevo') {
        const clientePayload = {
          tipo:            nuevoCliente.tipo,
          nombre:          nuevoCliente.nombre.trim(),
          telefono:        nuevoCliente.telefono.trim(),
          email:           nuevoCliente.email.trim() || null,
          documento:       nuevoCliente.documento.trim() || null,
          contacto_nombre: esEmpresa ? (nuevoCliente.contacto_nombre.trim() || null) : null,
          acepta_whatsapp: !!nuevoCliente.acepta_whatsapp,
          canal_preferido: 'WhatsApp',
          estado:          'nuevo',
        }
        const { data: cliente, error } = await supabase
          .from('clientes').insert(clientePayload).select('id').single()
        if (error) throw new Error('No se pudo crear el cliente: ' + error.message)
        clienteId = cliente.id
      }

      // 2. Crear vehículo nuevo si corresponde
      if (esModoNuevo) {
        const vehiculoPayload = {
          cliente_id:   clienteId,
          patente:      nuevoVehiculo.patente,
          tipo_patente: nuevoVehiculo.tipo_patente,
          marca:        nuevoVehiculo.marca.trim(),
          modelo:       nuevoVehiculo.modelo.trim(),
          anio:         nuevoVehiculo.anio ? parseInt(nuevoVehiculo.anio) : null,
          km:           parseInt(form.km) || 0,
        }
        const { data: vehiculo, error } = await supabase
          .from('vehiculos').insert(vehiculoPayload).select('id').single()
        if (error) throw new Error('No se pudo crear el vehículo: ' + error.message)
        vehiculoId = vehiculo.id
      }

      // 3. Crear/actualizar el servicio
      await onSave({
        vehiculo_id:   vehiculoId,
        cliente_id:    clienteId,
        tipo:          finalTipo,
        fecha:         form.fecha,
        km:            parseInt(form.km),
        producto:      form.producto.trim()      || null,
        importe:       form.importe !== ''       ? parseFloat(form.importe) : null,
        observaciones: form.observaciones.trim() || null,
      })
    } catch (err) {
      logger.error(err)
      setErrors(prev => ({ ...prev, submit: err.message ?? 'Error inesperado' }))
    } finally {
      setSaving(false)
    }
  }

  const vehiculoSeleccionado = vehiculos.find(v => v.id === form.vehiculo_id)
  const editando = !!servicio

  return (
    <Modal title={editando ? 'Editar servicio' : 'Nuevo servicio'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ─── Selector de vehículo ─── */}
        {!editando && (
          <div className="flex items-center justify-between">
            <label className="text-gray-200 text-xs uppercase tracking-wider">Vehículo</label>
            {modoVehiculo === 'existente' ? (
              <button
                type="button"
                onClick={() => setModoVehiculo('nuevo')}
                className="text-xs text-red hover:text-red-bright transition-colors font-semibold uppercase tracking-wider"
              >
                + Nuevo vehículo
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setModoVehiculo('existente'); setModoCliente('existente') }}
                className="text-xs text-gray-200 hover:text-gray-100 transition-colors flex items-center gap-1"
              >
                <ArrowLeft size={12} /> Elegir existente
              </button>
            )}
          </div>
        )}

        {modoVehiculo === 'existente' || editando ? (
          <>
            <SearchSelect
              value={form.vehiculo_id}
              onChange={handleVehiculo}
              error={errors.vehiculo_id}
              placeholder="Buscar por patente, marca o cliente..."
              options={vehiculos.map(v => ({
                value: v.id,
                label: `${v.patente} — ${v.marca} ${v.modelo} (${v.clientes?.nombre})`,
              }))}
              disabled={editando}
            />
            {vehiculoSeleccionado && (
              <p className="text-xs text-gray-200 -mt-2">
                Cliente: <span className="text-gray-100">{vehiculoSeleccionado.clientes?.nombre}</span>
              </p>
            )}
          </>
        ) : (
          <div className="space-y-3 p-3 border border-dark-400 rounded bg-dark-300/50">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="Patente"
                  value={nuevoVehiculo.patente}
                  onChange={e => handlePatenteNueva(e.target.value)}
                  error={errors.nv_patente}
                  placeholder="AB123CD"
                  maxLength={7}
                />
                {nuevoVehiculo.tipo_patente && (
                  <p className="text-xs text-gray-300 mt-1">
                    Detectado: {nuevoVehiculo.tipo_patente.startsWith('auto') ? 'Auto' : 'Moto'}
                  </p>
                )}
              </div>
              <Input
                label="Año"
                type="number"
                value={nuevoVehiculo.anio}
                onChange={e => setNV('anio', e.target.value)}
                placeholder="2020"
                min={1950}
                max={2100}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Marca"
                value={nuevoVehiculo.marca}
                onChange={e => setNV('marca', e.target.value)}
                error={errors.nv_marca}
                placeholder="Toyota"
              />
              <Input
                label="Modelo"
                value={nuevoVehiculo.modelo}
                onChange={e => setNV('modelo', e.target.value)}
                error={errors.nv_modelo}
                placeholder="Corolla"
              />
            </div>

            {/* ─── Cliente (dentro de nuevo vehículo) ─── */}
            <div className="pt-2 border-t border-dark-400">
              <div className="flex items-center justify-between mb-2">
                <label className="text-gray-200 text-xs uppercase tracking-wider">Cliente</label>
                {modoCliente === 'existente' ? (
                  <button
                    type="button"
                    onClick={() => setModoCliente('nuevo')}
                    className="text-xs text-red hover:text-red-bright transition-colors font-semibold uppercase tracking-wider"
                  >
                    + Nuevo cliente
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setModoCliente('existente')}
                    className="text-xs text-gray-200 hover:text-gray-100 transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft size={12} /> Elegir existente
                  </button>
                )}
              </div>

              {modoCliente === 'existente' ? (
                <SearchSelect
                  value={form.cliente_id}
                  onChange={cid => set('cliente_id', cid)}
                  error={errors.cliente_id}
                  placeholder="Buscar cliente por nombre..."
                  options={clientes.map(c => ({
                    value: c.id,
                    label: c.tipo === 'empresa' ? `[Empresa] ${c.nombre}` : c.nombre,
                  }))}
                />
              ) : (
                <div className="space-y-3">
                  {/* Toggle persona/empresa */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNC('tipo', 'persona')}
                      className={`px-3 py-2 rounded border text-xs font-semibold uppercase tracking-wider transition-colors ${
                        !esEmpresa
                          ? 'border-red text-gray-100 bg-red/10'
                          : 'border-dark-400 text-gray-200 hover:border-gray-200'
                      }`}
                    >
                      Persona
                    </button>
                    <button
                      type="button"
                      onClick={() => setNC('tipo', 'empresa')}
                      className={`px-3 py-2 rounded border text-xs font-semibold uppercase tracking-wider transition-colors ${
                        esEmpresa
                          ? 'border-red text-gray-100 bg-red/10'
                          : 'border-dark-400 text-gray-200 hover:border-gray-200'
                      }`}
                    >
                      Empresa
                    </button>
                  </div>

                  <Input
                    label={esEmpresa ? 'Razón social' : 'Nombre y apellido'}
                    value={nuevoCliente.nombre}
                    onChange={e => setNC('nombre', e.target.value)}
                    error={errors.nc_nombre}
                    placeholder={esEmpresa ? 'Calper SA' : 'Juan García'}
                  />
                  <Input
                    label="Teléfono"
                    value={nuevoCliente.telefono}
                    onChange={e => setNC('telefono', e.target.value)}
                    error={errors.nc_telefono}
                    placeholder="+54 9 11 1234 5678"
                  />

                  {/* Warning de duplicado */}
                  {clienteDuplicado && (
                    <div className="flex items-start gap-3 p-3 border border-yellow-500/40 bg-yellow-500/10 rounded">
                      <AlertCircle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                      <div className="flex-1 text-sm">
                        <p className="text-gray-100">
                          Ya existe un cliente con este teléfono: <span className="font-semibold">{clienteDuplicado.nombre}</span>
                        </p>
                        <button
                          type="button"
                          onClick={usarClienteDuplicado}
                          className="mt-1 text-xs text-red hover:text-red-bright font-semibold uppercase tracking-wider"
                        >
                          Usar este cliente y agregar servicio
                        </button>
                      </div>
                    </div>
                  )}

                  <Input
                    label="Email (opcional)"
                    type="email"
                    value={nuevoCliente.email}
                    onChange={e => setNC('email', e.target.value)}
                    placeholder="juan@email.com"
                  />

                  <label className="flex items-start gap-3 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nuevoCliente.acepta_whatsapp}
                      onChange={e => setNC('acepta_whatsapp', e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-red cursor-pointer"
                    />
                    <span className="text-xs text-gray-200">
                      El cliente autorizó recibir notificaciones por WhatsApp
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Tipo de servicio ─── */}
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

        {/* Galería de fotos: solo disponible al editar (necesita ID del servicio) */}
        {editando ? (
          <div className="pt-2 border-t border-dark-400">
            <FotoGallery servicioId={servicio.id} />
          </div>
        ) : (
          <p className="text-xs text-gray-300 italic pt-1">
            Para agregar fotos, guardá primero el servicio y después editalo.
          </p>
        )}

        {errors.submit && (
          <p className="text-red-bright text-xs">{errors.submit}</p>
        )}

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
      // Refrescar vehículos y clientes por si se crearon nuevos
      await Promise.all([fetchVehiculos(), fetchClientes()])
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
          clientes={clientes}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
