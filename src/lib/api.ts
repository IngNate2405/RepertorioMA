export async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const message = await res.text().catch(() => '')
    throw new Error(message || `Error ${res.status}`)
  }
  return res.json() as Promise<T>
}
