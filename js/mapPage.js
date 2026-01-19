// /js/mapPage.js
// import * as d3 from './vendor/d3.v7.min.js'

import { initHospitalMap } from './map/hospitalMap.js'
import { state } from './state.js'

/* -------------------------
   Boot
------------------------- */
window.addEventListener('DOMContentLoaded', () => {
  resetCharts()

  if (state.data && state.data.length) {
    initHospitalMap({ containerId: 'viewDiv', data: state.data })
  } else {
    document.addEventListener(
      'data-loaded',
      () => initHospitalMap({ containerId: 'viewDiv', data: state.data }),
      { once: true }
    )
  }

  window.addEventListener('resize', () => {
    renderAll(state.filteredData || [])
  })
})

/* -------------------------
   Events from hospitalMap.js
------------------------- */
document.addEventListener('hospital-selected', () => {
  renderAll(state.filteredData || [])
})

document.addEventListener('cluster-selected', () => {
  renderAll(state.filteredData || [])
})

/* -------------------------
   Render both charts
------------------------- */
function renderAll(rows) {
  const trendSvg =
    document.querySelector('#mapPatientsTrend') ? '#mapPatientsTrend'
      : (document.querySelector('#mapTrends') ? '#mapTrends' : null)

  if (trendSvg) {
    renderPatientsTrend(trendSvg, buildMonthlyPatients(rows), {
      title: 'Monthly Patient Count (Admission Date)'
    })
  }

  renderIllnessBar('#mapIllnessBar', buildIllnessCounts(rows), {
    title: 'Illness Counts'
  })
}

function resetCharts() {
  renderAll([])
}

/* -------------------------
   Data builders
------------------------- */
function buildMonthlyPatients(rows) {
  const valid = (rows || []).filter(d => d.AdmissionDate instanceof Date && !isNaN(d.AdmissionDate))

  const roll = d3.rollups(
    valid,
    v => v.length,
    d => d3.timeMonth(d.AdmissionDate)
  )

  return roll
    .map(([month, patients]) => ({ month, patients }))
    .sort((a, b) => a.month - b.month)
}

function buildIllnessCounts(rows) {
  const roll = d3.rollups(
    rows || [],
    v => v.length,
    d => d.MedicalCondition || 'Unknown'
  )

  return roll
    .map(([illness, count]) => ({ illness, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
}

/* -------------------------
   Chart 1: Monthly patient trend (line)
------------------------- */
function renderPatientsTrend(svgSelector, series, { title = '' } = {}) {
  const svg = d3.select(svgSelector)
  if (svg.empty()) return

  const container = svg.node().parentNode
  const width = container.clientWidth || 600
  const height = container.clientHeight || 300

  svg.selectAll('*').remove()
  svg.attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet')

  const margin = { top: 46, right: 20, bottom: 54, left: 60 }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 26)
    .attr('text-anchor', 'middle')
    .attr('font-weight', 'bold')
    .attr('font-size', 14)
    .text(title)

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  if (!series.length) {
    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', innerH / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#666')
      .text('Click on a hospital to populate')
    return
  }

  const x = d3.scaleTime()
    .domain(d3.extent(series, d => d.month))
    .range([0, innerW])

  const y = d3.scaleLinear()
    .domain([0, d3.max(series, d => d.patients)]).nice()
    .range([innerH, 0])

  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(Math.min(6, series.length)).tickFormat(d3.timeFormat('%b %Y')))
    .selectAll('text')
    .attr('transform', 'rotate(-20)')
    .style('text-anchor', 'end')

  g.append('g').call(d3.axisLeft(y).ticks(5))

  const line = d3.line()
    .x(d => x(d.month))
    .y(d => y(d.patients))

  g.append('path')
    .datum(series)
    .attr('fill', 'none')
    .attr('stroke', '#4C78A8')
    .attr('stroke-width', 2)
    .attr('d', line)

  g.selectAll('.pt')
    .data(series)
    .enter()
    .append('circle')
    .attr('r', 3)
    .attr('cx', d => x(d.month))
    .attr('cy', d => y(d.patients))
    .attr('fill', '#4C78A8')
}

/* -------------------------
   Chart 2: Illness bar chart
------------------------- */
let tooltip
function renderIllnessBar(svgSelector, data, { title = '' } = {}) {
  const svg = d3.select(svgSelector)
  if (svg.empty()) return

  const container = svg.node().parentNode
  const width = container.clientWidth || 600
  const height = container.clientHeight || 300

  svg.selectAll('*').remove()
  svg.attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet')

  const margin = { top: 46, right: 20, bottom: 70, left: 70 }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 26)
    .attr('text-anchor', 'middle')
    .attr('font-weight', 'bold')
    .attr('font-size', 14)
    .text(title)

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  if (!data.length) {
    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', innerH / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#666')
      .text('Click on a hospital to populate')
    return
  }

  if (!tooltip) {
    tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background', 'white')
      .style('border', '1px solid #ccc')
      .style('padding', '6px 10px')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
  }

  const x = d3.scaleBand()
    .domain(data.map(d => d.illness))
    .range([0, innerW])
    .padding(0.25)

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count)]).nice()
    .range([innerH, 0])

  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('transform', 'rotate(-30)')
    .style('text-anchor', 'end')

  g.append('g').call(d3.axisLeft(y).ticks(5))

  g.selectAll('.bar')
    .data(data, d => d.illness)
    .enter()
    .append('rect')
    .attr('x', d => x(d.illness))
    .attr('width', x.bandwidth())
    .attr('y', innerH)
    .attr('height', 0)
    .attr('fill', '#F58518')
    .on('mouseover', (event, d) => {
      tooltip.style('opacity', 1).html(`<strong>${d.illness}</strong><br/>Count: ${d.count}`)
    })
    .on('mousemove', (event) => {
      tooltip.style('left', `${event.pageX + 10}px`).style('top', `${event.pageY - 28}px`)
    })
    .on('mouseout', () => tooltip.style('opacity', 0))
    .transition()
    .duration(700)
    .attr('y', d => y(d.count))
    .attr('height', d => innerH - y(d.count))
}
