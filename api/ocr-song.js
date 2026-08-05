const { send } = require('./_utils/http')
const { initFirebase } = require('./_utils/db')
const { getAccessConfig } = require('./_utils/access')

// Alias "-latest" en vez de versiones fijas — Google retira modelos viejos para
// llaves nuevas con cierta frecuencia (ej. gemini-2.5-flash dejó de estar disponible
// para llaves nuevas), y así no hay que tocar esto de nuevo cuando vuelva a pasar.
const MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest']

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    key: { type: 'STRING' },
    chordProText: { type: 'STRING' },
  },
  required: ['title', 'key', 'chordProText'],
}

function buildPrompt(exampleText) {
  let prompt = `Eres un músico transcribiendo una hoja de acordes.

Convierte la(s) foto(s) adjuntas (pueden ser una o varias páginas de la misma canción, en orden) en texto plano,
tal como se ve en la foto: una línea de acordes posicionados con espacios, seguida inmediatamente
por su línea de letra correspondiente. Ejemplo — si la foto muestra:

   D#          Gm            Cm
Al estar en la presencia de Tu divinidad

...debes producir exactamente estas dos líneas de texto (respetando los espacios que ubican cada
acorde sobre su sílaba):
D#          Gm            Cm
Al estar en la presencia de Tu divinidad

Reglas estrictas:
- El texto SIEMPRE alterna: línea de acordes, línea de letra, línea de acordes, línea de letra...
  Cada línea de acordes va seguida inmediatamente de su línea de letra en la línea de abajo —
  nunca al revés, y nunca dos líneas de acordes o dos líneas de letra seguidas.
- Si una línea es solo instrumental (acordes sin letra debajo), igual debes escribir la línea de
  letra correspondiente, aunque quede vacía — nunca omitas la línea de letra de un par.
- Si una línea de letra no tiene ningún acorde arriba, igual debes escribir su línea de acordes
  correspondiente, aunque quede vacía — nunca omitas la línea de acordes de un par.
- Para separar estrofas/coros como en la foto, usa un par de líneas completamente vacías (una
  línea de acordes vacía seguida de una línea de letra vacía) — nunca una sola línea vacía suelta.
- Si la canción tiene varias páginas, únelas en un solo texto continuo, en el orden en que aparecen.
- Detecta el título de la canción si aparece escrito; si no aparece, deja el título en blanco.
- Detecta el tono (la tónica del primer acorde principal de la canción, ej. "D#", "Bm").

Identificación de estructura (muy importante — las canciones de adoración repiten el mismo coro
y las mismas estrofas varias veces):
- Analiza la letra para reconocer qué bloques son estrofas (texto que cambia cada vez) y cuál es
  el coro (el bloque que se repite igual, palabra por palabra, varias veces en la canción).
- Antes de cada bloque, agrega una línea propia con el prefijo "## " seguido de la etiqueta —
  ej. "## Estrofa 1", "## Coro", "## Estrofa 2", "## Puente". Esta línea de etiqueta ocupa una
  sola línea (no es un par de acordes/letra) y va sola, sin línea de letra debajo.
- Si un bloque se repite igual, palabra por palabra y acorde por acorde, más adelante en la
  canción (típicamente el coro), transcríbelo completo solo la PRIMERA vez que aparece. Las
  veces siguientes que se repite igual, NO vuelvas a escribir su letra ni sus acordes — omite esa
  repetición por completo (ni siquiera repitas su etiqueta "## Coro" de nuevo).
- Si una repetición tiene alguna diferencia real en la letra o los acordes respecto a la primera
  vez (no una repetición idéntica), sí transcríbela completa con su propia etiqueta — la regla de
  "una sola vez" aplica solo a repeticiones verdaderamente idénticas.
- Si no logras distinguir con confianza la estructura, no adivines — es mejor omitir las
  etiquetas que ponerlas mal.

Responde solo con el JSON pedido, sin explicaciones adicionales.`

  if (exampleText) {
    prompt += `\n\nEjemplo de formato ya usado en este repertorio (para mantener consistencia de estilo, no copies su contenido):\n${exampleText.slice(0, 500)}`
  }
  return prompt
}

async function callGemini(model, apiKey, prompt, images) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              ...images.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    }
  )

  if (!res.ok) {
    const err = new Error(`Gemini ${model} respondió ${res.status}`)
    err.status = res.status
    throw err
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error(`Gemini ${model} no devolvió contenido`)
  return JSON.parse(text)
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

  const body = req.body || {}
  const db = initFirebase()
  const config = await getAccessConfig(db)
  if (!body.pin || body.pin !== config.adminPin) return send(res, 403, { error: 'PIN inválido' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return send(res, 500, { error: 'Falta configurar GEMINI_API_KEY' })

  const rawImages = Array.isArray(body.images) ? body.images : []
  if (rawImages.length === 0) return send(res, 400, { error: 'No se recibió ninguna foto' })

  // el cliente manda data URLs completos ("data:image/jpeg;base64,...."); Gemini solo quiere el base64 puro
  const images = rawImages.map(img => {
    const match = /^data:(.+);base64,(.+)$/.exec(img.base64 || '')
    return match ? { mimeType: match[1], data: match[2] } : { mimeType: 'image/jpeg', data: img.base64 }
  })

  let exampleText = null
  try {
    const snap = await db.collection('songs').orderBy('updatedAt', 'desc').limit(1).get()
    if (!snap.empty) exampleText = snap.docs[0].data().chordProText
  } catch {
    // el ejemplo es solo una ayuda de estilo — si falla, seguimos sin él
  }

  const prompt = buildPrompt(exampleText)

  let lastError
  for (const model of MODELS) {
    try {
      const result = await callGemini(model, apiKey, prompt, images)
      return send(res, 200, result)
    } catch (err) {
      lastError = err
      // solo reintenta con el siguiente modelo si fue un error transitorio (rate limit / servidor)
      if (!(err.status === 429 || err.status >= 500)) break
    }
  }

  send(res, 502, { error: `No se pudo procesar la foto: ${lastError?.message || 'error desconocido'}` })
}
