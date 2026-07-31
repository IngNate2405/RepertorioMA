/** Domingo próximo — hoy mismo si hoy es domingo. */
export function nextSunday(from = new Date()): Date {
  const d = new Date(from)
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7))
  return d
}

/** Domingo anterior — nunca hoy, aunque hoy sea domingo (retrocede una semana completa). */
export function previousSunday(from = new Date()): Date {
  const d = new Date(from)
  d.setDate(d.getDate() - (d.getDay() === 0 ? 7 : d.getDay()))
  return d
}

/** YYYY-MM-DD en hora local (no UTC), para el input type="date". */
export function formatDateIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** DD-MM-YYYY, para nombrar el setlist ("Domingo DD-MM-YYYY"). */
export function formatDateDMY(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${day}-${m}-${y}`
}
