import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, X } from 'lucide-react'
import Layout from '../../components/layout/Layout'
import { compressForOcr, compressForStorage } from '../../lib/imageCompress'
import { apiPost } from '../../lib/api'
import { useRole } from '../../contexts/RoleContext'

interface OcrResult {
  title: string
  key: string
  chordProText: string
}

export default function ScanSong() {
  const { pin } = useRole()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []).slice(0, 2)
    setFiles(selected)
    setPreviews(selected.map(f => URL.createObjectURL(f)))
    e.target.value = ''
  }

  function removeFile(index: number) {
    setFiles(files.filter((_, i) => i !== index))
    setPreviews(previews.filter((_, i) => i !== index))
  }

  async function handleProcess() {
    if (!pin || files.length === 0) return
    setError('')
    setProcessing(true)
    try {
      const [ocrImages, storagePhotos] = await Promise.all([
        Promise.all(files.map(f => compressForOcr(f))),
        Promise.all(files.map(f => compressForStorage(f))),
      ])

      const result = await apiPost<OcrResult>('/api/ocr-song', {
        pin,
        images: ocrImages.map(base64 => ({ base64 })),
      })

      navigate('/admin/canciones/nueva', {
        state: {
          title: result.title,
          originalKey: result.key,
          chordProText: result.chordProText,
          photos: storagePhotos.map((base64, i) => ({ base64, page: i + 1 })),
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la foto')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Layout title="Escanear canción">
      <div className="pt-3 space-y-4 pb-6">
        <p className="text-sm text-t3">
          Sube 1 o 2 fotos de la hoja de acordes. La IA extraerá el título, el tono y la letra con acordes —
          podrás revisar y corregir todo antes de guardar.
        </p>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFiles} />

        {previews.length === 0 ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-br rounded-2xl py-10 flex flex-col items-center gap-2 text-t3"
          >
            <Camera size={26} />
            <span className="text-xs">Toca para elegir foto(s)</span>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-s2 border border-br">
                <img src={src} alt={`Página ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {previews.length < 2 && (
              <button
                onClick={() => fileRef.current?.click()}
                className="aspect-[3/4] rounded-xl border-2 border-dashed border-br flex items-center justify-center text-t3 text-xs"
              >
                + página 2
              </button>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={handleProcess}
          disabled={files.length === 0 || processing}
          className="w-full rounded-xl bg-accent-500 text-black font-semibold py-2.5 disabled:opacity-50"
        >
          {processing ? 'Procesando con IA…' : 'Procesar con IA'}
        </button>
      </div>
    </Layout>
  )
}
