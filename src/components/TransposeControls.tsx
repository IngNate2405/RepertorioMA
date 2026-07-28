import { Minus, Plus } from 'lucide-react'
import { transposeChord } from '../lib/chordpro'

interface Props {
  originalKey: string
  semitones: number
  onChange: (semitones: number) => void
}

export default function TransposeControls({ originalKey, semitones, onChange }: Props) {
  const currentKey = transposeChord(originalKey, semitones)

  return (
    <div className="flex items-center gap-3 card px-3 py-2">
      <button
        onClick={() => onChange(semitones - 1)}
        className="w-8 h-8 rounded-lg bg-s2 border border-br flex items-center justify-center text-t1 active:scale-95"
        aria-label="Bajar tono"
      >
        <Minus size={16} />
      </button>
      <div className="flex-1 text-center">
        <div className="text-[10px] text-t3 uppercase tracking-wide">Tono</div>
        <div className="text-base font-semibold text-t1">
          {currentKey}
          {semitones !== 0 && <span className="text-t3 font-normal text-xs ml-1">({semitones > 0 ? '+' : ''}{semitones})</span>}
        </div>
      </div>
      <button
        onClick={() => onChange(semitones + 1)}
        className="w-8 h-8 rounded-lg bg-s2 border border-br flex items-center justify-center text-t1 active:scale-95"
        aria-label="Subir tono"
      >
        <Plus size={16} />
      </button>
      {semitones !== 0 && (
        <button onClick={() => onChange(0)} className="text-xs text-accent-500 font-medium ml-1">
          Original
        </button>
      )}
    </div>
  )
}
