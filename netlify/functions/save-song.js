const { json, parseBody, normalizeTitle } = require('./utils/http')
const { admin, initFirebase } = require('./utils/db')

const OPTIONAL_FIELDS = ['artist', 'youtubeUrl', 'spotifyUrl']

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  let body
  try {
    body = parseBody(event)
  } catch {
    return json(400, { error: 'JSON inválido' })
  }

  if (!body.pin || body.pin !== process.env.ADMIN_PIN) return json(403, { error: 'PIN inválido' })

  const { id, title, originalKey, chordProText } = body
  if (!title?.trim() || !originalKey?.trim() || !chordProText?.trim()) {
    return json(400, { error: 'Faltan campos requeridos (título, tono, letra/acordes)' })
  }

  const db = initFirebase()
  const now = new Date().toISOString()

  const data = {
    title: title.trim(),
    titleNormalized: normalizeTitle(title),
    originalKey: originalKey.trim(),
    chordProText,
    updatedAt: now,
  }

  for (const field of OPTIONAL_FIELDS) {
    const value = (body[field] || '').trim()
    if (value) {
      data[field] = value
    } else if (id) {
      // Al editar, un campo opcional vacío significa "quitarlo" — al crear, simplemente se omite.
      data[field] = admin.firestore.FieldValue.delete()
    }
  }

  let songId = id
  if (id) {
    await db.doc(`songs/${id}`).set(data, { merge: true })
  } else {
    data.timesPlayed = 0
    data.createdAt = now
    const ref = await db.collection('songs').add(data)
    songId = ref.id
  }

  // Fotos de referencia (calidad reducida, ya comprimidas por el cliente) —
  // se agregan como documentos nuevos en la subcolección, nunca reemplazan las existentes.
  const photos = Array.isArray(body.photos) ? body.photos : []
  if (photos.length > 0) {
    const batch = db.batch()
    for (const photo of photos) {
      if (!photo.base64) continue
      const ref = db.collection(`songs/${songId}/photos`).doc()
      batch.set(ref, { base64: photo.base64, page: photo.page || 1, uploadedAt: now })
    }
    await batch.commit()
  }

  return json(200, { id: songId })
}
