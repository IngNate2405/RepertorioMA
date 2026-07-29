const { send } = require('./_utils/http')
const { initFirebase } = require('./_utils/db')

/** Marca un setlist como "current" (el que ve el usuario en Inicio), garantizando
 *  que solo haya uno a la vez — el que estaba antes vuelve a "draft". */
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

  const { pin, id } = req.body || {}
  if (!pin || pin !== process.env.ADMIN_PIN) return send(res, 403, { error: 'PIN inválido' })
  if (!id) return send(res, 400, { error: 'Falta el id del setlist' })

  const db = initFirebase()

  await db.runTransaction(async tx => {
    const currentSnap = await tx.get(db.collection('setlists').where('status', '==', 'current'))
    currentSnap.forEach(doc => {
      if (doc.id !== id) tx.update(doc.ref, { status: 'draft' })
    })
    tx.update(db.doc(`setlists/${id}`), { status: 'current' })
  })

  send(res, 200, { ok: true })
}
