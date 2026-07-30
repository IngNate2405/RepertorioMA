const { send } = require('./_utils/http')
const { initFirebase } = require('./_utils/db')
const { getAccessConfig } = require('./_utils/access')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

  const { pin, id } = req.body || {}
  const db = initFirebase()
  const config = await getAccessConfig(db)
  if (!pin || pin !== config.adminPin) return send(res, 403, { error: 'PIN inválido' })
  if (!id) return send(res, 400, { error: 'Falta el id de la canción' })

  const photosSnap = await db.collection(`songs/${id}/photos`).get()
  const setlistsSnap = await db.collection('setlists').get()

  const batch = db.batch()
  photosSnap.forEach(doc => batch.delete(doc.ref))
  batch.delete(db.doc(`songs/${id}`))

  // Quita la canción eliminada de cualquier setlist que la incluyera — si no,
  // queda una referencia colgante ("Canción no encontrada") en vez de simplemente
  // desaparecer de la lista, que es lo que se espera al borrar una canción.
  setlistsSnap.forEach(doc => {
    const songs = doc.data().songs || []
    if (songs.some(s => s.songId === id)) {
      batch.update(doc.ref, { songs: songs.filter(s => s.songId !== id) })
    }
  })

  await batch.commit()

  send(res, 200, { ok: true })
}
