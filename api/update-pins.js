const { send } = require('./_utils/http')
const { initFirebase } = require('./_utils/db')
const { getAccessConfig } = require('./_utils/access')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

  const { pin, adminPin, userPin } = req.body || {}
  const db = initFirebase()
  const config = await getAccessConfig(db)

  if (!pin || pin !== config.adminPin) return send(res, 403, { error: 'PIN inválido' })

  if (!adminPin?.trim() || !userPin?.trim()) {
    return send(res, 400, { error: 'Ambos PINs son requeridos' })
  }
  if (adminPin.trim().length < 4 || userPin.trim().length < 4) {
    return send(res, 400, { error: 'Cada PIN debe tener al menos 4 caracteres' })
  }

  await db.doc('config/access').set({ adminPin: adminPin.trim(), userPin: userPin.trim() }, { merge: true })

  send(res, 200, { ok: true })
}
