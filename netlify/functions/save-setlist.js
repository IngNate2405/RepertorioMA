const { json, parseBody } = require('./utils/http')
const { initFirebase } = require('./utils/db')

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  let body
  try {
    body = parseBody(event)
  } catch {
    return json(400, { error: 'JSON inválido' })
  }

  if (!body.pin || body.pin !== process.env.ADMIN_PIN) return json(403, { error: 'PIN inválido' })

  const { id, name, date } = body
  const songs = Array.isArray(body.songs) ? body.songs : []
  if (!name?.trim() || !date?.trim()) {
    return json(400, { error: 'Faltan campos requeridos (nombre, fecha)' })
  }

  const cleanSongs = songs
    .filter(s => s && typeof s.songId === 'string')
    .map(s => {
      const entry = { songId: s.songId }
      if (typeof s.keyOverrideSemitones === 'number' && s.keyOverrideSemitones !== 0) {
        entry.keyOverrideSemitones = s.keyOverrideSemitones
      }
      return entry
    })

  const db = initFirebase()
  const data = { name: name.trim(), date: date.trim(), songs: cleanSongs }

  let setlistId = id
  if (id) {
    await db.doc(`setlists/${id}`).set(data, { merge: true })
  } else {
    data.status = 'draft'
    data.createdAt = new Date().toISOString()
    const ref = await db.collection('setlists').add(data)
    setlistId = ref.id
  }

  return json(200, { id: setlistId })
}
