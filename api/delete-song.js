const { send } = require('./_utils/http')
const { initFirebase } = require('./_utils/db')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

  const { pin, id } = req.body || {}
  if (!pin || pin !== process.env.ADMIN_PIN) return send(res, 403, { error: 'PIN inválido' })
  if (!id) return send(res, 400, { error: 'Falta el id de la canción' })

  const db = initFirebase()
  const photosSnap = await db.collection(`songs/${id}/photos`).get()

  const batch = db.batch()
  photosSnap.forEach(doc => batch.delete(doc.ref))
  batch.delete(db.doc(`songs/${id}`))
  await batch.commit()

  send(res, 200, { ok: true })
}
