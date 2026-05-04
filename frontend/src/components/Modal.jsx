import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ title, children, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md bg-dark-200 border border-dark-400 rounded-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-400">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-100">{title}</h2>
          <button onClick={onClose} className="text-gray-200 hover:text-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}
