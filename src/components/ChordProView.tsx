import { useMemo, useRef } from 'react'
import { parseChordSheet, transposeChordProText } from '../lib/chordpro'
import { useFitFontScale } from '../hooks/useFitFontScale'

interface Props {
  chordProText: string
  transposeSemitones?: number
  hideChords?: boolean
  uppercase?: boolean
  size?: 'normal' | 'large'
  /** Solo aplica con size="large" — multiplicador sobre el tamaño base (control +/- de presentación). */
  userScale?: number
}

// Tamaños base del modo "large" (px) — equivalentes a text-xl / text-base / text-sm.
const LARGE_LYRIC_PX = 20
const LARGE_CHORD_PX = 16
const LARGE_LABEL_PX = 14

export default function ChordProView({
  chordProText, transposeSemitones = 0, hideChords, uppercase, size = 'normal', userScale = 1,
}: Props) {
  const text = transposeSemitones ? transposeChordProText(chordProText, transposeSemitones) : chordProText
  const items = parseChordSheet(text)
  const containerRef = useRef<HTMLDivElement>(null)
  const isLarge = size === 'large'

  // En modo "large" (presentación) el ancho del teléfono es fijo y las líneas
  // no pueden hacer wrap sin desalinear el acorde de su sílaba — así que en
  // vez de dejar que una línea larga se salga del marco (o forzar scroll
  // horizontal por línea), se reduce el tamaño de fuente lo justo para que
  // la línea más larga quepa completa. Este cálculo usa siempre los tamaños
  // FIJOS de referencia (no multiplicados por userScale): si dependiera del
  // tamaño ya ajustado por el usuario, el resultado se cancelaría solo
  // (a mayor tamaño pedido, más se encogería para compensar) y el +/- de
  // Presentación dejaría de tener efecto visible en canciones con líneas
  // largas — justo el bug que esto evita. userScale se aplica DESPUÉS,
  // como multiplicador aparte, así el control del usuario siempre hace algo.
  const fitEntries = useMemo(() => {
    if (!isLarge) return []
    const entries: { text: string; baseFontPx: number }[] = []
    for (const item of items) {
      if (item.type === 'label') {
        entries.push({ text: item.text, baseFontPx: LARGE_LABEL_PX })
        continue
      }
      if (!hideChords && item.chords) entries.push({ text: item.chords, baseFontPx: LARGE_CHORD_PX })
      const lyric = item.lyric || ' '
      entries.push({ text: uppercase ? lyric.toUpperCase() : lyric, baseFontPx: LARGE_LYRIC_PX })
    }
    return entries
  }, [items, isLarge, hideChords, uppercase])

  const fitScale = useFitFontScale(containerRef, fitEntries)
  const scale = fitScale * userScale

  const lyricSizeClass = isLarge ? '' : 'text-sm'
  const chordSizeClass = isLarge ? '' : 'text-xs'
  const labelSizeClass = isLarge ? '' : 'text-xs'

  const lyricStyle = isLarge ? { fontSize: LARGE_LYRIC_PX * scale } : undefined
  const chordStyle = isLarge ? { fontSize: LARGE_CHORD_PX * scale } : undefined
  const labelStyle = isLarge ? { fontSize: LARGE_LABEL_PX * scale } : undefined

  return (
    <div ref={containerRef} className="font-mono overflow-x-auto">
      {items.map((item, i) => {
        if (item.type === 'label') {
          return (
            <div
              key={i}
              style={labelStyle}
              className={`bg-accent-500/10 rounded-md px-2 py-1 text-accent-500 font-bold uppercase tracking-wide mt-3 mb-1 first:mt-0 ${labelSizeClass}`}
            >
              {item.text}
            </div>
          )
        }
        const isBlank = !item.chords && !item.lyric
        if (isBlank) return <div key={i} className={isLarge ? 'h-6' : 'h-3'} />
        return (
          <div key={i}>
            {!hideChords && item.chords && (
              <div style={chordStyle} className={`chord-token whitespace-pre ${chordSizeClass}`}>{item.chords}</div>
            )}
            <div style={lyricStyle} className={`text-t1 whitespace-pre leading-relaxed ${lyricSizeClass} ${uppercase ? 'uppercase' : ''}`}>
              {item.lyric || ' '}
            </div>
          </div>
        )
      })}
    </div>
  )
}
