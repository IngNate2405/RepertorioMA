const { send } = require('./_utils/http')
const { initFirebase } = require('./_utils/db')
const { getAccessConfig } = require('./_utils/access')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

  const { pin } = req.body || {}
  const db = initFirebase()
  const config = await getAccessConfig(db)

  if (!pin || pin !== config.adminPin) return send(res, 403, { error: 'PIN inválido' })

  send(res, 200, { adminPin: config.adminPin, userPin: config.userPin })
}
