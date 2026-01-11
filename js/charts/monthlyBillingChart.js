// import { state } from '../state.js'
// import { monthlyAverageBilling } from '../monthlyBilling.js'

// const svg = d3.select('#billing')
// const width = +svg.attr('width')
// const height = +svg.attr('height')

// const margin = { top: 50, right: 30, bottom: 60, left: 80 }
// const innerWidth = width - margin.left - margin.right
// const innerHeight = height - margin.top - margin.bottom

// // Title
// svg.append('text')
//   .attr('x', width / 2)
//   .attr('y', 30)
//   .attr('text-anchor', 'middle')
//   .attr('font-weight', 'bold')
//   .attr('font-size', 16)
//   .text('Monthly Average Billing')

// // Chart group
// const g = svg.append('g')
//   .attr('transform', `translate(${margin.left},${margin.top})`)

// // Scales
// const x = d3.scaleTime().range([0, innerWidth])
// const y = d3.scaleLinear().range([innerHeight, 0])

// // Axes groups
// const xAxisG = g.append('g')
//   .attr('transform', `translate(0,${innerHeight})`)
// const yAxisG = g.append('g')

// // Line generator
// const line = d3.line()
//   .x(d => x(d.date))
//   .y(d => y(d.avgBilling))

// // Tooltip div
// const tooltip = d3.select('body')
//   .append('div')
//   .style('position', 'absolute')
//   .style('pointer-events', 'none')
//   .style('background', 'rgba(255,255,255,0.9)')
//   .style('padding', '6px 10px')
//   .style('border', '1px solid #ccc')
//   .style('border-radius', '4px')
//   .style('font-size', '12px')
//   .style('display', 'none')

// export function renderMonthlyBilling(data = state.data) {
//   const series = monthlyAverageBilling(data)

//   x.domain(d3.extent(series, d => d.date))
//   y.domain([0, d3.max(series, d => d.avgBilling)]).nice()

//   xAxisG.call(d3.axisBottom(x).tickFormat(d3.timeFormat('%b %Y')))
//   yAxisG.call(d3.axisLeft(y))

//   // Line
//   const path = g.selectAll('.billing-line')
//     .data([series])

//   path.enter()
//     .append('path')
//     .attr('class', 'billing-line')
//     .merge(path)
//     .attr('fill', 'none')
//     .attr('stroke', '#4C78A8')
//     .attr('stroke-width', 2)
//     .attr('d', line)

//   path.exit().remove()

//   // Points for tooltips
//   const points = g.selectAll('.billing-point')
//     .data(series)

//   points.enter()
//     .append('circle')
//     .attr('class', 'billing-point')
//     .attr('r', 4)
//     .attr('fill', '#F58518')
//     .merge(points)
//     .attr('cx', d => x(d.date))
//     .attr('cy', d => y(d.avgBilling))
//     .on('mouseover', (event, d) => {
//       tooltip.style('display', 'block')
//         .html(`
//           <strong>${d3.timeFormat('%b %Y')(d.date)}</strong><br/>
//           Avg Billing: $${d.avgBilling.toFixed(2)}<br/>
//           Patients: ${d.count}
//         `)
//     })
//     .on('mousemove', event => {
//       tooltip.style('left', (event.pageX + 10) + 'px')
//         .style('top', (event.pageY - 25) + 'px')
//     })
//     .on('mouseout', () => tooltip.style('display', 'none'))

//   points.exit().remove()
// }


import { state } from '../state.js'
import { monthlyAverageBilling } from '../monthlyBilling.js'

export function renderMonthlyBilling(data = state.data) {
  const svg = d3.select('#billing')
  const container = svg.node().parentNode

  const width = container.clientWidth
  const height = container.clientHeight

  svg.selectAll('*').remove() // clear for resize-safe redraw

  svg
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')

  const margin = { top: 50, right: 30, bottom: 60, left: 80 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  // Title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 30)
    .attr('text-anchor', 'middle')
    .attr('font-weight', 'bold')
    .attr('font-size', 16)
    .text('Monthly Average Billing')

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  const series = monthlyAverageBilling(data)

  const x = d3.scaleTime()
    .domain(d3.extent(series, d => d.date))
    .range([0, innerWidth])

  const y = d3.scaleLinear()
    .domain([0, d3.max(series, d => d.avgBilling)])
    .nice()
    .range([innerHeight, 0])

  // Axes
  g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickFormat(d3.timeFormat('%b %Y')))

  g.append('g')
    .call(d3.axisLeft(y))

  // Line
  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.avgBilling))

  g.append('path')
    .datum(series)
    .attr('fill', 'none')
    .attr('stroke', '#4C78A8')
    .attr('stroke-width', 2)
    .attr('d', line)

  // Points + tooltip
  const tooltip = d3.select('body')
    .append('div')
    .style('position', 'absolute')
    .style('background', 'white')
    .style('border', '1px solid #ccc')
    .style('padding', '6px')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('display', 'none')

  g.selectAll('circle')
    .data(series)
    .enter()
    .append('circle')
    .attr('cx', d => x(d.date))
    .attr('cy', d => y(d.avgBilling))
    .attr('r', 4)
    .attr('fill', '#F58518')
    .on('mouseover', (event, d) => {
      tooltip
        .style('display', 'block')
        .html(`
          <strong>${d3.timeFormat('%b %Y')(d.date)}</strong><br/>
          Avg billing: $${d.avgBilling.toFixed(2)}<br/>
          Patients: ${d.count}
        `)
    })
    .on('mousemove', event => {
      tooltip
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 30}px`)
    })
    .on('mouseout', () => tooltip.style('display', 'none'))
}
