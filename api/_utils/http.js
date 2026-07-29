function send(res, statusCode, data) {
  res.status(statusCode).json(data)
}

function normalizeTitle(title) {
  return (title || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

module.exports = { send, normalizeTitle }
