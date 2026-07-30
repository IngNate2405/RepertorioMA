const { send } = require('./_utils/http')
const { initFirebase } = require('./_utils/db')
const { getAccessConfig } = require('./_utils/access')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

  const body = req.body || {}
  const db = initFirebase()
  const config = await getAccessConfig(db)
  if (!body.pin || body.pin !== config.adminPin) return send(res, 403, { error: 'PIN inválido' })

  const { id, name, date } = body
  const songs = Array.isArray(body.songs) ? body.songs : []
  if (!name?.trim() || !date?.trim()) {
    return send(res, 400, { error: 'Faltan campos requeridos (nombre, fecha)' })
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

  send(res, 200, { id: setlistId })
}
