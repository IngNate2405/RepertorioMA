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

  const { id } = body
  if (!id) return json(400, { error: 'Falta el id de la canción' })

  const db = initFirebase()
  const photosSnap = await db.collection(`songs/${id}/photos`).get()

  const batch = db.batch()
  photosSnap.forEach(doc => batch.delete(doc.ref))
  batch.delete(db.doc(`songs/${id}`))
  await batch.commit()

  return json(200, { ok: true })
}
