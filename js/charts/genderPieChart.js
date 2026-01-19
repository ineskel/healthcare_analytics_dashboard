import { state } from '../state.js'

let tooltip // singleton tooltip for this module

export function renderGenderPie(data = state.filteredData || state.data) {
  const svg = d3.select('#genderPie')
  if (svg.empty()) return

  const container = svg.node().parentNode
  const width = container.clientWidth || 300
  const height = container.clientHeight || 300
  const radius = Math.min(width, height) / 2 - 20

  svg.selectAll('*').remove()

  svg
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')

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
  // Title
  // ------------------
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .attr('font-weight', 'bold')
    .text('Patient Gender Distribution')

  const g = svg.append('g')
    .attr('transform', `translate(${width / 2},${height / 2 + 10})`)

  // ------------------
  // Data aggregation
  // ------------------
  const counts = d3.rollups(
    state.data || [],                 // IMPORTANT: aggregate from full data so slice sizes don’t "jump" when filtered
    v => v.length,
    d => d.Gender || 'Unknown'
  ).map(([key, value]) => ({ key, value }))

  const total = d3.sum(counts, d => d.value)

  // ------------------
  // Scales
  // ------------------
  const color = d3.scaleOrdinal()
    .domain(counts.map(d => d.key))
    .range(d3.schemeTableau10)

  const pie = d3.pie().value(d => d.value)
  const arc = d3.arc().innerRadius(0).outerRadius(radius)
  const arcHover = d3.arc().innerRadius(0).outerRadius(radius + 6)

  const selectedGender = state.filters?.gender || null

  // ------------------
  // Draw slices
  // ------------------
  const slices = g.selectAll('path')
    .data(pie(counts), d => d.data.key)
    .enter()
    .append('path')
    .attr('d', d => (selectedGender && d.data.key === selectedGender ? arcHover(d) : arc(d)))
    .attr('fill', d => color(d.data.key))
    .attr('stroke', 'white')
    .style('stroke-width', '2px')
    .style('cursor', 'pointer')
    .style('opacity', d => {
      if (!selectedGender) return 1
      return d.data.key === selectedGender ? 1 : 0.35
    })

    // ------------------
    // Hover tooltip
    // ------------------
    .on('mouseover', function (event, d) {
      d3.select(this).attr('d', arcHover(d))

      const pct = total ? (d.data.value / total) * 100 : 0
      tooltip
        .style('opacity', 1)
        .html(`
          <strong>${d.data.key}</strong><br/>
          Count: ${d.data.value.toLocaleString()}<br/>
          ${pct.toFixed(1)}%
        `)
    })
    .on('mousemove', (event) => {
      tooltip
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 28}px`)
    })
    .on('mouseout', function (event, d) {
      // keep hover expansion if it’s selected; otherwise shrink back
      const keepExpanded = state.filters?.gender && d.data.key === state.filters.gender
      d3.select(this).attr('d', keepExpanded ? arcHover(d) : arc(d))
      tooltip.style('opacity', 0)
    })

    // ------------------
    // Click-to-filter
    // ------------------
    .on('click', function (event, d) {
      const clicked = d.data.key

      // Toggle behavior: click selected slice again to clear filter
      if (state.filters.gender === clicked) {
        state.filters.gender = null
      } else {
        state.filters.gender = clicked
      }

      // Notify the app to re-apply filters + re-render page-aware charts
      document.dispatchEvent(new CustomEvent('filters-changed'))

      // Optional immediate visual update (without waiting for full re-render)
      const newSelected = state.filters.gender || null
      slices
        .style('opacity', dd => !newSelected ? 1 : (dd.data.key === newSelected ? 1 : 0.35))
        .attr('d', dd => (newSelected && dd.data.key === newSelected ? arcHover(dd) : arc(dd)))
    })
}
