import { formatDateIso } from './date'
import type { Setlist } from '../types'

export interface SetlistGroups {
  current: Setlist | null
  past: Setlist[]
  upcoming: Setlist[]
}

/**
 * Agrupa setlists en actual/anteriores/próximos para Inicio y Admin. "Anteriores"
 * y "próximos" se deciden por fecha (no solo por status): un setlist creado con
 * "Domingo pasado" queda en estado "draft" hasta que alguien lo marca como
 * tocado, pero su fecha ya es pasada — sin esto, aparecería en "próximos".
 * Uno marcado explícitamente "played" siempre cuenta como anterior, sin
 * importar su fecha.
 */
export function groupSetlists(setlists: Setlist[] | null): SetlistGroups {
  const list = setlists ?? []
  const current = list.find(s => s.status === 'current') ?? null
  const todayIso = formatDateIso(new Date())

  const past = list
    .filter(s => s.status !== 'current' && (s.status === 'played' || s.date < todayIso))
    .sort((a, b) => b.date.localeCompare(a.date))

  const upcoming = list
    .filter(s => s.status !== 'current' && s.status !== 'played' && s.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))

  return { current, past, upcoming }
}
