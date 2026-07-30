const { send } = require('./_utils/http')
const { initFirebase } = require('./_utils/db')
const { getAccessConfig } = require('./_utils/access')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

  const { pin } = req.body || {}
  const db = initFirebase()
  const { adminPin, userPin } = await getAccessConfig(db)

  let role = null
  if (adminPin && pin === adminPin) role = 'admin'
  else if (userPin && pin === userPin) role = 'user'

  // Retraso fijo — sin infraestructura de rate-limit, esto basta para
  // hacer poco práctico un ataque de fuerza bruta contra el PIN.
  await new Promise(resolve => setTimeout(resolve, 400))

  send(res, 200, { role })
}
