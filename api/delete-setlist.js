const { send } = require('./_utils/http')
const { initFirebase } = require('./_utils/db')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

  const { pin, id } = req.body || {}
  if (!pin || pin !== process.env.ADMIN_PIN) return send(res, 403, { error: 'PIN inválido' })
  if (!id) return send(res, 400, { error: 'Falta el id del setlist' })

  const db = initFirebase()
  await db.doc(`setlists/${id}`).delete()

  send(res, 200, { ok: true })
}
