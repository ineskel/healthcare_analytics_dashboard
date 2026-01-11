import { state } from '../state.js'

export function renderAgeBandAnalysis(data = state.filteredData || state.data) {
  const svg = d3.select('#ageAnalysis')
  const container = svg.node().parentNode

  const width = container.clientWidth
  const height = container.clientHeight

  const margin = { top: 50, right: 80, bottom: 50, left: 70 }
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
    .attr('y', 30)
    .attr('text-anchor', 'middle')
    .attr('font-weight', 'bold')
    .attr('font-size', 16)
    .text('Age Band Analysis: Admissions & Revenue')

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  // ------------------
  // Aggregate data
  // ------------------
  const stats = d3.rollups(
    data,
    v => ({
      admissions: v.length,
      revenue: d3.sum(v, d => d.BillingAmount)
    }),
    d => d.AgeGroup || 'Unknown'
  ).map(([ageGroup, values]) => ({
    ageGroup,
    ...values
  }))

  // Sort age groups logically
  const order = ['0–18', '19–40', '41–65', '65+', 'Unknown']
  stats.sort((a, b) =>
    order.indexOf(a.ageGroup) - order.indexOf(b.ageGroup)
  )

  // ------------------
  // Scales
  // ------------------
  const x = d3.scaleBand()
    .domain(stats.map(d => d.ageGroup))
    .range([0, innerWidth])
    .padding(0.4)

  const yLeft = d3.scaleLinear()
    .domain([0, d3.max(stats, d => d.admissions)])
    .nice()
    .range([innerHeight, 0])

  const yRight = d3.scaleLinear()
    .domain([0, d3.max(stats, d => d.revenue)])
    .nice()
    .range([innerHeight, 0])

  // ------------------
  // Axes
  // ------------------
  g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x))

  g.append('g')
    .call(d3.axisLeft(yLeft))

  g.append('g')
    .attr('transform', `translate(${innerWidth},0)`)
    .call(d3.axisRight(yRight).tickFormat(d3.format('~s')))

  // Axis labels
  g.append('text')
    .attr('x', -innerHeight / 2)
    .attr('y', -50)
    .attr('transform', 'rotate(-90)')
    .attr('text-anchor', 'middle')
    .text('Total Admissions')

  g.append('text')
    .attr('x', innerWidth + 60)
    .attr('y', innerHeight / 2)
    .attr('transform', 'rotate(-90)')
    .attr('text-anchor', 'middle')
    .text('Total Revenue')

  // ------------------
  // Bars (Admissions)
  // ------------------
  g.selectAll('.admission-bar')
    .data(stats)
    .enter()
    .append('rect')
    .attr('class', 'admission-bar')
    .attr('x', d => x(d.ageGroup))
    .attr('y', innerHeight)
    .attr('width', x.bandwidth())
    .attr('height', 0)
    .attr('fill', '#4C78A8')
    .transition()
    .duration(800)
    .attr('y', d => yLeft(d.admissions))
    .attr('height', d => innerHeight - yLeft(d.admissions))

  // ------------------
  // Line (Revenue)
  // ------------------
  const line = d3.line()
    .x(d => x(d.ageGroup) + x.bandwidth() / 2)
    .y(d => yRight(d.revenue))

  g.append('path')
    .datum(stats)
    .attr('fill', 'none')
    .attr('stroke', '#F58518')
    .attr('stroke-width', 2)
    .attr('d', line)

  g.selectAll('.revenue-dot')
    .data(stats)
    .enter()
    .append('circle')
    .attr('cx', d => x(d.ageGroup) + x.bandwidth() / 2)
    .attr('cy', d => yRight(d.revenue))
    .attr('r', 4)
    .attr('fill', '#F58518')

  // ------------------
  // Legend
  // ------------------
  const legend = svg.append('g')
    .attr('transform', `translate(${width - 180}, 40)`)

  legend.append('rect')
    .attr('width', 12)
    .attr('height', 12)
    .attr('fill', '#4C78A8')

  legend.append('text')
    .attr('x', 18)
    .attr('y', 10)
    .text('Admissions')

  legend.append('circle')
    .attr('cx', 6)
    .attr('cy', 30)
    .attr('r', 5)
    .attr('fill', '#F58518')

  legend.append('text')
    .attr('x', 18)
    .attr('y', 34)
    .text('Revenue')
}
