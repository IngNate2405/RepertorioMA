const { json, parseBody } = require('./utils/http')
const { initFirebase } = require('./utils/db')

/** Marca un setlist como "current" (el que ve el usuario en Inicio), garantizando
 *  que solo haya uno a la vez — el que estaba antes vuelve a "draft". */
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

  await db.runTransaction(async tx => {
    const currentSnap = await tx.get(db.collection('setlists').where('status', '==', 'current'))
    currentSnap.forEach(doc => {
      if (doc.id !== id) tx.update(doc.ref, { status: 'draft' })
    })
    tx.update(db.doc(`setlists/${id}`), { status: 'current' })
  })

  return json(200, { ok: true })
}
