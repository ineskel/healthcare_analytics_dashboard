// import * as d3 from '../vendor/d3.v7.min.js'

import { state } from '../state.js'

export function renderTestResultsVsConditions(data = state.data) {
  const svg = d3.select('#conditionMatrix')
  if (svg.empty()) return
  const container = svg.node().parentNode

  // Make the heatmap bigger by using more width/height
  const width = container.clientWidth || 800
  const height = container.clientHeight || 600

  const margin = { top: 80, right: 20, bottom: 150, left: 150 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  svg.selectAll('*').remove()
  svg
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')

  // ------------------
  // Title
  // ------------------
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 40)
    .attr('text-anchor', 'middle')
    .attr('font-weight', 'bold')
    .attr('font-size', 18)
    .text('Medical Conditions vs Test Results')

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  // ------------------
  // Aggregate counts
  // ------------------
  const counts = d3.rollups(
    data,
    v => v.length,
    d => d.MedicalCondition || 'Unknown',
    d => d.TestResults || 'Unknown'
  )

  const flatData = []
  counts.forEach(([condition, results]) => {
    results.forEach(([testResult, count]) => {
      flatData.push({ condition, testResult, count })
    })
  })

  // ------------------
  // Scales
  // ------------------
  const conditions = Array.from(new Set(flatData.map(d => d.condition)))
  const testResults = Array.from(new Set(flatData.map(d => d.testResult)))

  const x = d3.scaleBand()
    .domain(conditions)
    .range([0, innerWidth])
    .padding(0.02) // reduce padding to make cells bigger

  const y = d3.scaleBand()
    .domain(testResults)
    .range([0, innerHeight])
    .padding(0.02)

  // ------------------
  // Color scale: one color per condition
  // ------------------
  const color = d3.scaleOrdinal()
    .domain(conditions)
    .range(d3.schemeCategory10.concat(d3.schemeSet3)) // more distinct colors

  // ------------------
  // Draw rectangles
  // ------------------
  g.selectAll('rect')
    .data(flatData)
    .enter()
    .append('rect')
    .attr('x', d => x(d.condition))
    .attr('y', d => y(d.testResult))
    .attr('width', x.bandwidth())
    .attr('height', y.bandwidth())
    .attr('fill', d => color(d.condition))
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .on('mouseover', (event, d) => {
      d3.select(event.currentTarget).attr('stroke', 'black')
      tooltip
        .style('opacity', 1)
        .html(`
          <strong>Condition:</strong> ${d.condition}<br/>
          <strong>Test Result:</strong> ${d.testResult}<br/>
          <strong>Count:</strong> ${d.count}
        `)
    })
    .on('mousemove', (event) => {
      tooltip
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 28}px`)
    })
    .on('mouseout', (event) => {
      d3.select(event.currentTarget).attr('stroke', 'white')
      tooltip.style('opacity', 0)
    })

// ------------------
// Axes
// ------------------
const xAxis = d3.axisBottom(x)
const yAxis = d3.axisLeft(y)

// X-axis at the bottom
g.append('g')
  .attr('transform', `translate(0, ${innerHeight})`) // bottom of chart
  .call(xAxis)
  .selectAll('text')
  .attr('transform', 'rotate(-45)')
  .attr('text-anchor', 'end')
  .attr('font-size', 12)

// Y-axis on the left
g.append('g')
  .call(yAxis)
  .selectAll('text')
  .attr('font-size', 12)


  // ------------------
  // Tooltip singleton
  // ------------------
  if (!window.conditionTooltip) {
    window.conditionTooltip = d3.select('body')
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

  const tooltip = window.conditionTooltip
}
