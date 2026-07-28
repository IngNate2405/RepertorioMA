const { json, parseBody } = require('./utils/http')
const { admin, initFirebase } = require('./utils/db')

/** Marca un setlist como tocado y suma 1 a las estadísticas de cada canción incluida. */
exports.handler = async event => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  let body
  try {
    body = parseBody(event)
  } catch {
    return json(400, { error: 'JSON inválido' })
  }

  if (!body.pin || body.pin !== process.env.ADMIN_PIN) return json(403, { error: 'PIN inválido' })

  const { id } = body
  if (!id) return json(400, { error: 'Falta el id del setlist' })

  const db = initFirebase()
  const setlistRef = db.doc(`setlists/${id}`)
  const setlistSnap = await setlistRef.get()
  if (!setlistSnap.exists) return json(404, { error: 'Setlist no encontrado' })

  const now = new Date().toISOString()
  const songs = setlistSnap.data().songs || []

  const batch = db.batch()
  batch.update(setlistRef, { status: 'played', playedAt: now })
  for (const entry of songs) {
    batch.update(db.doc(`songs/${entry.songId}`), {
      timesPlayed: admin.firestore.FieldValue.increment(1),
      lastPlayedAt: now,
    })
  }
  await batch.commit()

  return json(200, { ok: true })
}
