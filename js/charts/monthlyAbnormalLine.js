// import * as d3 from '../vendor/d3.v7.min.js'

import { state } from '../state.js'
import { getTooltip } from './tooltip.js'

export function renderMonthlyAbnormalLine(data = state.filteredData || state.data) {
  const svg = d3.select('#monthlyAbnormal')
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
    .text('Monthly Abnormal Rate (Discharge Date)')

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  const rows = (data || []).filter(d =>
    d.DischargeDate instanceof Date &&
    !isNaN(d.DischargeDate) &&
    d.TestResults
  )

  const roll = d3.rollups(
    rows,
    v => ({
      total: v.length,
      abnormal: v.filter(d => d.TestResults === 'Abnormal').length
    }),
    d => d3.timeMonth(d.DischargeDate)
  )
    .map(([month, o]) => ({
      month,
      total: o.total,
      abnormal: o.abnormal,
      rate: o.total ? o.abnormal / o.total : 0
    }))
    .sort((a, b) => a.month - b.month)

  if (!roll.length) {
    g.append('text').attr('x', innerW / 2).attr('y', innerH / 2).attr('text-anchor', 'middle')
      .attr('fill', '#666').text('No time-series data')
    return
  }

  const x = d3.scaleTime()
    .domain(d3.extent(roll, d => d.month))
    .range([0, innerW])

  const y = d3.scaleLinear()
    .domain([0, d3.max(roll, d => d.rate) || 1])
    .nice()
    .range([innerH, 0])

  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(Math.min(6, roll.length)).tickFormat(d3.timeFormat('%b %Y')))
    .selectAll('text')
    .attr('transform', 'rotate(-20)')
    .style('text-anchor', 'end')

  g.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')))

  const line = d3.line()
    .x(d => x(d.month))
    .y(d => y(d.rate))

  g.append('path')
    .datum(roll)
    .attr('fill', 'none')
    .attr('stroke', '#F58518')
    .attr('stroke-width', 2)
    .attr('d', line)

  const tooltip = getTooltip()

  g.selectAll('circle')
    .data(roll)
    .enter()
    .append('circle')
    .attr('cx', d => x(d.month))
    .attr('cy', d => y(d.rate))
    .attr('r', 3.5)
    .attr('fill', '#F58518')
    .on('mouseover', (event, d) => {
      tooltip.style('opacity', 1).html(`
        <strong>${d3.timeFormat('%B %Y')(d.month)}</strong><br/>
        Abnormal: ${d.abnormal.toLocaleString()}<br/>
        Total: ${d.total.toLocaleString()}<br/>
        Rate: ${(d.rate * 100).toFixed(1)}%
      `)
    })
    .on('mousemove', (event) => {
      tooltip.style('left', `${event.pageX + 10}px`).style('top', `${event.pageY - 28}px`)
    })
    .on('mouseout', () => tooltip.style('opacity', 0))
}
