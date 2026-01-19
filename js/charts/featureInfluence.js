// import * as d3 from '../vendor/d3.v7.min.js'

import { state } from '../state.js'
import { getTooltip } from './tooltip.js'

export function renderFeatureInfluence(data = state.filteredData || state.data) {
  const svg = d3.select('#featureInfluence')
  if (svg.empty()) return

  const container = svg.node().parentNode
  const width = container.clientWidth
  const height = container.clientHeight

  svg.selectAll('*').remove()
  svg.attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet')

  const margin = { top: 46, right: 20, bottom: 60, left: 140 }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 26)
    .attr('text-anchor', 'middle')
    .attr('font-weight', 'bold')
    .attr('font-size', 14)
    .text('Most Influential Features (Association with Test Results)')

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  const clean = (data || []).filter(d => d.TestResults)

  const features = [
    { name: 'Medical Condition', key: d => d.MedicalCondition, type: 'cat' },
    { name: 'Admission Type', key: d => d.AdmissionType, type: 'cat' },
    { name: 'Insurance Provider', key: d => d.InsuranceProvider, type: 'cat' },
    { name: 'Gender', key: d => d.Gender, type: 'cat' },
    { name: 'Blood Type', key: d => d.BloodType, type: 'cat' },
    { name: 'Age', key: d => d.Age, type: 'num' }
  ]

  const scored = features.map(f => {
    let score = 0
    if (f.type === 'cat') score = cramersV(clean, f.key, d => d.TestResults)
    if (f.type === 'num') score = etaSquared(clean, f.key, d => d.TestResults) // [0..1]
    return { feature: f.name, score }
  })
  .sort((a, b) => b.score - a.score)

  if (!scored.length) {
    g.append('text').attr('x', innerW / 2).attr('y', innerH / 2).attr('text-anchor', 'middle')
      .attr('fill', '#666').text('No data')
    return
  }

  const x = d3.scaleLinear()
    .domain([0, d3.max(scored, d => d.score) || 1])
    .nice()
    .range([0, innerW])

  const y = d3.scaleBand()
    .domain(scored.map(d => d.feature))
    .range([0, innerH])
    .padding(0.2)

  g.append('g').call(d3.axisLeft(y))
  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(5))

  const tooltip = getTooltip()

  g.selectAll('rect')
    .data(scored)
    .enter()
    .append('rect')
    .attr('x', 0)
    .attr('y', d => y(d.feature))
    .attr('height', y.bandwidth())
    .attr('width', d => x(d.score))
    .attr('fill', '#4C78A8')
    .on('mouseover', (event, d) => {
      tooltip.style('opacity', 1).html(`
        <strong>${d.feature}</strong><br/>
        Association score: ${d.score.toFixed(3)}<br/>
        <span style="opacity:.8">(Cramér’s V for categorical, η² for Age)</span>
      `)
    })
    .on('mousemove', (event) => {
      tooltip.style('left', `${event.pageX + 10}px`).style('top', `${event.pageY - 28}px`)
    })
    .on('mouseout', () => tooltip.style('opacity', 0))
}

/* ---------- Stats helpers ---------- */

// Cramér’s V between categorical X and categorical Y
function cramersV(rows, xAccessor, yAccessor) {
  const table = new Map()
  const xVals = new Set()
  const yVals = new Set()

  for (const r of rows) {
    const x = normCat(xAccessor(r))
    const y = normCat(yAccessor(r))
    if (!x || !y) continue
    xVals.add(x); yVals.add(y)
    const key = `${x}|||${y}`
    table.set(key, (table.get(key) || 0) + 1)
  }

  const xs = Array.from(xVals)
  const ys = Array.from(yVals)
  const n = Array.from(table.values()).reduce((a, b) => a + b, 0)
  if (!n || xs.length < 2 || ys.length < 2) return 0

  const rowSum = new Map(xs.map(x => [x, 0]))
  const colSum = new Map(ys.map(y => [y, 0]))

  for (const x of xs) {
    for (const y of ys) {
      const c = table.get(`${x}|||${y}`) || 0
      rowSum.set(x, rowSum.get(x) + c)
      colSum.set(y, colSum.get(y) + c)
    }
  }

  let chi2 = 0
  for (const x of xs) {
    for (const y of ys) {
      const obs = table.get(`${x}|||${y}`) || 0
      const exp = (rowSum.get(x) * colSum.get(y)) / n
      if (exp > 0) chi2 += (obs - exp) * (obs - exp) / exp
    }
  }

  const k = Math.min(xs.length, ys.length)
  return Math.sqrt(chi2 / (n * (k - 1)))
}

// η² for numeric X vs categorical groups Y
function etaSquared(rows, xAccessor, groupAccessor) {
  const vals = rows
    .map(r => ({ x: +xAccessor(r), g: normCat(groupAccessor(r)) }))
    .filter(d => Number.isFinite(d.x) && d.g)

  if (vals.length < 3) return 0

  const grandMean = d3.mean(vals, d => d.x)
  const groups = d3.group(vals, d => d.g)

  let ssBetween = 0
  let ssTotal = 0

  for (const d of vals) {
    ssTotal += (d.x - grandMean) * (d.x - grandMean)
  }

  for (const [g, arr] of groups.entries()) {
    const m = d3.mean(arr, d => d.x)
    ssBetween += arr.length * (m - grandMean) * (m - grandMean)
  }

  if (ssTotal === 0) return 0
  return ssBetween / ssTotal
}

function normCat(v) {
  const s = String(v ?? '').trim()
  return s ? s : null
}
