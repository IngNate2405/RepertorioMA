const { json, parseBody } = require('./utils/http')

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  let body
  try {
    body = parseBody(event)
  } catch {
    return json(400, { error: 'JSON inválido' })
  }

  const { pin } = body
  const adminPin = process.env.ADMIN_PIN
  const userPin = process.env.USER_PIN

  let role = null
  if (adminPin && pin === adminPin) role = 'admin'
  else if (userPin && pin === userPin) role = 'user'

  // Retraso fijo — sin infraestructura de rate-limit, esto basta para
  // hacer poco práctico un ataque de fuerza bruta contra el PIN.
  await new Promise(resolve => setTimeout(resolve, 400))

  return json(200, { role })
}
