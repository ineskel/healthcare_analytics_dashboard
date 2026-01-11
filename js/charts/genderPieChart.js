import { state } from '../state.js'

let tooltip

export function renderGenderPie(data = state.filteredData || state.data) {
  const svg = d3.select('#demographics')
  const container = svg.node().parentNode

  const width = container.clientWidth
  const height = container.clientHeight
  const radius = Math.min(width, height) / 2 - 40

  // Clear previous render
  svg.selectAll('*').remove()

  svg
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')

  // ------------------
  // Title
  // ------------------
  svg
    .append('text')
    .attr('x', width / 2)
    .attr('y', 30)
    .attr('text-anchor', 'middle')
    .attr('font-weight', 'bold')
    .attr('font-size', 16)
    .text('Patient Sex Distribution')

  const g = svg
    .append('g')
    .attr(
      'transform',
      `translate(${width / 2}, ${height / 2 + 10})`
    )

  // ------------------
  // Tooltip (singleton)
  // ------------------
  if (!tooltip) {
    tooltip = d3
      .select('body')
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
  // Aggregate data
  // ------------------
  const counts = d3
    .rollups(
      data,
      v => v.length,
      d => d.Gender || 'Unknown'
    )
    .map(([key, value]) => ({ key, value }))

  const total = d3.sum(counts, d => d.value)

  // ------------------
  // Color scale
  // ------------------
  const color = d3
    .scaleOrdinal()
    .domain(counts.map(d => d.key))
    .range(d3.schemeTableau10)

  // ------------------
  // Pie & arc generators
  // ------------------
  const pie = d3
    .pie()
    .value(d => d.value)
    .sort(null)

  const arc = d3
    .arc()
    .innerRadius(0)
    .outerRadius(radius)

  // ------------------
  // Draw slices
  // ------------------
  g.selectAll('path')
    .data(pie(counts))
    .enter()
    .append('path')
    .attr('fill', d => color(d.data.key))
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .attr('opacity', d =>
      state.filters.gender
        ? d.data.key === state.filters.gender
          ? 1
          : 0.3
        : 1
    )
    .on('mouseover', (event, d) => {
      tooltip
        .style('opacity', 1)
        .html(`
          <strong>${d.data.key}</strong><br/>
          Count: ${d.data.value}<br/>
          ${(d.data.value / total * 100).toFixed(1)}%
        `)
    })
    .on('mousemove', event => {
      tooltip
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 28}px`)
    })
    .on('mouseout', () => {
      tooltip.style('opacity', 0)
    })
    .on('click', (event, d) => {
      const clickedGender = d.data.key

      // Toggle filter
      state.filters.gender =
        state.filters.gender === clickedGender
          ? null
          : clickedGender

      // Notify dashboard
      document.dispatchEvent(new Event('filters-changed'))
    })
    .transition()
    .duration(800)
    .attrTween('d', d => {
      const i = d3.interpolate(
        { startAngle: 0, endAngle: 0 },
        d
      )
      return t => arc(i(t))
    })

  // ------------------
  // Legend
  // ------------------
  const legend = svg
    .append('g')
    .attr(
      'transform',
      `translate(20, ${height - counts.length * 20 - 20})`
    )

  const legendItem = legend
    .selectAll('.legend-item')
    .data(counts)
    .enter()
    .append('g')
    .attr('class', 'legend-item')
    .attr('transform', (d, i) => `translate(0, ${i * 20})`)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      state.filters.gender =
        state.filters.gender === d.key ? null : d.key
      document.dispatchEvent(new Event('filters-changed'))
    })

  legendItem
    .append('rect')
    .attr('width', 12)
    .attr('height', 12)
    .attr('fill', d => color(d.key))
    .attr('opacity', d =>
      state.filters.gender
        ? d.key === state.filters.gender
          ? 1
          : 0.3
        : 1
    )

  legendItem
    .append('text')
    .attr('x', 18)
    .attr('y', 10)
    .text(d => d.key)
    .style('font-size', '12px')
}
