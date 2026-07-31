import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

const MIN_SCALE = 0.6

interface FitEntry {
  text: string
  baseFontPx: number
}

/**
 * Calcula un factor de escala (<=1) para que la línea más larga de texto
 * monoespaciado quepa en el ancho del contenedor sin necesitar scroll
 * horizontal — pensado para modo presentación, donde el ancho del teléfono
 * es fijo y no hay forma de "hacer wrap" sin romper la alineación acorde/letra.
 * `baseFontPx` puede variar por línea (acordes vs letra vs etiquetas de
 * sección tienen tamaños distintos) — el factor final es el más restrictivo
 * entre todos los grupos, para no desproporcionar los tamaños relativos.
 */
export function useFitFontScale(containerRef: RefObject<HTMLElement | null>, entries: FitEntry[]) {
  const [scale, setScale] = useState(1)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const entriesRef = useRef(entries)
  entriesRef.current = entries

  const recompute = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const width = container.clientWidth
    const currentEntries = entriesRef.current
    if (!width || currentEntries.length === 0) {
      setScale(1)
      return
    }

    if (!canvasRef.current) canvasRef.current = document.createElement('canvas')
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const fontFamily = getComputedStyle(container).fontFamily
    const byFontSize = new Map<number, string[]>()
    for (const { text, baseFontPx } of currentEntries) {
      const list = byFontSize.get(baseFontPx) ?? []
      list.push(text)
      byFontSize.set(baseFontPx, list)
    }

    let minScale = 1
    for (const [baseFontPx, texts] of byFontSize) {
      ctx.font = `${baseFontPx}px ${fontFamily}`
      let maxWidth = 0
      for (const t of texts) {
        const w = ctx.measureText(t).width
        if (w > maxWidth) maxWidth = w
      }
      if (maxWidth > width) minScale = Math.min(minScale, width / maxWidth)
    }
    setScale(Math.max(MIN_SCALE, minScale))
  }, [containerRef])

  useLayoutEffect(() => {
    recompute()
  }, [entries, recompute])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(recompute)
    observer.observe(container)
    return () => observer.disconnect()
  }, [containerRef, recompute])

  return scale
}
