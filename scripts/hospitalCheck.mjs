import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ---------- Config ----------
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CSV_PATH = path.join(__dirname, '..', 'data', 'data.csv')

const SUFFIXES = ['LLC', 'LTD', 'INC', 'PLC', 'GROUP', 'CORP', 'CO']

const suffixRegex = new RegExp(`\\b(${SUFFIXES.join('|')})\\b`, 'i')

const strictPattern = new RegExp(
  `^(?:${SUFFIXES.join('|')})\\s+\\w+|\\w+\\s+(?:${SUFFIXES.join('|')})$`,
  'i'
)

function parseCSV(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const next = text[i + 1]

    if (c === '"' && inQuotes && next === '"') {
      field += '"'
      i++
      continue
    }
    if (c === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (c === ',' && !inQuotes) {
      row.push(field)
      field = ''
      continue
    }
    if ((c === '\n' || c === '\r') && !inQuotes) {
      if (c === '\r' && next === '\n') i++
      row.push(field)
      field = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
      continue
    }
    field += c
  }

  // last field
  row.push(field)
  if (row.length > 1 || row[0] !== '') rows.push(row)

  return rows
}

function normalizeSpaces(s) {
  return String(s || '').replace(/\s+/g, ' ').trim()
}

function stripSuffix(name) {
  return normalizeSpaces(
    String(name || '')
      .toUpperCase()
      .replace(new RegExp(`\\b(${SUFFIXES.join('|')})\\b`, 'g'), '')
      .replace(/[^\w\s]/g, '')
  )
}

function toUpperTrim(s) {
  return normalizeSpaces(String(s || '').toUpperCase())
}

function percent(n, d) {
  return d === 0 ? '0.00%' : ((n / d) * 100).toFixed(2) + '%'
}

function topNFromMap(map, n) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
}

if (!fs.existsSync(CSV_PATH)) {
  console.error(`❌ CSV not found at: ${CSV_PATH}`)
  process.exit(1)
}

const csvText = fs.readFileSync(CSV_PATH, 'utf8')
const rows = parseCSV(csvText)

if (rows.length < 2) {
  console.error('❌ CSV seems empty or malformed.')
  process.exit(1)
}

const headers = rows[0].map(h => normalizeSpaces(h))
const hospitalIdx = headers.findIndex(h => h.toLowerCase() === 'hospital')

if (hospitalIdx === -1) {
  console.error(`❌ Could not find a "Hospital" column. Headers:`, headers)
  process.exit(1)
}

const dataRows = rows.slice(1)
const hospitalsRaw = dataRows.map(r => r[hospitalIdx] ?? '').filter(Boolean)

const totalRecords = dataRows.length

// 1) Suffix presence
let suffixCount = 0
let strictCount = 0

// Unique counts
const uniqueBefore = new Set()
const uniqueAfter = new Set()

// Base name frequency + word-count distribution
const baseFreq = new Map()
const wordCountFreq = new Map()

for (const name of hospitalsRaw) {
  const raw = String(name)

  if (suffixRegex.test(raw)) suffixCount++
  if (strictPattern.test(raw.trim())) strictCount++

  const uBefore = toUpperTrim(raw)
  if (uBefore) uniqueBefore.add(uBefore)

  const base = stripSuffix(raw)
  if (base) {
    uniqueAfter.add(base)
    baseFreq.set(base, (baseFreq.get(base) || 0) + 1)
  }

  const wc = normalizeSpaces(raw).split(' ').filter(Boolean).length
  wordCountFreq.set(wc, (wordCountFreq.get(wc) || 0) + 1)
}

// Frequency distribution of hospital occurrences
const freq = new Map()
for (const name of hospitalsRaw) {
  const u = toUpperTrim(name)
  freq.set(u, (freq.get(u) || 0) + 1)
}

const once = [...freq.values()].filter(v => v === 1).length
const twiceOrLess = [...freq.values()].filter(v => v <= 2).length

console.log('---')
console.log(`Hospitals appearing exactly once: ${once} (${percent(once, freq.size)} of unique)`)
console.log(`Hospitals appearing <=2 times: ${twiceOrLess} (${percent(twiceOrLess, freq.size)} of unique)`)

const hasNumber = hospitalsRaw.filter(h => /\d/.test(h)).length
console.log(`Hospitals with digits in name: ${hasNumber} (${percent(hasNumber, hospitalsRaw.length)})`)

const fourWordExamples = hospitalsRaw
  .filter(h => normalizeSpaces(h).split(' ').filter(Boolean).length === 4)
  .slice(0, 30)

console.log('---')
console.log('Sample 4-word hospital names:')
console.log(fourWordExamples)


// Reduction factor
const beforeN = uniqueBefore.size
const afterN = uniqueAfter.size
const reductionFactor = afterN === 0 ? 0 : beforeN / afterN


// Output
console.log('========== Hospital Naming Pattern Checks ==========')
console.log(`CSV Path: ${CSV_PATH}`)
console.log(`Total records: ${totalRecords}`)
console.log(`Non-empty Hospital values: ${hospitalsRaw.length}`)
console.log('---')

console.log(`Records containing legal suffix: ${suffixCount} (${percent(suffixCount, hospitalsRaw.length)})`)
console.log(`Records matching strict "{SUFFIX} {WORD}" or "{WORD} {SUFFIX}" pattern: ${strictCount} (${percent(strictCount, hospitalsRaw.length)})`)
console.log('---')

console.log(`Unique Hospital (raw, upper+trim): ${beforeN}`)
console.log(`Unique Hospital after stripping suffixes: ${afterN}`)
console.log(`Reduction factor (before/after): ${reductionFactor.toFixed(2)}`)
console.log('---')

console.log('Top 20 base names after stripping suffixes:')
for (const [k, v] of topNFromMap(baseFreq, 20)) {
  console.log(`  ${k}: ${v}`)
}
console.log('---')

console.log('Hospital name word-count distribution (words -> count):')
for (const [wc, count] of [...wordCountFreq.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`  ${wc} -> ${count}`)
}
console.log('===================================================')
