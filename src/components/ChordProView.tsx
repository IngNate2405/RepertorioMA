import { parseChordSheet, transposeChordProText } from '../lib/chordpro'

interface Props {
  chordProText: string
  transposeSemitones?: number
  hideChords?: boolean
  uppercase?: boolean
  size?: 'normal' | 'large'
}

export default function ChordProView({ chordProText, transposeSemitones = 0, hideChords, uppercase, size = 'normal' }: Props) {
  const text = transposeSemitones ? transposeChordProText(chordProText, transposeSemitones) : chordProText
  const items = parseChordSheet(text)
  const lyricSize = size === 'large' ? 'text-xl leading-relaxed' : 'text-sm leading-relaxed'
  const chordSize = size === 'large' ? 'text-base' : 'text-xs'
  const labelSize = size === 'large' ? 'text-sm' : 'text-xs'

  return (
    <div className="font-mono overflow-x-auto">
      {items.map((item, i) => {
        if (item.type === 'label') {
          return (
            <div
              key={i}
              className={`bg-accent-500/10 rounded-md px-2 py-1 text-accent-500 font-bold uppercase tracking-wide mt-3 mb-1 first:mt-0 ${labelSize}`}
            >
              {item.text}
            </div>
          )
        }
        const isBlank = !item.chords && !item.lyric
        if (isBlank) return <div key={i} className={size === 'large' ? 'h-6' : 'h-3'} />
        return (
          <div key={i}>
            {!hideChords && item.chords && (
              <div className={`chord-token whitespace-pre ${chordSize}`}>{item.chords}</div>
            )}
            <div className={`text-t1 whitespace-pre ${lyricSize} ${uppercase ? 'uppercase' : ''}`}>{item.lyric || ' '}</div>
          </div>
        )
      })}
    </div>
  )
}
