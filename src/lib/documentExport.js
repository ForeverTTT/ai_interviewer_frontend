function safeFileName(value) {
  return String(value || 'document')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'document'
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function encodePdfText(value) {
  return Array.from(String(value || '')).map((char) => {
    const code = char.charCodeAt(0)
    if (char === '\\' || char === '(' || char === ')') return `\\${char}`
    if (code >= 0x20 && code <= 0x7e) return char
    if (code >= 0xa0 && code <= 0xff) return `\\${code.toString(8).padStart(3, '0')}`
    return '?'
  }).join('')
}

function buildPdf(title, body) {
  const lines = []
  String(body || '').replace(/\r/g, '').split('\n').forEach((paragraph) => {
    if (!paragraph.trim()) return lines.push('')
    const words = paragraph.split(/\s+/)
    let line = ''
    words.forEach((word) => {
      if (!line) line = word
      else if (`${line} ${word}`.length <= 88) line += ` ${word}`
      else { lines.push(line); line = word }
    })
    if (line) lines.push(line)
  })
  const pages = []
  for (let i = 0; i < lines.length || i === 0; i += 48) pages.push(lines.slice(i, i + 48))
  const objects = []
  const add = (content) => { objects.push(content); return objects.length }
  const catalogId = add('')
  const pagesId = add('')
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const pageIds = pages.map((pageLines, pageIndex) => {
    const commands = ['BT', '/F1 15 Tf', '50 792 Td', `(${encodePdfText(title)}) Tj`, '/F1 10 Tf', '0 -28 Td']
    pageLines.forEach((line, index) => {
      if (index) commands.push('0 -15 Td')
      commands.push(`(${encodePdfText(line)}) Tj`)
    })
    commands.push('ET', `BT /F1 8 Tf 520 28 Td (${pageIndex + 1}/${pages.length}) Tj ET`)
    const stream = commands.join('\n')
    const contentId = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
    return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`)
  })
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n` })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}

export function exportWord(title, body, fileName = title) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;max-width:720px;margin:56px auto;color:#172033;line-height:1.65}h1{font-size:22px;margin-bottom:32px}p{white-space:pre-wrap;font-size:12pt}</style></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p></body></html>`
  downloadBlob(new Blob(['\ufeff', html], { type: 'application/msword' }), `${safeFileName(fileName)}.doc`)
}

export function exportPdf(title, body, fileName = title) {
  downloadBlob(buildPdf(title, body), `${safeFileName(fileName)}.pdf`)
}
