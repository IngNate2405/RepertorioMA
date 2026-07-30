const { send } = require('./_utils/http')
const { initFirebase } = require('./_utils/db')
const { getAccessConfig } = require('./_utils/access')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

  const { pin, id } = req.body || {}
  const db = initFirebase()
  const config = await getAccessConfig(db)
  if (!pin || pin !== config.adminPin) return send(res, 403, { error: 'PIN inválido' })
  if (!id) return send(res, 400, { error: 'Falta el id del setlist' })

  await db.doc(`setlists/${id}`).delete()

  send(res, 200, { ok: true })
}
