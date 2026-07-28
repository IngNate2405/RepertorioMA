/** Redimensiona y comprime una foto a JPEG base64 (data URL) usando canvas. */
export function compressImage(file: File, maxDimension: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = ev => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const ratio = Math.min(maxDimension / img.width, maxDimension / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * ratio)
        canvas.height = Math.round(img.height * ratio)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

/** Calidad grande para que Gemini pueda leer bien acordes/letra pequeños — no se guarda. */
export function compressForOcr(file: File): Promise<string> {
  return compressImage(file, 1800, 0.85)
}

/** Calidad reducida para guardar como referencia permanente en Firestore (límite 1 MiB/doc). */
export function compressForStorage(file: File): Promise<string> {
  return compressImage(file, 900, 0.7)
}
