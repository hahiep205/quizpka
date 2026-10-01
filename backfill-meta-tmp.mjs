import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
const B = createClient(process.env.B_URL, process.env.B_KEY)
function parseCsv(text) {
  const rows = []
  let row = [], cur = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') { if (text[i+1] === '"') { cur += '"'; i++ } else inQ = false }
      else cur += c
    } else {
      if (c === '"') inQ = true
      else if (c === ',') { row.push(cur); cur = '' }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
      else if (c === '\r') {}
      else cur += c
    }
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row) }
  return rows
}
let done = 0, fail = 0
for (const f of ['users1.csv', 'users2.csv', 'users3.csv']) {
  const rows = parseCsv(readFileSync(join('C:\\Temp', f), 'utf8'))
  for (let i = 1; i < rows.length; i++) {
    const [id, email, , , userMeta] = rows[i]
    if (!id) continue
    let user_metadata = {}
    try { user_metadata = JSON.parse(userMeta) } catch { continue }
    const { error } = await B.auth.admin.updateUserById(id, { user_metadata })
    if (error) { fail++; if (fail <= 5) console.log('FAIL', email, error.message) }
    else done++
    if (i % 200 === 0) console.log(f, `${i} done=${done} fail=${fail}`)
    await new Promise(r => setTimeout(r, 50))
  }
}
console.log('BACKFILL DONE', { done, fail })