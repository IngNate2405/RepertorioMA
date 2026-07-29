const { send } = require('./_utils/http')
const { admin, initFirebase } = require('./_utils/db')

/** Marca un setlist como tocado y suma 1 a las estadísticas de cada canción incluida. */
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

  const { pin, id } = req.body || {}
  if (!pin || pin !== process.env.ADMIN_PIN) return send(res, 403, { error: 'PIN inválido' })
  if (!id) return send(res, 400, { error: 'Falta el id del setlist' })

  const db = initFirebase()
  const setlistRef = db.doc(`setlists/${id}`)
  const setlistSnap = await setlistRef.get()
  if (!setlistSnap.exists) return send(res, 404, { error: 'Setlist no encontrado' })

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

  send(res, 200, { ok: true })
}
