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

/** Domingo siguiente a una fecha — nunca esa misma fecha, aunque ya sea domingo (avanza una semana completa). */
export function sundayAfter(from: Date): Date {
  const d = new Date(from)
  d.setDate(d.getDate() + (7 - d.getDay()))
  return d
}

/** Parsea "YYYY-MM-DD" como fecha local (evita el corrimiento de un día que da `new Date(iso)` por interpretarlo en UTC). */
export function parseDateIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
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
