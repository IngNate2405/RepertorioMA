/**
 * Los PINs viven en Firestore (`config/access`) una vez que el admin los cambia
 * desde la app, pero arrancan desde las variables de entorno — así el primer
 * login después de desplegar esta función sigue funcionando sin migración manual.
 */
async function getAccessConfig(db) {
  const snap = await db.doc('config/access').get()
  const stored = snap.exists ? snap.data() : {}
  return {
    adminPin: stored.adminPin || process.env.ADMIN_PIN || null,
    userPin: stored.userPin || process.env.USER_PIN || null,
  }
}

module.exports = { getAccessConfig }
