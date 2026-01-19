// import * as d3 from '../vendor/d3.v7.min.js'

import { state } from '../state.js'
import { getTooltip } from './tooltip.js'

export function renderAdmissionTypeStacked(data = state.filteredData || state.data) {
  const svg = d3.select('#admissionTypeStacked')
  if (svg.empty()) return

  const container = svg.node().parentNode
  const width = container.clientWidth
  const height = container.clientHeight

  svg.selectAll('*').remove()
  svg.attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet')

  const margin = { top: 46, right: 20, bottom: 60, left: 60 }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 26)
    .attr('text-anchor', 'middle')
    .attr('font-weight', 'bold')
    .attr('font-size', 14)
    .text('Admission Type → Test Results (100% stacked)')

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  const rows = (data || []).filter(d => d.AdmissionType && d.TestResults)
  const types = Array.from(new Set(rows.map(d => d.AdmissionType))).sort()
  const classes = ['Normal', 'Abnormal', 'Inconclusive']

  const counts = new Map()
  for (const t of types) {
    counts.set(t, new Map(classes.map(c => [c, 0])))
  }
  for (const r of rows) {
    const t = r.AdmissionType
    const c = r.TestResults
    if (!counts.has(t) || !counts.get(t).has(c)) continue
    counts.get(t).set(c, counts.get(t).get(c) + 1)
  }

  const series = types.map(t => {
    const total = classes.reduce((s, c) => s + (counts.get(t).get(c) || 0), 0)
    const obj = { type: t, total }
    for (const c of classes) obj[c] = total ? (counts.get(t).get(c) || 0) / total : 0
    return obj
  })

  const x = d3.scaleBand().domain(types).range([0, innerW]).padding(0.25)
  const y = d3.scaleLinear().domain([0, 1]).range([innerH, 0])

  g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x))
  g.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')))

  const stack = d3.stack().keys(classes)
  const stacked = stack(series)

  const tooltip = getTooltip()

  g.selectAll('.layer')
    .data(stacked)
    .enter()
    .append('g')
    .attr('class', 'layer')
    .attr('fill', (d, i) => ['#4C78A8', '#F58518', '#54A24B'][i])
    .selectAll('rect')
    .data(d => d.map(v => ({ key: d.key, v })))
    .enter()
    .append('rect')
    .attr('x', d => x(d.v.data.type))
    .attr('width', x.bandwidth())
    .attr('y', d => y(d.v[1]))
    .attr('height', d => y(d.v[0]) - y(d.v[1]))
    .on('mouseover', (event, d) => {
      const pct = (d.v.data[d.key] || 0) * 100
      tooltip.style('opacity', 1).html(`
        <strong>${d.v.data.type}</strong><br/>
        ${d.key}: ${pct.toFixed(1)}%<br/>
        Total: ${d.v.data.total.toLocaleString()}
      `)
    })
    .on('mousemove', (event) => {
      tooltip.style('left', `${event.pageX + 10}px`).style('top', `${event.pageY - 28}px`)
    })
    .on('mouseout', () => tooltip.style('opacity', 0))

  // legend
//   const legend = svg.append('g').attr('transform', `translate(${margin.left},${margin.top - 12})`)
//   classes.forEach((c, i) => {
//     const x0 = i * 120
//     legend.append('rect').attr('x', x0).attr('y', -8).attr('width', 10).attr('height', 10)
//       .attr('fill', ['#4C78A8', '#F58518', '#54A24B'][i])
//     legend.append('text').attr('x', x0 + 14).attr('y', 1).attr('font-size', 12).text(c)
//   })
// legend (move to bottom, under x-axis)
const legendY = height - 18 // safe bottom padding
const legend = svg.append('g')
  .attr('transform', `translate(${margin.left}, ${legendY})`)

classes.forEach((c, i) => {
  const x0 = i * 140
  legend.append('rect')
    .attr('x', x0)
    .attr('y', -10)
    .attr('width', 10)
    .attr('height', 10)
    .attr('fill', ['#4C78A8', '#F58518', '#54A24B'][i])

  legend.append('text')
    .attr('x', x0 + 14)
    .attr('y', 0)
    .attr('font-size', 12)
    .text(c)
})

}
