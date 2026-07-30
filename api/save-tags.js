const { send } = require('./_utils/http')
const { admin, initFirebase } = require('./_utils/db')
const { getAccessConfig } = require('./_utils/access')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

  const { pin, tags } = req.body || {}
  const db = initFirebase()
  const config = await getAccessConfig(db)
  if (!pin || pin !== config.adminPin) return send(res, 403, { error: 'PIN inválido' })

  if (!Array.isArray(tags)) return send(res, 400, { error: 'Formato de etiquetas inválido' })

  const cleanTags = tags
    .filter(t => t && typeof t.id === 'string' && typeof t.name === 'string' && t.name.trim())
    .map(t => ({ id: t.id, name: t.name.trim() }))

  const tagsRef = db.doc('tags/list')
  const prevSnap = await tagsRef.get()
  const prevIds = new Set((prevSnap.exists ? prevSnap.data().items || [] : []).map(t => t.id))
  const newIds = new Set(cleanTags.map(t => t.id))
  const removedIds = [...prevIds].filter(id => !newIds.has(id))

  const batch = db.batch()
  batch.set(tagsRef, { items: cleanTags })

  // Si se elimina una etiqueta, hay que quitarla de cualquier canción que la
  // tuviera — si no, queda una referencia colgante a una etiqueta que ya no existe.
  if (removedIds.length > 0) {
    const removedSet = new Set(removedIds)
    const songsSnap = await db.collection('songs').get()
    songsSnap.forEach(doc => {
      if (removedSet.has(doc.data().tagId)) {
        batch.update(doc.ref, { tagId: admin.firestore.FieldValue.delete() })
      }
    })
  }

  await batch.commit()

  send(res, 200, { ok: true })
}
