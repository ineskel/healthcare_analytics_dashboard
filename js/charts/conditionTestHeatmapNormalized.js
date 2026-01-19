// import * as d3 from '../vendor/d3.v7.min.js'

import { state } from '../state.js'
import { getTooltip } from './tooltip.js'

export function renderConditionTestHeatmapNormalized(data = state.filteredData || state.data) {
  const svg = d3.select('#conditionTestHeatmap')
  if (svg.empty()) return

  const container = svg.node().parentNode
  const width = container.clientWidth
  const height = container.clientHeight

  svg.selectAll('*').remove()
  svg.attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet')

  const margin = { top: 46, right: 20, bottom: 90, left: 90 }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 26)
    .attr('text-anchor', 'middle')
    .attr('font-weight', 'bold')
    .attr('font-size', 14)
    .text('Condition × Test Results (normalized within each condition)')

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  const rows = (data || []).filter(d => d.MedicalCondition && d.TestResults)
  const tests = ['Normal', 'Abnormal', 'Inconclusive']

  // Take top conditions for readability
  const condCounts = d3.rollups(rows, v => v.length, d => d.MedicalCondition)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(d => d[0])

  const filtered = rows.filter(d => condCounts.includes(d.MedicalCondition))

  // counts: condition -> test -> count
  const counts = new Map()
  for (const c of condCounts) counts.set(c, new Map(tests.map(t => [t, 0])))

  for (const r of filtered) {
    const c = r.MedicalCondition
    const t = r.TestResults
    if (!counts.has(c) || !counts.get(c).has(t)) continue
    counts.get(c).set(t, counts.get(c).get(t) + 1)
  }

  const cells = []
  for (const c of condCounts) {
    const total = tests.reduce((s, t) => s + (counts.get(c).get(t) || 0), 0)
    for (const t of tests) {
      const count = counts.get(c).get(t) || 0
      const pct = total ? count / total : 0
      cells.push({ condition: c, test: t, count, pct, total })
    }
  }

  const x = d3.scaleBand().domain(condCounts).range([0, innerW]).padding(0.05)
  const y = d3.scaleBand().domain(tests).range([0, innerH]).padding(0.05)
  const color = d3.scaleSequential(d3.interpolateBlues).domain([0, d3.max(cells, d => d.pct) || 1])

  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('transform', 'rotate(-35)')
    .style('text-anchor', 'end')

  g.append('g').call(d3.axisLeft(y))

  const tooltip = getTooltip()

  g.selectAll('rect')
    .data(cells)
    .enter()
    .append('rect')
    .attr('x', d => x(d.condition))
    .attr('y', d => y(d.test))
    .attr('width', x.bandwidth())
    .attr('height', y.bandwidth())
    .attr('fill', d => color(d.pct))
    .on('mouseover', (event, d) => {
      tooltip.style('opacity', 1).html(`
        <strong>${d.condition}</strong><br/>
        ${d.test}<br/>
        Count: ${d.count.toLocaleString()}<br/>
        Percent: ${(d.pct * 100).toFixed(1)}%
      `)
    })
    .on('mousemove', (event) => {
      tooltip.style('left', `${event.pageX + 10}px`).style('top', `${event.pageY - 28}px`)
    })
    .on('mouseout', () => tooltip.style('opacity', 0))
}
