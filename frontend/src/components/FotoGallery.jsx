import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Loader2, Image as ImageIcon } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { supabase } from '@/lib/supabase'
import logger from '@/lib/logger'

const BUCKET      = 'fotos-servicio'
const MAX_FOTOS   = 5
const MAX_MB      = 0.5
const MAX_WIDTH   = 1600
const SIGNED_TTL  = 3600  // 1 hora — se renuevan al abrir el modal

// Opciones para browser-image-compression
const COMPRESSION_OPTS = {
  maxSizeMB:            MAX_MB,
  maxWidthOrHeight:     MAX_WIDTH,
  useWebWorker:         true,
  fileType:             'image/jpeg',
  initialQuality:       0.85,
}

export default function FotoGallery({ servicioId }) {
  const [fotos, setFotos]     = useState([])   // { id, url, storage_path, orden }
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview]     = useState(null)  // url para vista ampliada
  const [error, setError]         = useState(null)

  const fetchFotos = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('fotos_servicio')
      .select('id, storage_path, orden')
      .eq('servicio_id', servicioId)
      .order('orden')

    if (error) { logger.error(error); setLoading(false); return }

    // Generar URLs firmadas (1 hora)
    if (data && data.length > 0) {
      const paths = data.map(f => f.storage_path)
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(paths, SIGNED_TTL)

      const withUrls = data.map((f, i) => ({
        ...f,
        url: signed?.[i]?.signedUrl ?? null,
      }))
      setFotos(withUrls)
    } else {
      setFotos([])
    }
    setLoading(false)
  }, [servicioId])

  useEffect(() => {
    if (servicioId) fetchFotos()
  }, [servicioId, fetchFotos])

  async function handleUpload(e) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''  // permitir re-seleccionar los mismos archivos si algo falló
    if (files.length === 0) return

    const disponibles = MAX_FOTOS - fotos.length
    if (files.length > disponibles) {
      setError(`Solo podés subir ${disponibles} foto${disponibles !== 1 ? 's' : ''} más (máx ${MAX_FOTOS}).`)
      return
    }

    setError(null)
    setUploading(true)

    const nuevas = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // 1. Validar tipo
      if (!file.type.startsWith('image/')) {
        setError(`"${file.name}" no es una imagen válida`)
        continue
      }

      try {
        // 2. Comprimir
        const compressed = await imageCompression(file, COMPRESSION_OPTS)

        // 3. Subir al bucket
        const ext  = 'jpg'  // siempre convierte a JPG
        const uuid = crypto.randomUUID()
        const path = `servicios/${servicioId}/${uuid}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, compressed, {
            contentType: 'image/jpeg',
            upsert: false,
          })
        if (uploadError) throw uploadError

        // 4. Registrar en la tabla
        const orden = fotos.length + i
        const { data: fila, error: insertError } = await supabase
          .from('fotos_servicio')
          .insert({
            servicio_id:  servicioId,
            url:          '',  // deprecated: usamos signed URLs on-demand
            storage_path: path,
            orden,
          })
          .select('id, storage_path, orden')
          .single()
        if (insertError) throw insertError

        nuevas.push(fila)
      } catch (err) {
        logger.error(err)
        setError(`Error al subir "${file.name}": ${err.message ?? 'desconocido'}`)
      }
    }

    setUploading(false)
    if (nuevas.length > 0) await fetchFotos()
  }

  async function handleDelete(foto) {
    if (!confirm('¿Borrar esta foto?')) return

    // 1. Borrar del bucket
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([foto.storage_path])
    if (storageError) logger.error(storageError)  // seguimos igual, la fila se limpia

    // 2. Borrar de la tabla
    const { error } = await supabase
      .from('fotos_servicio')
      .delete()
      .eq('id', foto.id)
    if (error) {
      setError('No se pudo borrar')
      return
    }

    setFotos(prev => prev.filter(f => f.id !== foto.id))
  }

  const puedeAgregarMas = fotos.length < MAX_FOTOS && !uploading

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-gray-200 text-xs uppercase tracking-wider">
          Fotos del servicio ({fotos.length}/{MAX_FOTOS})
        </label>
        {puedeAgregarMas && (
          <label className="cursor-pointer text-xs text-red hover:text-red-bright transition-colors font-semibold uppercase tracking-wider flex items-center gap-1">
            <Plus size={12} />
            Agregar fotos
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
          </label>
        )}
      </div>

      {error && (
        <p className="text-red-bright text-xs">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-300 text-sm py-4">
          <Loader2 size={14} className="animate-spin" />
          Cargando fotos...
        </div>
      ) : fotos.length === 0 && !uploading ? (
        <div className="border border-dashed border-dark-400 rounded p-6 text-center">
          <ImageIcon size={24} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-300 text-xs">
            No hay fotos todavía. {puedeAgregarMas && 'Podés agregar hasta ' + MAX_FOTOS + '.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {fotos.map(foto => (
            <div key={foto.id} className="relative group aspect-square bg-dark-300 rounded overflow-hidden border border-dark-400">
              {foto.url ? (
                <img
                  src={foto.url}
                  alt=""
                  className="w-full h-full object-cover cursor-zoom-in"
                  onClick={() => setPreview(foto.url)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                  No disponible
                </div>
              )}
              <button
                type="button"
                onClick={() => handleDelete(foto)}
                className="absolute top-1 right-1 p-1 bg-dark-100/80 hover:bg-red text-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Borrar foto"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {uploading && (
            <div className="aspect-square bg-dark-300 rounded border border-dark-400 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          )}
        </div>
      )}

      {/* Preview modal (foto en tamaño grande) */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setPreview(null)}
        >
          <img
            src={preview}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="absolute top-4 right-4 p-2 bg-dark-100 hover:bg-dark-200 text-gray-100 rounded transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  )
}
