/**
 * Formato de hoja de acordes: líneas pareadas — una línea de acordes
 * (posicionados con espacios) seguida de su línea de letra correspondiente.
 * Cada par ocupa exactamente 2 líneas físicas de texto; un par vacío (ambas
 * líneas en blanco) es un espacio visual entre estrofas. Mover un acorde es
 * literalmente mover dónde queda escrito dentro de su línea de acordes —
 * así se edita, y así se guarda (sin sintaxis de corchetes de por medio).
 *
 * También puede haber líneas de etiqueta de sección (ej. "Coro", "Estrofa 2"),
 * guardadas como una sola línea con el prefijo reservado "## " — un admin
 * nunca las escribe a mano con ese prefijo (las agrega con el botón dedicado
 * del editor), así que no hay ambigüedad con letra o acordes reales.
 *
 * Este módulo no depende de red ni de Firebase — es lógica pura, transportable offline.
 */

export interface ChordSheetPair {
  type: 'pair'
  chords: string
  lyric: string
}

export interface ChordSheetLabel {
  type: 'label'
  text: string
}

export type ChordSheetItem = ChordSheetPair | ChordSheetLabel

const LABEL_PREFIX = '## '

const OLD_BRACKET_FORMAT = /\[[^\]\n]+\]/
const OLD_CHORD_TOKEN = /\[([^\]]+)\]/g

/** Convierte una sola línea del formato viejo `[D#]texto` a {chords, lyric} por posición de columna. */
function migrateOldBracketLine(line: string): { chords: string; lyric: string } {
  let lyric = ''
  const chordsAtColumn: { column: number; chord: string }[] = []
  let lastIndex = 0
  OLD_CHORD_TOKEN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = OLD_CHORD_TOKEN.exec(line))) {
    lyric += line.slice(lastIndex, match.index)
    chordsAtColumn.push({ column: lyric.length, chord: match[1] })
    lastIndex = OLD_CHORD_TOKEN.lastIndex
  }
  lyric += line.slice(lastIndex)

  let chords = ''
  for (const { column, chord } of chordsAtColumn) {
    if (chords.length < column) chords += ' '.repeat(column - chords.length)
    else if (chords.length > 0) chords += ' ' // evita que dos acordes queden pegados si sus columnas coinciden
    chords += chord
  }
  return { chords, lyric }
}

/**
 * Migra texto guardado con el formato viejo (corchetes `[Acorde]` embebidos en la
 * letra) al formato actual de líneas pareadas. Las canciones guardadas antes de
 * este cambio quedan en formato viejo hasta que se vuelven a guardar — esto las
 * hace legibles/editables mientras tanto, sin tocar lo que ya está en Firestore.
 */
function migrateOldChordProText(text: string): string {
  return text
    .split('\n')
    .flatMap(line => {
      if (line.trim() === '') return ['', '']
      const { chords, lyric } = migrateOldBracketLine(line)
      return [chords, lyric]
    })
    .join('\n')
}

function normalizeChordSheetText(text: string): string {
  return OLD_BRACKET_FORMAT.test(text) ? migrateOldChordProText(text) : text
}

/** Convierte el texto guardado en items (pares {chords, lyric} o etiquetas de sección). */
export function parseChordSheet(text: string): ChordSheetItem[] {
  const rawLines = normalizeChordSheetText(text).split('\n')
  const items: ChordSheetItem[] = []
  let i = 0
  while (i < rawLines.length) {
    const line = rawLines[i]
    if (line.startsWith(LABEL_PREFIX)) {
      items.push({ type: 'label', text: line.slice(LABEL_PREFIX.length) })
      i += 1
    } else {
      items.push({ type: 'pair', chords: line ?? '', lyric: rawLines[i + 1] ?? '' })
      i += 2
    }
  }
  return items
}

/** Reconstruye el texto a guardar a partir de los items editados. */
export function serializeChordSheet(items: ChordSheetItem[]): string {
  return items
    .flatMap(item => (item.type === 'label' ? [`${LABEL_PREFIX}${item.text}`] : [item.chords, item.lyric]))
    .join('\n')
}

// ── Transposición ──────────────────────────────────────────────────────────

const SHARP_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_SCALE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

const NOTE_TO_INDEX: Record<string, number> = {
  'C': 0, 'B#': 0,
  'C#': 1, 'Db': 1,
  'D': 2,
  'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4,
  'E#': 5, 'F': 5,
  'F#': 6, 'Gb': 6,
  'G': 7,
  'G#': 8, 'Ab': 8,
  'A': 9,
  'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11,
}

// raíz + alteración (grupo 1), resto de la calidad del acorde (grupo 2, ej. "m7", "sus4"),
// y opcionalmente una nota de bajo tras "/" (grupo 3)
const CHORD_SHAPE = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/

function transposeRoot(root: string, semitones: number): string {
  const index = NOTE_TO_INDEX[root]
  if (index === undefined) return root
  const scale = root.includes('b') ? FLAT_SCALE : SHARP_SCALE
  const newIndex = ((index + semitones) % 12 + 12) % 12
  return scale[newIndex]
}

/** Transporta un solo símbolo de acorde (ej. "Gm7", "D/F#") N semitonos, preservando su sufijo. */
export function transposeChord(chord: string, semitones: number): string {
  const shift = ((semitones % 12) + 12) % 12
  if (shift === 0) return chord

  const match = CHORD_SHAPE.exec(chord.trim())
  if (!match) return chord
  const [, root, quality, bass] = match

  const newRoot = transposeRoot(root, semitones)
  const newBass = bass ? transposeRoot(bass, semitones) : undefined

  return `${newRoot}${quality}${newBass ? `/${newBass}` : ''}`
}

/** Transporta los acordes de una sola línea de acordes, preservando espacios/posición. */
export function transposeChordsLine(line: string, semitones: number): string {
  return line.replace(/\S+/g, token => transposeChord(token, semitones))
}

/** Transporta todos los acordes de una hoja completa, dejando la letra y las etiquetas intactas. */
export function transposeChordProText(text: string, semitones: number): string {
  const shift = ((semitones % 12) + 12) % 12
  const items = parseChordSheet(text)
  if (shift === 0) return serializeChordSheet(items)
  return serializeChordSheet(
    items.map(item => (item.type === 'pair' ? { ...item, chords: transposeChordsLine(item.chords, semitones) } : item))
  )
}
