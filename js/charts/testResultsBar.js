import { state } from '../state.js'

let tooltip

export function renderTestResultsBar(data = state.data) {
  const svg = d3.select('#testResults')
  const container = svg.node().parentNode

  const width = container.clientWidth
  const height = container.clientHeight

  // Clear for resize-safe redraw
  svg.selectAll('*').remove()

  svg
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')

  const margin = { top: 50, right: 20, bottom: 60, left: 70 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  // ------------------
  // Title
  // ------------------
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 30)
    .attr('text-anchor', 'middle')
    .attr('font-weight', 'bold')
    .attr('font-size', 16)
    .text('Distribution of Test Results')

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  // ------------------
  // Tooltip (singleton)
  // ------------------
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

  // ------------------
  // Data aggregation
  // ------------------
  const counts = d3.rollups(
    data,
    v => v.length,
    d => d.TestResults
  ).map(([key, value]) => ({ key, value }))

  // ------------------
  // Scales
  // ------------------
  const x = d3.scaleBand()
    .domain(counts.map(d => d.key))
    .range([0, innerWidth])
    .padding(0.3)

  const y = d3.scaleLinear()
    .domain([0, d3.max(counts, d => d.value)])
    .nice()
    .range([innerHeight, 0])

  // ------------------
  // Axes
  // ------------------
  g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x))

  g.append('g')
    .call(d3.axisLeft(y))

  // ------------------
  // Bars
  // ------------------
  g.selectAll('.bar')
    .data(counts, d => d.key)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.key))
    .attr('width', x.bandwidth())
    .attr('y', innerHeight)
    .attr('height', 0)
    .attr('fill', '#4C78A8')

    // ------------------
    // Interactivity
    // ------------------
    .on('mouseover', function (event, d) {
      d3.select(this).attr('fill', '#F58518')

      tooltip
        .style('opacity', 1)
        .html(`
          <strong>${d.key}</strong><br/>
          Count: ${d.value}
        `)
    })
    .on('mousemove', event => {
      tooltip
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 28}px`)
    })
    .on('mouseout', function () {
      d3.select(this).attr('fill', '#4C78A8')
      tooltip.style('opacity', 0)
    })

    // ------------------
    // Animation
    // ------------------
    .transition()
    .duration(800)
    .attr('y', d => y(d.value))
    .attr('height', d => innerHeight - y(d.value))
}
